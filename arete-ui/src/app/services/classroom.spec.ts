import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth';
import { ClassroomService, Lesson, dayKey, EMPTY_REQUEST } from './classroom';

describe('Classroom participation workflows', () => {
  let store: ClassroomService;
  let auth: AuthService;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 21, 10));
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    auth = TestBed.inject(AuthService);
    store = TestBed.inject(ClassroomService);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  function futureLesson(overrides: Partial<Lesson> = {}): Lesson {
    const date = new Date();
    date.setDate(date.getDate() + 45);
    return {
      id: 'test-session',
      name: 'Salsa',
      level: 'Iniciación',
      date: dayKey(date),
      time: '18:00',
      duration: 60,
      capacity: 2,
      roleCapacity: { chico: 1, chica: 1 },
      teacherIds: ['ruben'],
      room: 'Sala 1',
      studentIds: [],
      attendance: {},
      absenceIds: [],
      reinforcement: EMPTY_REQUEST(),
      ...overrides,
    };
  }
  function save(lesson = futureLesson()) {
    auth.login('admin');
    expect(store.saveLesson(lesson)).toBe('');
    return lesson;
  }
  it('reserves once, persists across reloads, and releases the correct role on cancellation', () => {
    save();
    auth.login('user');
    expect(store.reserve('test-session')).toBe('');
    expect(store.reserve('test-session')).toContain('Ya tienes');
    TestBed.resetTestingModule();
    store = TestBed.inject(ClassroomService);
    expect(store.lessons().find((l) => l.id === 'test-session')?.studentIds).toEqual(['sofia']);
    expect(store.cancelReservation('test-session')).toBe('');
    expect(store.freeSpots(store.lessons().find((l) => l.id === 'test-session')!, 'chica')).toBe(1);
  });
  it('does not fill a boys place when the girls quota is full', () => {
    save(futureLesson({ studentIds: ['ana'] }));
    auth.login('user');
    expect(store.reserve('test-session')).toContain('No quedan plazas de chica');
    expect(store.freeSpots(store.lessons().find((l) => l.id === 'test-session')!, 'chico')).toBe(1);
  });
  it('supports single-role classes without requiring places for the other role', () => {
    save(futureLesson({ roleCapacity: { chico: 0, chica: 2 } }));
    auth.login('user');
    expect(store.reserve('test-session')).toBe('');
  });
  it('rejects overlapping rooms or either teacher and permits adjacent sessions', () => {
    save(futureLesson({ teacherIds: ['paula', 'ruben'] }));
    expect(
      store.saveLesson(
        futureLesson({ id: 'overlap', time: '18:30', room: 'Sala 2', teacherIds: ['ruben'] }),
      ),
    ).toContain('ya tienen');
    expect(store.saveLesson(futureLesson({ id: 'next', time: '19:00' }))).toBe('');
    expect(
      store.saveLesson(futureLesson({ id: 'bad', time: '21:00', teacherIds: ['ruben', 'ruben'] })),
    ).toContain('diferentes');
    expect(
      store.saveLesson(futureLesson({ id: 'without-teacher', time: '21:00', teacherIds: [] })),
    ).toBe('');
  });
  it('rejects shrinking a role below the confirmed enrollment and invalid quotas', () => {
    auth.login('admin');
    expect(store.saveLesson(futureLesson({ studentIds: ['ana', 'sofia'] }))).toContain(
      'inferiores',
    );
    expect(store.saveLesson(futureLesson({ roleCapacity: { chico: -1, chica: 2 } }))).toContain(
      'Revisa',
    );
    expect(store.saveLesson(futureLesson({ date: '2020-01-01' }))).toContain('futuras');
  });
  it('lets the second assigned teacher request help and register attendance, not edit classes', () => {
    save(futureLesson({ teacherIds: ['paula', 'ruben'], studentIds: ['ana'] }));
    auth.login('teacher');
    expect(
      store.requestReinforcement('test-session', {
        chico: 1,
        chica: 0,
        message: 'Falta una pareja',
      }),
    ).toBe('');
    expect(store.setAttendance('test-session', 'ana', 'present')).toBe('');
    expect(store.saveLesson(futureLesson())).toContain('administración');
    expect(store.deleteLesson('test-session')).toContain('administración');
  });
  it('prevents unrelated teachers from requesting reinforcement or changing attendance', () => {
    save(futureLesson({ teacherIds: ['paula'], studentIds: ['ana'] }));
    auth.login('teacher');
    expect(
      store.requestReinforcement('test-session', { chico: 1, chica: 0, message: '' }),
    ).toContain('profesores de esta clase');
    expect(store.setAttendance('test-session', 'ana', 'present')).toContain('tus clases');
  });
  it('keeps enrollment when reporting absence, frees only the corresponding place and restores it', () => {
    save(futureLesson({ studentIds: ['sofia', 'lucas'] }));
    auth.login('user');
    expect(store.notifyAbsence('test-session', true)).toBe('');
    let lesson = store.lessons().find((l) => l.id === 'test-session')!;
    expect(lesson.studentIds).toContain('sofia');
    expect(lesson.absenceIds).toEqual(['sofia']);
    expect(store.freeSpots(lesson, 'chica')).toBe(1);
    expect(store.freeSpots(lesson, 'chico')).toBe(0);
    expect(store.notifyAbsence('test-session', true)).toBe('');
    expect(store.notifyAbsence('test-session', false)).toBe('');
    lesson = store.lessons().find((l) => l.id === 'test-session')!;
    expect(store.freeSpots(lesson, 'chica')).toBe(0);
  });
  it('does not restore an absence if another student has taken the place', () => {
    save(futureLesson({ studentIds: ['sofia'] }));
    auth.login('user');
    store.notifyAbsence('test-session', true);
    const lesson = store.lessons().find((l) => l.id === 'test-session')!;
    auth.login('admin');
    expect(store.saveLesson({ ...lesson, studentIds: ['sofia', 'ana'] })).toBe('');
    auth.login('user');
    expect(store.notifyAbsence('test-session', false)).toContain('ya está cubierta');
  });
  it('only allows requests within each role quota and closes them when covered', () => {
    save();
    expect(
      store.requestReinforcement('test-session', { chico: 0, chica: 2, message: '' }),
    ).toContain('plazas libres');
    expect(
      store.requestReinforcement('test-session', { chico: 0, chica: 1, message: '¿Te apuntas?' }),
    ).toBe('');
    auth.login('user');
    expect(store.reserve('test-session')).toBe('');
    expect(store.lessons().find((l) => l.id === 'test-session')!.reinforcement.chica).toBe(0);
    expect(store.requestReinforcement('test-session', EMPTY_REQUEST())).toContain(
      'Solo administración',
    );
  });
  it('shows day reminders only to attending students and removes them when the session ends', () => {
    save(
      futureLesson({
        date: dayKey(new Date()),
        time: '18:00',
        room: 'Sala de prueba',
        teacherIds: [],
        studentIds: ['sofia'],
      }),
    );
    auth.login('user');
    expect(store.todayReminders()).toHaveLength(1);
    store.notifyAbsence('test-session', true);
    expect(store.todayReminders()).toHaveLength(0);
    store.notifyAbsence('test-session', false);
    expect(store.todayReminders()).toHaveLength(1);
    vi.setSystemTime(new Date(2026, 8, 21, 19));
    vi.advanceTimersByTime(30000);
    expect(store.todayReminders()).toHaveLength(0);
  });
  it('updates reminders across midnight without reopening the app', () => {
    save(
      futureLesson({
        date: '2026-09-22',
        time: '21:00',
        studentIds: ['sofia'],
        room: 'Sala especial',
      }),
    );
    auth.login('user');
    expect(store.todayReminders()).toHaveLength(0);
    vi.setSystemTime(new Date(2026, 8, 22, 0));
    vi.advanceTimersByTime(30000);
    expect(store.todayReminders()).toHaveLength(1);
  });
  it('migrates stored classes without deleting reservations or guessing roles for custom students', () => {
    const lesson = futureLesson({ capacity: 2, studentIds: ['sofia', 'lucas'] });
    localStorage.setItem(
      'arete.classroom.demo.v1',
      JSON.stringify({
        version: 1,
        students: [
          ...store.students().map(({ danceRole, ...s }) => s),
          { id: 'custom', name: 'Alex', email: 'alex@example.com' },
        ],
        lessons: [{ ...lesson, teacherId: 'paula' }],
      }),
    );
    TestBed.resetTestingModule();
    store = TestBed.inject(ClassroomService);
    const migrated = store.lessons().find((item) => item.id === 'test-session')!;
    expect(migrated.teacherIds).toEqual(['paula']);
    expect(migrated.studentIds).toEqual(['sofia', 'lucas']);
    expect(migrated.roleCapacity).toEqual({ chico: 1, chica: 1 });
    expect(store.studentRole('custom')).toBeNull();
  });
  it('validates student roles and does not change role beyond class capacity', () => {
    save(futureLesson({ studentIds: ['sofia', 'lucas'] }));
    expect(store.setStudentRole('sofia', 'chico')).toContain('supera');
    expect(store.addStudent('Test', 'bad', 'chico')).toContain('válido');
    expect(store.addStudent('Test', 'SOFIA@EXAMPLE.COM', 'chica')).toContain('Ya existe');
    expect(store.addStudent('Nueva alumna', 'nueva@example.com', 'chica')).toBe('');
  });
  it('creates a student and enrolls them in every upcoming session of selected weekly classes', () => {
    auth.login('admin');
    expect(
      store.addStudent('Clara Torres', 'clara@example.com', 'chica', [
        'lunes-18',
        'miercoles-20',
      ]),
    ).toBe('');
    const student = store.students().find((item) => item.email === 'clara@example.com')!;
    const selected = store
      .lessons()
      .filter((lesson) => ['lunes-18', 'miercoles-20'].includes(lesson.weeklyClassId ?? ''));
    expect(selected.length).toBeGreaterThan(1);
    expect(selected.every((lesson) => lesson.studentIds.includes(student.id))).toBe(true);
    expect(
      store
        .lessons()
        .filter((lesson) => lesson.weeklyClassId === 'martes-17')
        .every((lesson) => !lesson.studentIds.includes(student.id)),
    ).toBe(true);
  });
  it('loads every schedule teacher once and lets administration edit their profile', () => {
    expect(store.teachers()).toHaveLength(10);
    expect(new Set(store.teachers().map((teacher) => teacher.name)).size).toBe(10);
    auth.login('admin');
    const ruben = store.teachers().find((teacher) => teacher.id === 'ruben')!;
    expect(
      store.saveTeacher({
        ...ruben,
        name: 'Rubén García',
        email: 'ruben@arete.test',
        phone: '600 123 123',
      }),
    ).toBe('');
    expect(store.teacherName('ruben')).toBe('Rubén García');
    expect(store.saveTeacher({ ...ruben, email: 'correo-invalido' })).toContain('correo');
    TestBed.resetTestingModule();
    store = TestBed.inject(ClassroomService);
    expect(store.teachers().find((teacher) => teacher.id === 'ruben')).toMatchObject({
      name: 'Rubén García',
      email: 'ruben@arete.test',
      phone: '600 123 123',
    });
  });
  it('updates a fixed class and propagates its content without losing enrollments', () => {
    auth.login('admin');
    expect(store.addStudent('Clara', 'clara@example.com', 'chica', ['lunes-18'])).toBe('');
    const studentId = store.students().find((student) => student.email === 'clara@example.com')!.id;
    const fixedClass = store.fixedClasses().find((lesson) => lesson.id === 'lunes-18')!;
    expect(
      store.saveFixedClass({
        ...fixedClass,
        day: 4,
        time: '18:00',
        name: 'Salsa renovada',
        level: 'Todos los niveles',
        duration: 75,
        room: 'Sala principal',
        roleCapacity: { chico: 8, chica: 12 },
      }),
    ).toBe('');
    expect(store.fixedClasses().find((lesson) => lesson.id === 'lunes-18')).toMatchObject({
      day: 4,
      name: 'Salsa renovada',
      duration: 75,
      room: 'Sala principal',
    });
    const sessions = store.lessons().filter((lesson) => lesson.weeklyClassId === 'lunes-18');
    expect(sessions.length).toBeGreaterThan(1);
    expect(
      sessions.every(
        (lesson) =>
          new Date(`${lesson.date}T12:00:00`).getDay() === 5 &&
          lesson.name === 'Salsa renovada' &&
          lesson.studentIds.includes(studentId),
      ),
    ).toBe(true);
  });
  it('keeps asking for today attendance until the student chooses one of the three responses', () => {
    save(
      futureLesson({
        date: dayKey(new Date()),
        time: '18:00',
        room: 'Sala de confirmación',
        teacherIds: [],
        studentIds: ['sofia'],
      }),
    );
    auth.login('user');
    expect(store.todayPendingResponses().map((lesson) => lesson.id)).toContain('test-session');
    expect(store.respondAttendance('test-session', 'unsure')).toBe('');
    expect(store.todayPendingResponses().map((lesson) => lesson.id)).not.toContain('test-session');
    expect(store.attendanceResponse(store.lessons().find((lesson) => lesson.id === 'test-session')!, 'sofia')).toBe(
      'unsure',
    );
    expect(store.respondAttendance('test-session', 'not-going')).toBe('');
    expect(store.lessons().find((lesson) => lesson.id === 'test-session')!.absenceIds).toContain(
      'sofia',
    );
    expect(store.respondAttendance('test-session', 'going')).toBe('');
    expect(store.lessons().find((lesson) => lesson.id === 'test-session')!.absenceIds).not.toContain(
      'sofia',
    );
  });
});
