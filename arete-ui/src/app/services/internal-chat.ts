import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Role, AuthService } from './auth';
import { ClassroomService } from './classroom';

export type ChatRole = Exclude<Role, null>;
export type ChatAudience = ChatRole | 'all' | `person:${string}` | `class:${string}`;

export interface ChatTargetInfo {
  id: ChatAudience;
  label: string;
  description: string;
  kind: 'general' | 'person' | 'class';
}

export interface ChatMessage {
  id: string;
  senderRole: ChatRole;
  senderId?: string;
  senderName: string;
  audience: ChatAudience;
  body: string;
  createdAt: string;
}

interface ChatState {
  version: 1;
  enabled: boolean;
  messages: ChatMessage[];
}

interface ReadState {
  user: string[];
  teacher: string[];
  admin: string[];
}

const CHAT_KEY = 'arete.internal-chat.v1';
const READ_KEY = 'arete.internal-chat.read.v1';
const EMPTY_READ: ReadState = { user: [], teacher: [], admin: [] };

function initialState(): ChatState {
  return {
    version: 1,
    enabled: true,
    messages: [
      {
        id: 'welcome-all',
        senderRole: 'admin',
        senderName: 'Elena',
        audience: 'all',
        body: '¡Bienvenidos al espacio interno de Aretè! Usaremos este chat para avisos de la academia.',
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

function isRole(value: unknown): value is ChatRole {
  return value === 'user' || value === 'teacher' || value === 'admin';
}

function isAudience(value: unknown): value is ChatAudience {
  return (
    value === 'all' ||
    isRole(value) ||
    (typeof value === 'string' && /^(person|class):.+/.test(value))
  );
}

function validState(value: unknown): value is ChatState {
  if (!value || typeof value !== 'object') return false;
  const state = value as ChatState;
  return (
    state.version === 1 &&
    typeof state.enabled === 'boolean' &&
    Array.isArray(state.messages) &&
    state.messages.every(
      (message) =>
        message &&
        typeof message.id === 'string' &&
        isRole(message.senderRole) &&
        typeof message.senderName === 'string' &&
        (message.senderId === undefined || typeof message.senderId === 'string') &&
        isAudience(message.audience) &&
        typeof message.body === 'string' &&
        typeof message.createdAt === 'string',
    )
  );
}

function validRead(value: unknown): value is ReadState {
  if (!value || typeof value !== 'object') return false;
  const state = value as ReadState;
  return ['user', 'teacher', 'admin'].every((role) => {
    const ids = state[role as ChatRole];
    return Array.isArray(ids) && ids.every((id) => typeof id === 'string');
  });
}

@Injectable({ providedIn: 'root' })
export class InternalChatService {
  private auth = inject(AuthService);
  private classroom = inject(ClassroomService);
  private destroyRef = inject(DestroyRef);
  private state = signal<ChatState>(this.restoreState());
  private readState = signal<ReadState>(this.restoreReadState());

  enabled = computed(() => this.state().enabled);
  messages = computed(() => this.state().messages);
  unread = computed(() => {
    const role = this.auth.currentRole();
    if (!role || !this.enabled()) return [];
    const read = new Set(this.readState()[role]);
    return this.messages().filter(
      (message) =>
        message.senderRole !== role && this.isRelevant(message, role) && !read.has(message.id),
    );
  });

  constructor() {
    const onStorage = (event: StorageEvent) => {
      if (event.key === CHAT_KEY && event.newValue) {
        try {
          const value: unknown = JSON.parse(event.newValue);
          if (validState(value)) this.state.set(value);
        } catch {
          // Ignore malformed updates from another local tab.
        }
      }
      if (event.key === READ_KEY && event.newValue) {
        try {
          const value: unknown = JSON.parse(event.newValue);
          if (validRead(value)) this.readState.set(value);
        } catch {
          // Ignore malformed updates from another local tab.
        }
      }
    };
    window.addEventListener('storage', onStorage);
    this.destroyRef.onDestroy(() => window.removeEventListener('storage', onStorage));
  }

  channels(): { id: ChatAudience; label: string; description: string }[] {
    const role = this.auth.currentRole();
    if (role === 'admin') {
      return [
        { id: 'all', label: 'Todos', description: 'Toda la academia' },
        { id: 'user', label: 'Alumnos', description: 'Comunicaciones con alumnos' },
        { id: 'teacher', label: 'Profesores', description: 'Equipo docente' },
      ];
    }
    return [
      { id: 'all', label: 'Todos', description: 'Toda la academia' },
      { id: 'admin', label: 'Administración', description: 'Conversación privada' },
    ];
  }

  adminTargets(query = ''): ChatTargetInfo[] {
    if (!this.auth.isAdmin()) return [];
    const normalized = query.trim().toLowerCase();
    const people: ChatTargetInfo[] = [
      ...this.classroom.students().map((student) => ({
        id: `person:${student.id}` as ChatAudience,
        label: student.name,
        description: student.email,
        kind: 'person' as const,
      })),
      ...this.classroom.teachers().map((teacher) => ({
        id: `person:${teacher.id}` as ChatAudience,
        label: teacher.name,
        description: 'Profesor/a',
        kind: 'person' as const,
      })),
    ];
    const classes: ChatTargetInfo[] = this.classroom.lessons().map((lesson) => ({
      id: `class:${lesson.id}` as ChatAudience,
      label: lesson.name,
      description: `${this.shortDate(lesson.date)} · ${lesson.time} · ${lesson.room}`,
      kind: 'class' as const,
    }));
    return [...people, ...classes].filter((target) =>
      `${target.label} ${target.description}`.toLowerCase().includes(normalized),
    );
  }

  targetInfo(target: ChatAudience): ChatTargetInfo {
    const fixed = this.channels().find((channel) => channel.id === target);
    if (fixed) return { ...fixed, kind: 'general' };
    return (
      this.adminTargets().find((item) => item.id === target) ?? {
        id: target,
        label: 'Conversación',
        description: 'Mensajes internos',
        kind: target.startsWith('class:') ? 'class' : 'person',
      }
    );
  }

  conversation(channel: ChatAudience): ChatMessage[] {
    const role = this.auth.currentRole();
    if (!role) return [];
    if (channel === 'all') return this.messages().filter((message) => message.audience === 'all');
    if (role === 'admin' && (channel === 'user' || channel === 'teacher')) {
      return this.messages().filter(
        (message) =>
          (message.senderRole === 'admin' && message.audience === channel) ||
          (message.senderRole === channel && message.audience === 'admin'),
      );
    }
    if (channel === 'admin' && (role === 'user' || role === 'teacher')) {
      return this.messages().filter(
        (message) =>
          (message.senderRole === role && message.audience === 'admin') ||
          (message.senderRole === 'admin' &&
            message.audience !== 'all' &&
            this.isRelevant(message, role)),
      );
    }
    if (role === 'admin' && channel.startsWith('person:')) {
      const person = this.adminTargets().find((target) => target.id === channel);
      return this.messages().filter(
        (message) =>
          message.audience === channel ||
          (message.audience === 'admin' &&
            (message.senderId === channel.slice('person:'.length) ||
              message.senderName === person?.label)),
      );
    }
    if (role === 'admin' && channel.startsWith('class:')) {
      return this.messages().filter((message) => message.audience === channel);
    }
    return [];
  }

  send(channel: ChatAudience, body: string): string {
    const role = this.auth.currentRole();
    if (!role) return 'Inicia sesión para enviar mensajes.';
    if (!this.enabled()) return 'El chat está desactivado por administración.';
    const allowed = this.channels().some((item) => item.id === channel);
    const adminTarget =
      this.auth.isAdmin() && this.adminTargets().some((item) => item.id === channel);
    if (!allowed && !adminTarget) return 'No puedes escribir en ese canal.';
    body = body.trim();
    if (!body) return 'Escribe un mensaje.';
    if (body.length > 1000) return 'El mensaje no puede superar los 1000 caracteres.';
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      senderRole: role,
      senderId: this.identity(role),
      senderName: this.displayName(role),
      audience: channel,
      body,
      createdAt: new Date().toISOString(),
    };
    const messages = [...this.messages(), message].slice(-500);
    this.save({ ...this.state(), messages });
    this.markRead(message.id);
    return '';
  }

  setEnabled(enabled: boolean): string {
    if (!this.auth.isAdmin()) return 'Solo administración puede cambiar el estado del chat.';
    this.save({ ...this.state(), enabled });
    return '';
  }

  markAllRead(): void {
    const role = this.auth.currentRole();
    if (!role) return;
    const relevant = this.messages()
      .filter((message) => message.senderRole !== role && this.isRelevant(message, role))
      .map((message) => message.id);
    this.saveRead({ ...this.readState(), [role]: relevant.slice(-500) });
  }

  formatTime(value: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  private markRead(id: string): void {
    const role = this.auth.currentRole();
    if (!role) return;
    this.saveRead({
      ...this.readState(),
      [role]: [...new Set([...this.readState()[role], id])].slice(-500),
    });
  }

  private displayName(role: ChatRole): string {
    return role === 'admin' ? 'Elena' : role === 'teacher' ? 'Rubén' : 'Sofía';
  }

  private identity(role: ChatRole): string {
    return role === 'admin'
      ? 'elena'
      : role === 'teacher'
        ? this.classroom.teacherId
        : this.classroom.studentId;
  }

  private isRelevant(message: ChatMessage, role: ChatRole): boolean {
    if (message.audience === 'all' || message.audience === role) return true;
    if (role === 'admin') return message.audience === 'admin';
    const personId = role === 'user' ? this.classroom.studentId : this.classroom.teacherId;
    if (message.audience === `person:${personId}`) return true;
    if (!message.audience.startsWith('class:')) return false;
    const lesson = this.classroom.lessons().find((item) => `class:${item.id}` === message.audience);
    return role === 'user'
      ? Boolean(lesson?.studentIds.includes(personId))
      : Boolean(lesson?.teacherIds.includes(personId));
  }

  private shortDate(value: string): string {
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(
      new Date(`${value}T12:00:00`),
    );
  }

  private restoreState(): ChatState {
    try {
      const raw = localStorage.getItem(CHAT_KEY);
      if (raw) {
        const value: unknown = JSON.parse(raw);
        if (validState(value)) return value;
      }
    } catch {
      // Fall back to the initial local demo.
    }
    return initialState();
  }

  private restoreReadState(): ReadState {
    try {
      const raw = localStorage.getItem(READ_KEY);
      if (raw) {
        const value: unknown = JSON.parse(raw);
        if (validRead(value)) return value;
      }
    } catch {
      // Fall back to all messages being unread.
    }
    return { ...EMPTY_READ, user: [], teacher: [], admin: [] };
  }

  private save(state: ChatState): void {
    this.state.set(state);
    try {
      localStorage.setItem(CHAT_KEY, JSON.stringify(state));
    } catch {
      // The current tab still keeps the conversation in memory.
    }
  }

  private saveRead(state: ReadState): void {
    this.readState.set(state);
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(state));
    } catch {
      // Read status remains available for the current session.
    }
  }
}
