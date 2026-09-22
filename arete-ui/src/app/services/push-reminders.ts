import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, EMPTY, firstValueFrom, switchMap, timeout } from 'rxjs';
import { ClassroomService } from './classroom';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'arete.push.device.v1';
const ACTIVE_KEY = 'arete.push.active.v1';
function savedActive(): boolean {
  try {
    return localStorage.getItem(ACTIVE_KEY) === 'true';
  } catch {
    return false;
  }
}
function savedToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}
@Injectable({ providedIn: 'root' })
export class PushRemindersService {
  private http = inject(HttpClient);
  private sw = inject(SwPush, { optional: true });
  private store = inject(ClassroomService);
  private token = signal(savedToken());
  private active = signal(savedActive());
  private api = `${environment.apiUrl}/api/push`;
  busy = signal(false);
  error = signal('');
  synced = signal(false);
  enabled = computed(() => this.active() && !!this.token());
  supported =
    !!this.sw?.isEnabled && typeof Notification !== 'undefined' && 'PushManager' in window;
  private schedule = computed(() =>
    this.store
      .lessons()
      .filter(
        (l) =>
          l.studentIds.includes(this.store.studentId) &&
          !l.absenceIds.includes(this.store.studentId) &&
          !this.store.isPast(l),
      )
      .map((l) => ({
        id: l.id,
        name: l.name,
        start: new Date(`${l.date}T${l.time}`).toISOString(),
        room: l.room,
      })),
  );
  private syncInput = computed(() =>
    JSON.stringify({ token: this.active() ? this.token() : '', lessons: this.schedule() }),
  );
  constructor() {
    toObservable(this.syncInput)
      .pipe(
        distinctUntilChanged(),
        switchMap((raw) => {
          const input = JSON.parse(raw) as { token: string; lessons: unknown[] };
          if (!input.token) return EMPTY;
          this.synced.set(false);
          return this.http
            .put(
              `${this.api}/schedule`,
              { lessons: input.lessons },
              { headers: { Authorization: `Bearer ${input.token}` } },
            )
            .pipe(
              timeout(8000),
              catchError((error) => {
                this.error.set(this.message(error));
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.synced.set(true);
        this.error.set('');
      });
  }
  async enable(): Promise<void> {
    if (!this.supported || !this.sw || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const config = await firstValueFrom(
        this.http
          .get<{ enabled: boolean; publicKey: string }>(`${this.api}/config`)
          .pipe(timeout(8000)),
      );
      if (!config.enabled || !config.publicKey)
        throw new Error(
          'El servicio de notificaciones todavía no está configurado. El aviso dentro de la PWA sí funciona.',
        );
      const token =
        this.token() ||
        savedToken() ||
        Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
          byte.toString(16).padStart(2, '0'),
        ).join('');
      // Persist ownership before registration so a network interruption cannot orphan the device.
      localStorage.setItem(TOKEN_KEY, token);
      const subscription = await this.sw.requestSubscription({ serverPublicKey: config.publicKey });
      await firstValueFrom(
        this.http
          .put(
            `${this.api}/subscription`,
            { subscription: subscription.toJSON(), lessons: this.schedule() },
            { headers: { Authorization: `Bearer ${token}` } },
          )
          .pipe(timeout(8000)),
      );
      localStorage.setItem(ACTIVE_KEY, 'true');
      this.token.set(token);
      this.active.set(true);
      this.synced.set(true);
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  async disable(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.sw?.isEnabled) {
        const subscription = await firstValueFrom(this.sw.subscription);
        if (subscription) await this.sw.unsubscribe();
      }
      const token = this.token();
      this.active.set(false);
      this.token.set('');
      localStorage.removeItem(ACTIVE_KEY);
      this.synced.set(false);
      localStorage.removeItem(TOKEN_KEY);
      if (token) {
        try {
          await firstValueFrom(
            this.http
              .delete(`${this.api}/subscription`, { headers: { Authorization: `Bearer ${token}` } })
              .pipe(timeout(8000)),
          );
        } catch {
          this.error.set(
            'Notificaciones desactivadas en este navegador. La limpieza del registro remoto queda pendiente.',
          );
        }
      }
    } catch {
      this.error.set(
        'No se han podido desactivar. Puedes bloquear las notificaciones en los ajustes del navegador.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  private message(error: unknown): string {
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied')
      return 'Las notificaciones están bloqueadas. Puedes permitirlas en los ajustes del navegador.';
    if (error instanceof HttpErrorResponse)
      return typeof error.error?.detail === 'string'
        ? error.error.detail
        : 'No se ha podido sincronizar con el servidor. Los cambios locales aún no están reflejados en los recordatorios push.';
    return error instanceof Error && error.message.startsWith('El servicio')
      ? error.message
      : 'No se han podido activar las notificaciones. Comprueba la conexión y el permiso del navegador.';
  }
}
