import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth';
import { InternalChatService } from './internal-chat';

describe('InternalChatService', () => {
  let auth: AuthService;
  let chat: InternalChatService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    auth = TestBed.inject(AuthService);
    chat = TestBed.inject(InternalChatService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('offers role-appropriate channels including Todos', () => {
    auth.login('user');
    expect(chat.channels().map((channel) => channel.id)).toEqual(['all', 'admin']);
    auth.login('teacher');
    expect(chat.channels().map((channel) => channel.id)).toEqual(['all', 'admin']);
    auth.login('admin');
    expect(chat.channels().map((channel) => channel.id)).toEqual(['all', 'user', 'teacher']);
  });

  it('keeps private conversations scoped to their two roles', () => {
    auth.login('user');
    expect(chat.send('admin', 'Necesito ayuda con mi reserva')).toBe('');
    auth.login('teacher');
    expect(chat.conversation('admin')).toHaveLength(0);
    expect(chat.send('admin', 'Consulta del profesor')).toBe('');
    auth.login('admin');
    expect(chat.conversation('user').map((message) => message.body)).toEqual([
      'Necesito ayuda con mi reserva',
    ]);
    expect(chat.conversation('teacher').map((message) => message.body)).toEqual([
      'Consulta del profesor',
    ]);
  });

  it('delivers Todos messages and tracks unread messages per role', () => {
    auth.login('teacher');
    expect(chat.send('all', 'Cambio de sala para todos')).toBe('');
    auth.login('user');
    expect(chat.unread().some((message) => message.body === 'Cambio de sala para todos')).toBe(
      true,
    );
    chat.markAllRead();
    expect(chat.unread()).toHaveLength(0);
    auth.login('admin');
    expect(chat.unread().some((message) => message.body === 'Cambio de sala para todos')).toBe(
      true,
    );
  });

  it('lets administration search and message one person', () => {
    auth.login('admin');
    const sofia = chat
      .adminTargets('sofia@example.com')
      .find((target) => target.id === 'person:sofia');
    expect(sofia?.label).toBe('Sofía García');
    expect(chat.send('person:sofia', 'Mensaje solo para Sofía')).toBe('');
    auth.login('user');
    expect(chat.conversation('admin').map((message) => message.body)).toContain(
      'Mensaje solo para Sofía',
    );
    auth.login('teacher');
    expect(chat.conversation('admin').map((message) => message.body)).not.toContain(
      'Mensaje solo para Sofía',
    );
  });

  it('delivers class messages only to its enrolled students and teachers', () => {
    auth.login('admin');
    const target = chat
      .adminTargets()
      .find((item) => item.kind === 'class' && item.id.includes('lunes-18'));
    expect(target).toBeDefined();
    expect(chat.send(target!.id, 'Aviso para esta clase')).toBe('');
    auth.login('teacher');
    expect(
      chat.conversation('admin').some((message) => message.body === 'Aviso para esta clase'),
    ).toBe(true);
  });

  it('only lets administration enable or disable the chat', () => {
    auth.login('user');
    expect(chat.setEnabled(false)).toContain('Solo administración');
    auth.login('admin');
    expect(chat.setEnabled(false)).toBe('');
    expect(chat.enabled()).toBe(false);
    auth.login('teacher');
    expect(chat.send('all', 'No debería salir')).toContain('desactivado');
    auth.login('admin');
    expect(chat.setEnabled(true)).toBe('');
    expect(chat.enabled()).toBe(true);
  });

  it('validates empty, oversized and unauthorized messages', () => {
    auth.login('user');
    expect(chat.send('all', '   ')).toContain('Escribe');
    expect(chat.send('all', 'x'.repeat(1001))).toContain('1000');
    expect(chat.send('teacher', 'Intento no permitido')).toContain('No puedes');
  });

  it('synchronizes state received from another browser tab', () => {
    auth.login('user');
    const state = {
      version: 1,
      enabled: false,
      messages: [],
    };
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'arete.internal-chat.v1',
        newValue: JSON.stringify(state),
      }),
    );
    expect(chat.enabled()).toBe(false);
  });
});
