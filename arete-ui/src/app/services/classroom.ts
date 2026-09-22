import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, interval, map, merge, startWith } from 'rxjs';
import { AuthService } from './auth';
import { ACADEMY_TEACHERS, WEEKLY_CLASSES, WeeklyClass } from '../data/weekly-schedule';

export type DanceRole = 'chico' | 'chica';
export type AttendanceResponse = 'going' | 'not-going' | 'unsure';
export interface Student {
  id: string;
  name: string;
  email: string;
  danceRole: DanceRole | null;
}
export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
}
export interface Reinforcement {
  chico: number;
  chica: number;
  message: string;
}
export interface Lesson {
  id: string;
  name: string;
  level: string;
  date: string;
  time: string;
  duration: number;
  capacity: number;
  roleCapacity: Record<DanceRole, number>;
  teacherIds: string[];
  room: string;
  studentIds: string[];
  absenceIds: string[];
  attendance: Record<string, 'present' | 'absent'>;
  reinforcement: Reinforcement;
  weeklyClassId?: string;
  rsvp?: Record<string, AttendanceResponse>;
}
interface ClassroomState {
  version: 2;
  students: Student[];
  teachers: Teacher[];
  fixedClasses: WeeklyClass[];
  lessons: Lesson[];
}
interface StoredStateV2 extends Omit<ClassroomState, 'teachers' | 'fixedClasses'> {
  teachers?: Teacher[];
  fixedClasses?: WeeklyClass[];
}
interface LegacyState {
  version: 1;
  students: Omit<Student, 'danceRole'>[];
  lessons: (Omit<Lesson, 'roleCapacity' | 'teacherIds' | 'absenceIds' | 'reinforcement'> & {
    teacherId: string;
  })[];
}
export const TEACHERS = [...ACADEMY_TEACHERS];
export const EMPTY_REQUEST = (): Reinforcement => ({ chico: 0, chica: 0, message: '' });
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
// Keep the original key so the first prototype's data is migrated rather than discarded.
const STORAGE_KEY = 'arete.classroom.demo.v1';
const DEMO_ROLES: Record<string, DanceRole> = {
  sofia: 'chica',
  ana: 'chica',
  lucas: 'chico',
  'pablo-student': 'chico',
};
function defaultTeachers(): Teacher[] {
  return ACADEMY_TEACHERS.map((teacher) => ({
    ...teacher,
    email: '',
    phone: '',
  }));
}
function defaultFixedClasses(): WeeklyClass[] {
  return WEEKLY_CLASSES.map((lesson) => ({
    ...lesson,
    teacherIds: [...lesson.teacherIds],
    roleCapacity: { ...lesson.roleCapacity },
  }));
}
function initialState(): ClassroomState {
  const students: Student[] = [
    { id: 'sofia', name: 'Sofía García', email: 'sofia@example.com', danceRole: 'chica' },
    { id: 'lucas', name: 'Lucas Romero', email: 'lucas@example.com', danceRole: 'chico' },
    { id: 'ana', name: 'Ana Pérez', email: 'ana@example.com', danceRole: 'chica' },
    {
      id: 'pablo-student',
      name: 'Pablo Ruiz',
      email: 'pablo@example.com',
      danceRole: 'chico',
    },
  ];
  return syncWeeklySchedule({
    version: 2,
    students,
    teachers: defaultTeachers(),
    fixedClasses: defaultFixedClasses(),
    lessons: [],
  });
}

