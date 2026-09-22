"""Opt-in Web Push for the local classroom prototype.

Device capability tokens authorize updates; they are not real student authentication.
Do not reuse this data model for multi-user production scheduling without real accounts.
"""
import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timezone
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import AwareDatetime, BaseModel, Field, field_validator
from sqlalchemy import Column, DateTime, JSON, String, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from pywebpush import WebPushException, webpush
from database import Base, get_db

router = APIRouter(prefix="/api/push", tags=["Push reminders"])
MADRID = ZoneInfo("Europe/Madrid")


class PushDevice(Base):
    __tablename__ = "push_devices"
    token_hash = Column(String(64), primary_key=True)
    endpoint_hash = Column(String(64), unique=True, nullable=False)
    subscription = Column(JSON, nullable=False)
    lessons = Column(JSON, nullable=False, default=list)
    last_sent_day = Column(String(10), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False)


def configured():
    return os.getenv("PUSH_DEMO_ENABLED") == "true" and all(os.getenv(k) for k in (
        "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "CRON_SECRET"))


def require_setup():
    if not configured():
        raise HTTPException(503, "Las notificaciones todavía no están configuradas.")


def device_token(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Falta la autorización del dispositivo.")
    token = authorization[7:]
    if len(token) < 40 or len(token) > 128 or not all(c.isalnum() or c in "-_" for c in token):
        raise HTTPException(401, "Autorización no válida.")
    return hashlib.sha256(token.encode()).hexdigest()


class PushKeys(BaseModel):
    p256dh: str = Field(max_length=150)
    auth: str = Field(max_length=100)

    @field_validator("p256dh", "auth")
    @classmethod
    def valid_key(cls, value, info):
        try:
            decoded = base64.b64decode(value + "=" * (-len(value) % 4), altchars=b"-_", validate=True)
        except (ValueError, TypeError):
            raise ValueError("Invalid push key")
        if len(decoded) != (65 if info.field_name == "p256dh" else 16):
            raise ValueError("Invalid push key length")
        return value


class BrowserSubscription(BaseModel):
    endpoint: str = Field(max_length=2048)
    keys: PushKeys

    @field_validator("endpoint")
    @classmethod
    def known_push_provider(cls, value):
        url = urlsplit(value)
        host = (url.hostname or "").lower()
        allowed = host == "fcm.googleapis.com" or host == "updates.push.services.mozilla.com" or host.endswith(".push.services.mozilla.com") or host == "web.push.apple.com" or host.endswith(".notify.windows.com")
        if url.scheme != "https" or not allowed or url.username or url.password or url.port not in (None, 443) or url.fragment:
            raise ValueError("Unsupported push provider")
        return value


class ReminderLesson(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    start: AwareDatetime
    room: str = Field(max_length=60)


class ReminderSchedule(BaseModel):
    lessons: list[ReminderLesson] = Field(max_length=200)


class Registration(ReminderSchedule):
    subscription: BrowserSubscription


@router.get("/config")
def push_config():
    ready = bool(configured())
    return {"enabled": ready, "publicKey": os.getenv("VAPID_PUBLIC_KEY", "") if ready else ""}


@router.put("/subscription", dependencies=[Depends(require_setup)])
def register_device(data: Registration, token_hash: str = Depends(device_token), db: Session = Depends(get_db)):
    endpoint_hash = hashlib.sha256(data.subscription.endpoint.encode()).hexdigest()
    existing = db.query(PushDevice).filter(PushDevice.endpoint_hash == endpoint_hash).first()
    if existing and existing.token_hash != token_hash:
        raise HTTPException(409, "Esta suscripción pertenece a otra autorización del dispositivo.")
    device = db.get(PushDevice, token_hash)
    if device is None:
        device = PushDevice(token_hash=token_hash)
        db.add(device)
    device.endpoint_hash = endpoint_hash
    device.subscription = data.subscription.model_dump()
    device.lessons = [lesson.model_dump(mode="json") for lesson in data.lessons]
    device.updated_at = datetime.now(timezone.utc)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "La suscripción ya está registrada.")
    return {"registered": True}


@router.put("/schedule", dependencies=[Depends(require_setup)])
def update_schedule(data: ReminderSchedule, token_hash: str = Depends(device_token), db: Session = Depends(get_db)):
    device = db.get(PushDevice, token_hash)
    if device is None:
        raise HTTPException(404, "Activa de nuevo las notificaciones en este dispositivo.")
    # Replacing the entire snapshot removes cancelled classes and notified absences.
    device.lessons = [lesson.model_dump(mode="json") for lesson in data.lessons]
    device.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"synced": True}


@router.delete("/subscription")
def unregister_device(token_hash: str = Depends(device_token), db: Session = Depends(get_db)):
    db.query(PushDevice).filter(PushDevice.token_hash == token_hash).delete()
    db.commit()
    return {"removed": True}


def todays_lessons(lessons, now):
    today = now.astimezone(MADRID).date()
    result = []
    for lesson in lessons:
        start = datetime.fromisoformat(lesson["start"].replace("Z", "+00:00"))
        if start.astimezone(MADRID).date() == today and start > now:
            result.append((start, lesson))
    return sorted(result, key=lambda entry: entry[0])


def notification_payload(lessons, day):
    body = " · ".join(f"{lesson['name']} a las {start.astimezone(MADRID):%H:%M} ({lesson['room']})" for start, lesson in lessons)
    return {"notification": {
        "title": "Hoy tienes clase en Aretè", "body": body[:600],
        "icon": "/icons/icon-192x192.png", "tag": f"arete-classes-{day}",
        "data": {"onActionClick": {"default": {"operation": "navigateLastFocusedOrOpen", "url": "/campus/gestion"}}},
    }}


@router.get("/dispatch")
def dispatch(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    secret = os.getenv("CRON_SECRET")
    if not secret or not hmac.compare_digest(authorization or "", f"Bearer {secret}"):
        raise HTTPException(401, "Unauthorized")
    require_setup()
    now = datetime.now(timezone.utc)
    day = now.astimezone(MADRID).date().isoformat()
    sent = failed = expired = 0
    devices = db.query(PushDevice).filter(or_(PushDevice.last_sent_day.is_(None), PushDevice.last_sent_day != day)).all()
    for device in devices:
        lessons = todays_lessons(device.lessons, now)
        if not lessons:
            continue
        # Atomic claim prevents two overlapping cron invocations sending the same reminder.
        claimed = db.query(PushDevice).filter(PushDevice.token_hash == device.token_hash, or_(PushDevice.last_sent_day.is_(None), PushDevice.last_sent_day != day)).update({"last_sent_day": day}, synchronize_session=False)
        db.commit()
        if not claimed:
            continue
        try:
            webpush(subscription_info=device.subscription, data=json.dumps(notification_payload(lessons, day)),
                    vapid_private_key=os.environ["VAPID_PRIVATE_KEY"], vapid_claims={"sub": os.environ["VAPID_SUBJECT"]},
                    ttl=max(1, min(3600, int((lessons[0][0] - now).total_seconds()))), timeout=5)
            sent += 1
        except WebPushException as exc:
            status = exc.response.status_code if exc.response is not None else None
            if status in (404, 410):
                db.delete(device)
                expired += 1
            else:
                # A failed delivery can be retried by rerunning the protected cron.
                device.last_sent_day = None
                failed += 1
            db.commit()
    return {"sent": sent, "failed": failed, "expired": expired}
