import base64
import json
import os
from datetime import datetime, timezone
from unittest.mock import Mock

os.environ['DATABASE_URL'] = 'sqlite://'
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import push_reminders as push

TOKEN = 'a' * 64
AUTH = {'Authorization': f'Bearer {TOKEN}'}
CRON = {'Authorization': 'Bearer test-cron-secret'}
SUBSCRIPTION = {
    'endpoint': 'https://fcm.googleapis.com/fcm/send/test-device',
    'keys': {
        'p256dh': base64.urlsafe_b64encode(b'\x04' + b'a' * 64).decode().rstrip('='),
        'auth': base64.urlsafe_b64encode(b'a' * 16).decode().rstrip('='),
    },
}
LESSON = {'id': 'salsa', 'name': 'Salsa', 'start': '2026-09-21T17:00:00Z', 'room': 'Sala 1'}

@pytest.fixture
def setup(monkeypatch):
    for key, value in {'PUSH_DEMO_ENABLED': 'true', 'VAPID_PUBLIC_KEY': 'test-public', 'VAPID_PRIVATE_KEY': 'test-private', 'VAPID_SUBJECT': 'mailto:test@example.com', 'CRON_SECRET': 'test-cron-secret'}.items():
        monkeypatch.setenv(key, value)
    class FrozenDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2026, 9, 21, 7, tzinfo=timezone.utc)
    monkeypatch.setattr(push, 'datetime', FrozenDateTime)
    sender = Mock()
    monkeypatch.setattr(push, 'webpush', sender)
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    push.PushDevice.__table__.create(engine)
    session = sessionmaker(bind=engine)
    app = FastAPI()
    app.include_router(push.router)
    def db_override():
        with session() as db:
            yield db
    app.dependency_overrides[push.get_db] = db_override
    with TestClient(app) as client:
        yield client, session, sender
    engine.dispose()


def register(client, lessons=None):
    return client.put('/api/push/subscription', headers=AUTH, json={'subscription': SUBSCRIPTION, 'lessons': [LESSON] if lessons is None else lessons})


def test_setup_is_explicit_and_private_key_never_returned(setup, monkeypatch):
    client, _, _ = setup
    assert client.get('/api/push/config').json() == {'enabled': True, 'publicKey': 'test-public'}
    monkeypatch.delenv('CRON_SECRET')
    assert client.get('/api/push/config').json() == {'enabled': False, 'publicKey': ''}
    assert register(client).status_code == 503


def test_subscription_and_schedule_require_device_ownership(setup):
    client, _, _ = setup
    assert client.put('/api/push/subscription', json={'subscription': SUBSCRIPTION, 'lessons': []}).status_code == 401
    assert register(client).status_code == 200
    other = {'Authorization': 'Bearer ' + 'b' * 64}
    assert client.put('/api/push/subscription', headers=other, json={'subscription': SUBSCRIPTION, 'lessons': []}).status_code == 409
    assert client.put('/api/push/schedule', headers=other, json={'lessons': []}).status_code == 404


def test_rejects_internal_urls_and_malformed_subscription_keys(setup):
    client, _, _ = setup
    bad = {**SUBSCRIPTION, 'endpoint': 'http://127.0.0.1:8000/private'}
    assert client.put('/api/push/subscription', headers=AUTH, json={'subscription': bad, 'lessons': []}).status_code == 422
    bad = {**SUBSCRIPTION, 'keys': {'p256dh': 'abc', 'auth': 'abc'}}
    assert client.put('/api/push/subscription', headers=AUTH, json={'subscription': bad, 'lessons': []}).status_code == 422


def test_dispatch_authorization_idempotency_and_click_route(setup):
    client, _, sender = setup
    assert register(client).status_code == 200
    assert client.get('/api/push/dispatch').status_code == 401
    assert client.get('/api/push/dispatch', headers=CRON).json()['sent'] == 1
    payload = json.loads(sender.call_args.kwargs['data'])
    assert 'Salsa a las 19:00' in payload['notification']['body']
    assert payload['notification']['data']['onActionClick']['default']['url'] == '/campus/gestion'
    assert client.get('/api/push/dispatch', headers=CRON).json()['sent'] == 0
    sender.assert_called_once()


def test_removed_absences_do_not_get_notified(setup):
    client, _, sender = setup
    register(client)
    assert client.put('/api/push/schedule', headers=AUTH, json={'lessons': []}).status_code == 200
    assert client.get('/api/push/dispatch', headers=CRON).json()['sent'] == 0
    sender.assert_not_called()


def test_unsubscribe_removes_device_and_future_deliveries(setup):
    client, session, sender = setup
    register(client)
    assert client.delete('/api/push/subscription', headers=AUTH).status_code == 200
    with session() as db:
        assert db.query(push.PushDevice).count() == 0
    client.get('/api/push/dispatch', headers=CRON)
    sender.assert_not_called()


def test_expired_push_subscription_is_cleaned_up(setup):
    client, session, sender = setup
    register(client)
    sender.side_effect = push.WebPushException('Expired', response=Mock(status_code=410))
    assert client.get('/api/push/dispatch', headers=CRON).json()['expired'] == 1
    with session() as db:
        assert db.query(push.PushDevice).count() == 0


def test_transient_failure_can_be_retried(setup):
    client, _, sender = setup
    register(client)
    sender.side_effect = push.WebPushException('Unavailable', response=Mock(status_code=503))
    assert client.get('/api/push/dispatch', headers=CRON).json()['failed'] == 1
    sender.side_effect = None
    assert client.get('/api/push/dispatch', headers=CRON).json()['sent'] == 1


def test_only_today_future_classes_are_sent_using_madrid_date():
    now = datetime(2026, 9, 21, 21, tzinfo=timezone.utc)
    lessons = [
        {**LESSON, 'start': '2026-09-21T21:30:00Z'},
        {**LESSON, 'start': '2026-09-21T22:30:00Z'},  # Tomorrow in Madrid.
        {**LESSON, 'start': '2026-09-21T17:00:00Z'},  # Already started.
    ]
    assert len(push.todays_lessons(lessons, now)) == 1