function syncWeeklySchedule(state: ClassroomState): ClassroomState {
  const lessons = state.lessons.filter((lesson) => !lesson.id.startsWith('demo-'));
  const existingIds = new Set(lessons.map((lesson) => lesson.id));
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let offset = 0; offset <= 21; offset++) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const weekday = (date.getDay() + 6) % 7;
    for (const weekly of state.fixedClasses.filter((item) => item.day === weekday)) {
      const dateValue = dayKey(date);
      const id = `weekly-${weekly.id}-${dateValue}`;
      if (existingIds.has(id)) continue;
      if (new Date(`${dateValue}T${weekly.time}`).getTime() <= Date.now()) continue;
      lessons.push({
        id,
        weeklyClassId: weekly.id,
        name: weekly.name,
        level: weekly.level,
        date: dateValue,
        time: weekly.time,
        duration: weekly.duration,
        capacity: weekly.roleCapacity.chico + weekly.roleCapacity.chica,
        roleCapacity: { ...weekly.roleCapacity },
        teacherIds: [...weekly.teacherIds],
        room: weekly.room,
        studentIds: [],
        attendance: {},
        absenceIds: [],
        reinforcement: EMPTY_REQUEST(),
        rsvp: {},
      });
    }
  }
  return { ...state, lessons };
}
function validBase(value: unknown): value is LegacyState | StoredStateV2 {
  if (!value || typeof value !== 'object') return false;
  const s = value as LegacyState | StoredStateV2;
  return (
    [1, 2].includes(s.version) &&
    Array.isArray(s.students) &&
    Array.isArray(s.lessons) &&
    s.students.every(
      (x) =>
        x && typeof x.id === 'string' && typeof x.name === 'string' && typeof x.email === 'string',
    ) &&
    s.lessons.every(
      (x) =>
        x &&
        typeof x.id === 'string' &&
        typeof x.name === 'string' &&
        typeof x.room === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(x.date) &&
        /^\d{2}:\d{2}$/.test(x.time) &&
        Number.isInteger(x.duration) &&
        Number.isInteger(x.capacity) &&
        Array.isArray(x.studentIds) &&
        x.studentIds.every((id) => typeof id === 'string') &&
        x.attendance &&
        typeof x.attendance === 'object',
    )
  );
}
function restoreState(value: unknown): ClassroomState | null {
  if (!validBase(value)) return null;
  if (value.version === 1) {
    const students = value.students.map((s) => ({ ...s, danceRole: DEMO_ROLES[s.id] ?? null }));
    return {
      version: 2,
      students,
      teachers: defaultTeachers(),
      fixedClasses: defaultFixedClasses(),
      lessons: value.lessons.map((l) => {
        const boys = l.studentIds.filter(
          (id) => students.find((s) => s.id === id)?.danceRole === 'chico',
        ).length;
        const girls = l.studentIds.filter(
          (id) => students.find((s) => s.id === id)?.danceRole === 'chica',
        ).length;
        const chico = Math.max(boys, Math.min(Math.ceil(l.capacity / 2), l.capacity - girls));
        const { teacherId, ...rest } = l;
        return {
          ...rest,
          roleCapacity: { chico, chica: l.capacity - chico },
          teacherIds: [teacherId],
          absenceIds: [],
          reinforcement: EMPTY_REQUEST(),
          rsvp: {},
        };
      }),
    };
  }
  const teachers =
    Array.isArray(value.teachers) &&
    value.teachers.every(
      (teacher) =>
        teacher &&
        typeof teacher.id === 'string' &&
        typeof teacher.name === 'string' &&
        typeof teacher.email === 'string' &&
        typeof teacher.phone === 'string',
    )
      ? value.teachers
      : defaultTeachers();
  const fixedClasses =
    Array.isArray(value.fixedClasses) &&
    value.fixedClasses.every(
      (lesson) =>
        lesson &&
        typeof lesson.id === 'string' &&
        Number.isInteger(lesson.day) &&
        lesson.day >= 0 &&
        lesson.day <= 4 &&
        /^\d{2}:\d{2}$/.test(lesson.time) &&
        typeof lesson.name === 'string' &&
        typeof lesson.level === 'string' &&
        typeof lesson.room === 'string' &&
        Number.isInteger(lesson.duration) &&
        Array.isArray(lesson.teacherIds) &&
        lesson.roleCapacity,
    )
      ? value.fixedClasses
      : defaultFixedClasses();
  const valid =
    value.students.every(
      (s) => s.danceRole === null || s.danceRole === 'chico' || s.danceRole === 'chica',
    ) &&
    value.lessons.every(
      (l) =>
        Array.isArray(l.teacherIds) &&
        l.teacherIds.length <= 2 &&
        l.teacherIds.every((id) => teachers.some((teacher) => teacher.id === id)) &&
        Array.isArray(l.absenceIds) &&
        l.absenceIds.every((id) => l.studentIds.includes(id)) &&
        l.roleCapacity &&
        l.reinforcement &&
        ['chico', 'chica'].every((role) => {
          const r = role as DanceRole;
          return (
            Number.isInteger(l.roleCapacity[r]) &&
            l.roleCapacity[r] >= 0 &&
            Number.isInteger(l.reinforcement[r]) &&
            l.reinforcement[r] >= 0
          );
        }) &&
        typeof l.reinforcement.message === 'string',
    );
  return valid ? { ...value, teachers, fixedClasses } : null;
}
@Injectable({ providedIn: 'root' })
export class ClassroomService {
  private auth = inject(AuthService);
  readonly studentId = 'sofia';
  readonly teacherId = 'ruben';
  readonly roles: DanceRole[] = ['chico', 'chica'];
  // Re-evaluate day-based reminders after midnight and when the PWA regains focus.
  readonly now = toSignal(
    merge(
      interval(30000),
      fromEvent(window, 'focus'),
      fromEvent(document, 'visibilitychange'),
    ).pipe(
      map(() => Date.now()),
      startWith(Date.now()),
    ),
    { requireSync: true },
  );
  storageWarning = signal('');
  private state = signal<ClassroomState>(this.restore());
  students = computed(() => this.state().students);
  teachers = computed(() => this.state().teachers);
  fixedClasses = computed(() => this.state().fixedClasses);
  lessons = computed(() =>
    [...this.state().lessons].sort((a, b) =>
      `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
    ),
  );
  todayReminders = computed(() => {
    const now = this.now();
    const today = dayKey(new Date(now));
    if (!this.auth.isUser()) return [];
    return this.lessons().filter(
      (l) =>
        l.date === today &&
        l.studentIds.includes(this.studentId) &&
        !l.absenceIds.includes(this.studentId) &&
        new Date(`${l.date}T${l.time}`).getTime() + l.duration * 60000 > now,
    );
  });
  todayPendingResponses = computed(() =>
    this.todayReminders().filter((lesson) => !lesson.rsvp?.[this.studentId]),
  );
  private restore(): ClassroomState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const state = restoreState(JSON.parse(raw));
        if (state) return syncWeeklySchedule(state);
        this.storageWarning.set(
          'Los datos guardados no son compatibles. Se muestra la demo sin borrar la copia anterior.',
        );
      }
    } catch {
      this.storageWarning.set('No se pueden recuperar los datos guardados en este navegador.');
    }
    return initialState();
  }
  private save(state: ClassroomState): void {
    this.state.set(state);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      this.storageWarning.set(
        'Los cambios solo durarán esta sesión: el navegador no permite guardarlos.',
      );
    }
  }
  isPast(lesson: Lesson): boolean {
    return new Date(`${lesson.date}T${lesson.time}`).getTime() <= this.now();
  }
  teacherName(id: string): string {
    return this.teachers().find((teacher) => teacher.id === id)?.name ?? 'Sin profesor';
  }
  teacherNames(lesson: Lesson): string {
    return lesson.teacherIds.map((id) => this.teacherName(id)).join(' y ') || 'Por confirmar';
  }
  attendanceResponse(lesson: Lesson, studentId: string): AttendanceResponse | null {
    return lesson.rsvp?.[studentId] ?? null;
  }
  studentName(id: string): string {
    return this.students().find((s) => s.id === id)?.name ?? 'Alumno';
  }
  studentRole(id: string): DanceRole | null {
    return this.students().find((s) => s.id === id)?.danceRole ?? null;
  }
  roleLabel(role: DanceRole | null): string {
    return role === 'chico' ? 'Chico' : role === 'chica' ? 'Chica' : 'Sin asignar';
  }
  activeIds(lesson: Lesson): string[] {
    return lesson.studentIds.filter((id) => !lesson.absenceIds.includes(id));
  }
  occupied(lesson: Lesson, role: DanceRole): number {
    return this.activeIds(lesson).filter((id) => this.studentRole(id) === role).length;
  }
  freeSpots(lesson: Lesson, role: DanceRole): number {
    return Math.max(
      0,
      Math.min(
        lesson.roleCapacity[role] - this.occupied(lesson, role),
        lesson.capacity - this.activeIds(lesson).length,
      ),
    );
  }
  availableForStudent(lesson: Lesson): number {
    const role = this.studentRole(this.studentId);
    return role ? this.freeSpots(lesson, role) : 0;
  }
  canManage(lesson: Lesson): boolean {
    return (
      this.auth.isAdmin() || (this.auth.isTeacher() && lesson.teacherIds.includes(this.teacherId))
    );
  }
  needed(lesson: Lesson, role: DanceRole): number {
    return this.isPast(lesson)
      ? 0
      : Math.min(lesson.reinforcement[role], this.freeSpots(lesson, role));
  }
  private normalize(lesson: Lesson): Lesson {
    return {
      ...lesson,
      reinforcement: {
        ...lesson.reinforcement,
        chico: Math.min(lesson.reinforcement.chico, this.freeSpots(lesson, 'chico')),
        chica: Math.min(lesson.reinforcement.chica, this.freeSpots(lesson, 'chica')),
      },
    };
  }
  reserve(id: string): string {
    if (!this.auth.isUser()) return 'Accede como alumno para reservar.';
    const lesson = this.lessons().find((l) => l.id === id);
    if (!lesson || this.isPast(lesson)) return 'Esta clase ya no admite reservas.';
    if (lesson.studentIds.includes(this.studentId))
      return 'Ya tienes una inscripción en esta clase. Si avisaste de una falta, usa «Volveré a asistir».';
    const role = this.studentRole(this.studentId);
    if (!role) return 'Pide a administración que asigne tu tipo de plaza.';
    if (this.freeSpots(lesson, role) <= 0) return `No quedan plazas de ${role}.`;
    this.replace({
      ...lesson,
      studentIds: [...lesson.studentIds, this.studentId],
      reinforcement: {
        ...lesson.reinforcement,
        [role]: Math.max(0, lesson.reinforcement[role] - 1),
      },
    });
    return '';
  }
  cancelReservation(id: string): string {
    if (!this.auth.isUser()) return 'Accede como alumno para cancelar.';
    const lesson = this.lessons().find((l) => l.id === id);
    if (!lesson || this.isPast(lesson)) return 'No se puede cancelar una clase que ya ha empezado.';
    const attendance = { ...lesson.attendance };
    delete attendance[this.studentId];
    const rsvp = { ...(lesson.rsvp ?? {}) };
    delete rsvp[this.studentId];
    this.replace({
      ...lesson,
      studentIds: lesson.studentIds.filter((s) => s !== this.studentId),
      absenceIds: lesson.absenceIds.filter((s) => s !== this.studentId),
      attendance,
      rsvp,
    });
    return '';
  }
  notifyAbsence(id: string, absent: boolean): string {
    if (!this.auth.isUser()) return 'Accede como alumno para avisar de una falta.';
    const lesson = this.lessons().find((l) => l.id === id);
    if (!lesson || !lesson.studentIds.includes(this.studentId))
      return 'No tienes una inscripción en esta clase.';
    if (this.isPast(lesson)) return 'La clase ya ha empezado. Contacta con el profesor.';
    const wasAbsent = lesson.absenceIds.includes(this.studentId);
    if (absent === wasAbsent) return '';
    const role = this.studentRole(this.studentId);
    if (!absent && (!role || this.freeSpots(lesson, role) <= 0))
      return 'Tu plaza ya está cubierta. No puedes recuperar la asistencia hasta que quede una libre de tu tipo.';
    const reinforcement = { ...lesson.reinforcement };
    if (!absent && role) reinforcement[role] = Math.max(0, reinforcement[role] - 1);
    this.replace({
      ...lesson,
      absenceIds: absent
        ? [...lesson.absenceIds, this.studentId]
        : lesson.absenceIds.filter((s) => s !== this.studentId),
      reinforcement,
      rsvp: { ...(lesson.rsvp ?? {}), [this.studentId]: absent ? 'not-going' : 'going' },
    });
    return '';
  }
  respondAttendance(id: string, response: AttendanceResponse): string {
    if (!this.auth.isUser()) return 'Accede como alumno para confirmar tu asistencia.';
    const lesson = this.lessons().find((item) => item.id === id);
    if (!lesson || !lesson.studentIds.includes(this.studentId))
      return 'No tienes una inscripción en esta clase.';
    if (this.isPast(lesson)) return 'La clase ya ha empezado.';
    const absent = response === 'not-going';
    const wasAbsent = lesson.absenceIds.includes(this.studentId);
    const role = this.studentRole(this.studentId);
    if (!absent && wasAbsent && (!role || this.freeSpots(lesson, role) <= 0))
      return 'Tu plaza ya está cubierta. Contacta con administración para recuperarla.';
    this.replace({
      ...lesson,
      absenceIds: absent
        ? [...new Set([...lesson.absenceIds, this.studentId])]
        : lesson.absenceIds.filter((studentId) => studentId !== this.studentId),
      rsvp: { ...(lesson.rsvp ?? {}), [this.studentId]: response },
    });
    return '';
  }
  requestReinforcement(id: string, request: Reinforcement): string {
    const lesson = this.lessons().find((l) => l.id === id);
    if (!lesson || !this.canManage(lesson))
      return 'Solo administración o los profesores de esta clase pueden solicitar refuerzos.';
    if (this.isPast(lesson))
      return 'No se pueden solicitar refuerzos para una clase que ya ha empezado.';
    if (
      this.roles.some(
        (role) =>
          !Number.isInteger(request[role]) ||
          request[role] < 0 ||
          request[role] > this.freeSpots(lesson, role),
      )
    )
      return 'Solicita solo las plazas libres de cada tipo.';
    if (request.chico + request.chica > lesson.capacity - this.activeIds(lesson).length)
      return 'La solicitud supera las plazas libres de la clase.';
    this.replace({
      ...lesson,
      reinforcement: { ...request, message: request.message.trim().slice(0, 240) },
    });
    return '';
  }
  saveLesson(input: Lesson): string {
    if (!this.auth.isAdmin()) return 'Solo administración puede editar clases.';
    if (!input.name.trim() || !input.room.trim() || !input.date || !input.time)
      return 'Completa el nombre, la fecha, el horario y la sala.';
    if (
      input.teacherIds.length > 2 ||
      new Set(input.teacherIds).size !== input.teacherIds.length ||
      input.teacherIds.some((id) => !this.teachers().some((teacher) => teacher.id === id))
    )
      return 'Selecciona como máximo dos profesores diferentes.';
    if (!Number.isFinite(new Date(`${input.date}T${input.time}`).getTime()) || this.isPast(input))
      return 'Elige una fecha y hora futuras.';
    const capacity = input.roleCapacity.chico + input.roleCapacity.chica;
    if (
      this.roles.some(
        (r) => !Number.isInteger(input.roleCapacity[r]) || input.roleCapacity[r] < 0,
      ) ||
      capacity < 1 ||
      capacity > 200 ||
      !Number.isInteger(input.duration) ||
      input.duration < 15 ||
      input.duration > 240
    )
      return 'Revisa las plazas (0–200 por tipo, 1–200 en total) y la duración (15–240 minutos).';
    if (
      new Set(input.studentIds).size !== input.studentIds.length ||
      input.studentIds.some((id) => !this.students().some((s) => s.id === id))
    )
      return 'Revisa los alumnos inscritos.';
    if (this.activeIds(input).some((id) => !this.studentRole(id)))
      return 'Asigna primero el tipo de plaza de los alumnos desde Gestión.';
    if (this.roles.some((role) => this.occupied(input, role) > input.roleCapacity[role]))
      return 'Las plazas de cada tipo no pueden ser inferiores a sus alumnos confirmados.';
    const start = new Date(`${input.date}T${input.time}`).getTime();
    const conflict = this.lessons().some(
      (l) =>
        l.id !== input.id &&
        (l.teacherIds.some((id) => input.teacherIds.includes(id)) ||
          l.room.trim().toLowerCase() === input.room.trim().toLowerCase()) &&
        start < new Date(`${l.date}T${l.time}`).getTime() + l.duration * 60000 &&
        start + input.duration * 60000 > new Date(`${l.date}T${l.time}`).getTime(),
    );
    if (conflict) return 'Uno de los profesores o la sala ya tienen una clase en ese horario.';
    const lesson = this.normalize({
      ...input,
      capacity,
      name: input.name.trim(),
      room: input.room.trim(),
      id: input.id || crypto.randomUUID(),
      teacherIds: [...input.teacherIds],
      studentIds: [...input.studentIds],
      roleCapacity: { ...input.roleCapacity },
      absenceIds: input.absenceIds.filter((id) => input.studentIds.includes(id)),
      attendance: Object.fromEntries(
        Object.entries(input.attendance).filter(([id]) => input.studentIds.includes(id)),
      ),
      rsvp: Object.fromEntries(
        Object.entries(input.rsvp ?? {}).filter(([id]) => input.studentIds.includes(id)),
      ),
    });
    this.save({
      ...this.state(),
      lessons: [...this.state().lessons.filter((l) => l.id !== lesson.id), lesson],
    });
    return '';
  }
  deleteLesson(id: string): string {
    if (!this.auth.isAdmin()) return 'Solo administración puede eliminar clases.';
    this.save({ ...this.state(), lessons: this.state().lessons.filter((l) => l.id !== id) });
    return '';
  }
  saveFixedClass(input: WeeklyClass): string {
    if (!this.auth.isAdmin()) return 'Solo administración puede editar las clases fijas.';
    const capacity = input.roleCapacity.chico + input.roleCapacity.chica;
    if (
      !input.id ||
      !input.name.trim() ||
      !input.room.trim() ||
      !Number.isInteger(input.day) ||
      input.day < 0 ||
      input.day > 4 ||
      !/^\d{2}:\d{2}$/.test(input.time)
    )
      return 'Completa el nombre, día, horario y sala.';
    if (
      input.teacherIds.length > 2 ||
      new Set(input.teacherIds).size !== input.teacherIds.length ||
      input.teacherIds.some((id) => !this.teachers().some((teacher) => teacher.id === id))
    )
      return 'Selecciona como máximo dos profesores diferentes.';
    if (
      this.roles.some(
        (role) => !Number.isInteger(input.roleCapacity[role]) || input.roleCapacity[role] < 0,
      ) ||
      capacity < 1 ||
      capacity > 200 ||
      !Number.isInteger(input.duration) ||
      input.duration < 15 ||
      input.duration > 240
    )
      return 'Revisa las plazas y la duración de la clase.';
    const startsAt = this.timeMinutes(input.time);
    const conflict = this.fixedClasses().some((lesson) => {
      if (lesson.id === input.id || lesson.day !== input.day) return false;
      const otherStart = this.timeMinutes(lesson.time);
      const overlaps =
        startsAt < otherStart + lesson.duration && otherStart < startsAt + input.duration;
      return (
        overlaps &&
        (lesson.room.trim().toLowerCase() === input.room.trim().toLowerCase() ||
          lesson.teacherIds.some((id) => input.teacherIds.includes(id)))
      );
    });
    if (conflict) return 'Uno de los profesores o la sala ya tienen una clase en ese horario.';
    const affected = this.lessons().filter(
      (lesson) => lesson.weeklyClassId === input.id && !this.isPast(lesson),
    );
    if (
      affected.some((lesson) =>
        this.roles.some(
          (role) =>
            this.activeIds(lesson).filter((id) => this.studentRole(id) === role).length >
            input.roleCapacity[role],
        ),
      )
    )
      return 'Las nuevas plazas no pueden ser inferiores a los alumnos ya inscritos.';
    const fixedClass: WeeklyClass = {
      ...input,
      name: input.name.trim(),
      level: input.level.trim(),
      room: input.room.trim(),
      slot: `${input.time.slice(0, 2)}:00`,
      teacherIds: [...input.teacherIds],
      roleCapacity: { ...input.roleCapacity },
    };
    const updatedState: ClassroomState = {
      ...this.state(),
      fixedClasses: this.fixedClasses().map((lesson) =>
        lesson.id === fixedClass.id ? fixedClass : lesson,
      ),
      lessons: this.lessons()
        .map((lesson) => {
          if (lesson.weeklyClassId !== fixedClass.id || this.isPast(lesson)) return lesson;
          const date = new Date(`${lesson.date}T12:00:00`);
          const mondayOffset = (date.getDay() + 6) % 7;
          date.setDate(date.getDate() - mondayOffset + fixedClass.day);
          const dateValue = dayKey(date);
          return {
            ...lesson,
            id: `weekly-${fixedClass.id}-${dateValue}`,
            name: fixedClass.name,
            level: fixedClass.level,
            date: dateValue,
            time: fixedClass.time,
            duration: fixedClass.duration,
            capacity,
            roleCapacity: { ...fixedClass.roleCapacity },
            teacherIds: [...fixedClass.teacherIds],
            room: fixedClass.room,
          };
        })
        .filter(
          (lesson) =>
            lesson.weeklyClassId !== fixedClass.id ||
            new Date(`${lesson.date}T${lesson.time}`).getTime() > this.now(),
        ),
    };
    this.save(syncWeeklySchedule(updatedState));
    return '';
  }
  saveTeacher(input: Teacher): string {
    if (!this.auth.isAdmin()) return 'Solo administración puede gestionar profesores.';
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.trim();
    if (!name) return 'Escribe el nombre del profesor.';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return 'Revisa el correo electrónico.';
    if (
      email &&
      this.teachers().some(
        (teacher) => teacher.id !== input.id && teacher.email.toLowerCase() === email,
      )
    )
      return 'Ya existe un profesor con ese correo.';
    const teacher: Teacher = {
      id: input.id || crypto.randomUUID(),
      name,
      email,
      phone,
    };
    this.save({
      ...this.state(),
      teachers: [
        ...this.teachers().filter((item) => item.id !== teacher.id),
        teacher,
      ].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    });
    return '';
  }
  addStudent(
    name: string,
    email: string,
    danceRole: DanceRole,
    weeklyClassIds: string[] = [],
  ): string {
    if (!this.auth.isAdmin()) return 'Solo administración puede crear alumnos.';
    name = name.trim();
    email = email.trim().toLowerCase();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return 'Escribe un nombre y un correo válido.';
    if (!this.roles.includes(danceRole)) return 'Selecciona plaza de chico o chica.';
    if (this.students().some((s) => s.email.toLowerCase() === email))
      return 'Ya existe un alumno con ese correo.';
    if (weeklyClassIds.some((id) => !this.fixedClasses().some((item) => item.id === id)))
      return 'Revisa las clases seleccionadas.';
    const selectedLessons = this.lessons().filter(
      (lesson) =>
        !this.isPast(lesson) &&
        lesson.weeklyClassId &&
        weeklyClassIds.includes(lesson.weeklyClassId),
    );
    if (selectedLessons.some((lesson) => this.freeSpots(lesson, danceRole) <= 0))
      return 'Una de las clases seleccionadas no tiene plazas libres para ese tipo.';
    const id = crypto.randomUUID();
    this.save({
      ...this.state(),
      students: [...this.students(), { id, name, email, danceRole }],
      lessons: this.lessons().map((lesson) =>
        lesson.weeklyClassId && weeklyClassIds.includes(lesson.weeklyClassId)
          ? { ...lesson, studentIds: [...lesson.studentIds, id] }
          : lesson,
      ),
    });
    return '';
  }
  setStudentRole(id: string, danceRole: DanceRole): string {
    if (!this.auth.isAdmin() || !this.roles.includes(danceRole))
      return 'Solo administración puede asignar el tipo de plaza.';
    if (!this.students().some((s) => s.id === id)) return 'No se encuentra al alumno.';
    const overbooked = this.lessons().some(
      (l) =>
        !this.isPast(l) &&
        this.activeIds(l).includes(id) &&
        this.activeIds(l).filter((s) => s === id || this.studentRole(s) === danceRole).length >
          l.roleCapacity[danceRole],
    );
    if (overbooked)
      return 'El cambio supera las plazas de ese tipo en una clase. Amplía su aforo primero.';
    this.save({
      ...this.state(),
      students: this.students().map((s) => (s.id === id ? { ...s, danceRole } : s)),
    });
    this.save({ ...this.state(), lessons: this.lessons().map((l) => this.normalize(l)) });
    return '';
  }
  setAttendance(lessonId: string, studentId: string, status: 'present' | 'absent'): string {
    const lesson = this.lessons().find((l) => l.id === lessonId);
    if (!lesson || !lesson.studentIds.includes(studentId))
      return 'No se encuentra esa inscripción.';
    if (!this.canManage(lesson)) return 'Solo puedes pasar lista en tus clases.';
    const absenceIds = lesson.absenceIds.filter((id) => id !== studentId);
    if (status === 'present' && lesson.absenceIds.includes(studentId)) {
      const role = this.studentRole(studentId);
      if (!role || this.freeSpots(lesson, role) <= 0)
        return 'La plaza del alumno ausente ya está cubierta. Revisa el aforo antes de marcar su asistencia.';
    }
    this.replace({
      ...lesson,
      absenceIds: status === 'present' ? absenceIds : lesson.absenceIds,
      attendance: { ...lesson.attendance, [studentId]: status },
    });
    return '';
  }
  private replace(lesson: Lesson): void {
    this.save({
      ...this.state(),
      lessons: this.state().lessons.map((l) => (l.id === lesson.id ? this.normalize(lesson) : l)),
    });
  }
  private timeMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
