import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SwPush } from '@angular/service-worker';
import { of } from 'rxjs';
import { PushRemindersService } from './push-reminders';
import { ClassroomService, dayKey, EMPTY_REQUEST } from './classroom';
import { AuthService } from './auth';

describe('Push opt-in and schedule synchronization', () => {
  let http: HttpTestingController;
  let push: PushRemindersService;
  let store: ClassroomService;
  let auth: AuthService;
  const subscription = {
    toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/test', keys: {} }),
  };
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal('Notification', { permission: 'default' });
    vi.stubGlobal('PushManager', class {});
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SwPush,
          useValue: {
            isEnabled: true,
            requestSubscription: vi.fn().mockResolvedValue(subscription),
            subscription: of(subscription),
            unsubscribe: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    store = TestBed.inject(ClassroomService);
    push = TestBed.inject(PushRemindersService);
    TestBed.tick();
  });
  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  async function register() {
    const promise = push.enable();
    http
      .expectOne('http://localhost:8000/api/push/config')
      .flush({ enabled: true, publicKey: 'test-key' });
    await Promise.resolve();
    await Promise.resolve();
    const request = http.expectOne('http://localhost:8000/api/push/subscription');
    request.flush({ registered: true });
    await promise;
    TestBed.tick();
    http.expectOne('http://localhost:8000/api/push/schedule').flush({ synced: true });
  }
  it('does not request a notification permission when the backend is not configured', async () => {
    const promise = push.enable();
    http
      .expectOne('http://localhost:8000/api/push/config')
      .flush({ enabled: false, publicKey: '' });
    await promise;
    expect(TestBed.inject(SwPush).requestSubscription).not.toHaveBeenCalled();
    expect(push.enabled()).toBe(false);
  });
  it('excludes notified absences from the server schedule and restores them when attending again', async () => {
    const date = new Date();
    date.setDate(date.getDate() + 45);
    auth.login('admin');
    store.saveLesson({
      id: 'push-test',
      name: 'Salsa',
      level: 'Iniciación',
      date: dayKey(date),
      time: '18:00',
      duration: 60,
      capacity: 2,
      roleCapacity: { chico: 1, chica: 1 },
      teacherIds: ['ruben'],
      room: 'Sala 1',
      studentIds: ['sofia'],
      absenceIds: [],
      attendance: {},
      reinforcement: EMPTY_REQUEST(),
    });
    auth.login('user');
    await register();
    store.notifyAbsence('push-test', true);
    TestBed.tick();
    let request = http.expectOne('http://localhost:8000/api/push/schedule');
    expect(request.request.body.lessons.some((l: { id: string }) => l.id === 'push-test')).toBe(
      false,
    );
    request.flush({ synced: true });
    store.notifyAbsence('push-test', false);
    TestBed.tick();
    request = http.expectOne('http://localhost:8000/api/push/schedule');
    expect(request.request.body.lessons.some((l: { id: string }) => l.id === 'push-test')).toBe(
      true,
    );
    request.flush({ synced: true });
  });
  it('does not display an active subscription when server registration fails', async () => {
    const promise = push.enable();
    http
      .expectOne('http://localhost:8000/api/push/config')
      .flush({ enabled: true, publicKey: 'test-key' });
    await Promise.resolve();
    await Promise.resolve();
    http
      .expectOne('http://localhost:8000/api/push/subscription')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await promise;
    expect(push.enabled()).toBe(false);
    expect(localStorage.getItem('arete.push.active.v1')).toBeNull();
  });
  it('unsubscribes in the browser and removes the remote device on opt-out', async () => {
    await register();
    const promise = push.disable();
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne('http://localhost:8000/api/push/subscription').flush({ removed: true });
    await promise;
    TestBed.tick();
    expect(push.enabled()).toBe(false);
    expect(TestBed.inject(SwPush).unsubscribe).toHaveBeenCalled();
  });
});
