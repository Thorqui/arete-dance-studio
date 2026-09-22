import { PushRemindersService } from '../../services/push-reminders';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth';
import { ChatAudience, ChatMessage, InternalChatService } from '../../services/internal-chat';
import {
  WebsiteContentService,
  WebsiteHighlight,
  WebsitePoster,
} from '../../services/website-content';
import {
  ClassroomService,
  Lesson,
  DanceRole,
  AttendanceResponse,
  Teacher,
  Reinforcement,
  EMPTY_REQUEST,
  dayKey,
} from '../../services/classroom';
import { WeeklyClass } from '../../data/weekly-schedule';

@Component({
  selector: 'app-campus',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, A11yModule],
  templateUrl: './campus.html',
  styleUrls: [
    './campus.scss',
    './campus-forms.scss',
    './campus-participation.scss',
    './campus-theme.scss',
    './campus-chat.scss',
    './campus-mobile.scss',
  ],
})
export class Campus {
  auth = inject(AuthService);
  store = inject(ClassroomService);
  push = inject(PushRemindersService);
  chat = inject(InternalChatService);
  websiteContent = inject(WebsiteContentService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private params = toSignal(this.route.paramMap);
  section = computed(() => this.params()?.get('section') ?? 'inicio');
  roleLabel = computed(() =>
    this.auth.isAdmin() ? 'Administración' : this.auth.isTeacher() ? 'Profesor' : 'Alumno',
  );
  name = computed(() =>
    this.auth.isAdmin() ? 'Elena' : this.auth.isTeacher() ? 'Rubén' : 'Sofía',
  );
  get today(): string {
    return dayKey(new Date(this.store.now()));
  }
  selectedDay = signal(this.today);
  month = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  monthTitle = computed(() =>
    new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(this.month()),
  );
  monthDays = computed(() => {
    const first = this.month();
    const offset = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(first.getFullYear(), first.getMonth(), i - offset + 1);
      return {
        key: dayKey(date),
        number: date.getDate(),
        current: date.getMonth() === first.getMonth(),
      };
    });
  });
  visibleLessons = computed(() =>
    this.store
      .lessons()
      .filter((l) => !this.auth.isTeacher() || l.teacherIds.includes(this.store.teacherId)),
  );
  myLessons = computed(() =>
    this.visibleLessons().filter(
      (l) => !this.auth.isUser() || l.studentIds.includes(this.store.studentId),
    ),
  );
  available = computed(() =>
    this.visibleLessons().filter(
      (l) =>
        !this.store.isPast(l) &&
        !l.studentIds.includes(this.store.studentId) &&
        this.store.availableForStudent(l) > 0,
    ),
  );
  upcoming = computed(() =>
    this.myLessons().filter(
      (l) => !this.store.isPast(l) && (!this.auth.isUser() || !this.absent(l)),
    ),
  );
  selectedLessons = computed(() =>
    this.visibleLessons().filter(
      (lesson) =>
        lesson.date === this.selectedDay() &&
        (!this.auth.isUser() || !this.calendarMineOnly() || this.booked(lesson)),
    ),
  );
  calendarMineOnly = signal(false);
  mobileDayOpen = signal(false);
  todayManagedLessons = computed(() =>
    this.visibleLessons().filter(
      (lesson) => lesson.date === this.today && !this.store.isPast(lesson),
    ),
  );
  notice = signal('');
  error = signal('');
  editing = signal(false);
  draft: Lesson = this.emptyLesson();
  pendingDelete = signal<string | null>(null);
  pendingCancel = signal<string | null>(null);
  rosterId = signal<string | null>(null);
  roster = computed(() => this.visibleLessons().find((l) => l.id === this.rosterId()));
  studentSearch = signal('');
  filteredStudents = computed(() =>
    this.store
      .students()
      .filter((s) =>
        `${s.name} ${s.email}`.toLowerCase().includes(this.studentSearch().toLowerCase()),
      ),
  );
  studentName = '';
  studentEmail = '';
  studentDanceRole: DanceRole = 'chica';
  studentEditorOpen = signal(false);
  studentWeeklyClassIds: string[] = [];
  teacherEditorOpen = signal(false);
  teacherDraft: Teacher = this.emptyTeacher();
  readonly weekdayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  fixedClasses = computed(() =>
    this.store.fixedClasses().filter(
      (lesson) => !this.auth.isTeacher() || lesson.teacherIds.includes(this.store.teacherId),
    ),
  );
  fixedClassEditorOpen = signal(false);
  fixedClassDraft: WeeklyClass | null = null;
  managementPanel = signal<'classes' | 'students' | 'teachers' | null>(null);
  requestDraft: Reinforcement = EMPTY_REQUEST();
  pendingAbsence = signal<string | null>(null);
  requests = computed(() =>
    this.visibleLessons().filter(
      (l) => this.store.needed(l, 'chico') + this.store.needed(l, 'chica') > 0,
    ),
  );
  chatTarget = signal<ChatAudience>('all');
  chatSearch = signal('');
  chatTargets = computed(() => this.chat.adminTargets(this.chatSearch()));
  chatMessage = '';
  chatAlert = signal<ChatMessage | null>(null);
  conversation = computed(() => this.chat.conversation(this.chatTarget()));
  readonly weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  websiteDraft: WebsiteHighlight = { ...this.websiteContent.highlight() };
  posterDraft: WebsitePoster = { ...this.websiteContent.poster() };
  posterImageName = '';

  constructor() {
    effect(() => {
      const section = this.section();
      const firstUnread = this.chat.unread()[0] ?? null;
      if (section === 'chat') {
        if (firstUnread) this.chat.markAllRead();
        this.chatAlert.set(null);
      } else if (firstUnread) {
        this.chatAlert.set(firstUnread);
      } else {
        this.chatAlert.set(null);
      }
    });
  }
  dateLabel(day: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(`${day}T12:00:00`));
  }
  shortDate(day: string): string {
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(
      new Date(`${day}T12:00:00`),
    );
  }
  dayLessons(day: string): Lesson[] {
    return this.visibleLessons().filter(
      (lesson) =>
        lesson.date === day &&
        (!this.auth.isUser() || !this.calendarMineOnly() || this.booked(lesson)),
    );
  }
  booked(lesson: Lesson): boolean {
    return lesson.studentIds.includes(this.store.studentId);
  }
  moveMonth(step: number): void {
    const m = this.month();
    this.month.set(new Date(m.getFullYear(), m.getMonth() + step, 1));
  }
  selectCalendarDay(day: string): void {
    this.selectedDay.set(day);
    if (window.matchMedia('(max-width: 700px)').matches) this.mobileDayOpen.set(true);
  }
  goToday(): void {
    this.month.set(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    this.selectedDay.set(this.today);
  }
  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
  reserve(lesson: Lesson): void {
    this.result(this.store.reserve(lesson.id), `Tu plaza en ${lesson.name} está reservada.`);
  }
  cancel(id: string): void {
    this.result(
      this.store.cancelReservation(id),
      'Reserva cancelada. La plaza vuelve a estar disponible.',
    );
    this.pendingCancel.set(null);
  }
  openNew(): void {
    this.draft = this.emptyLesson();
    this.error.set('');
    this.notice.set('');
    this.editing.set(true);
  }
  edit(lesson: Lesson): void {
    this.mobileDayOpen.set(false);
    this.draft = {
      ...lesson,
      roleCapacity: { ...lesson.roleCapacity },
      teacherIds: [...lesson.teacherIds],
      absenceIds: [...lesson.absenceIds],
      reinforcement: { ...lesson.reinforcement },
      studentIds: [...lesson.studentIds],
      attendance: { ...lesson.attendance },
    };
    this.error.set('');
    this.editing.set(true);
  }
  saveLesson(): void {
    const error = this.store.saveLesson(this.draft);
    this.result(
      error,
      this.draft.id ? 'Clase actualizada.' : 'Clase creada. Ya está en el calendario.',
    );
    if (!error) {
      this.selectedDay.set(this.draft.date);
      this.month.set(new Date(`${this.draft.date.slice(0, 7)}-01T12:00:00`));
      this.editing.set(false);
    }
  }
  deleteLesson(id: string): void {
    this.result(this.store.deleteLesson(id), 'Clase eliminada y plazas liberadas.');
    this.pendingDelete.set(null);
  }
  toggleStudent(id: string): void {
    this.draft.studentIds = this.draft.studentIds.includes(id)
      ? this.draft.studentIds.filter((s) => s !== id)
      : [...this.draft.studentIds, id];
    if (!this.draft.studentIds.includes(id)) {
      delete this.draft.attendance[id];
      this.draft.absenceIds = this.draft.absenceIds.filter((s) => s !== id);
    }
  }
  addStudent(): void {
    const error = this.store.addStudent(
      this.studentName,
      this.studentEmail,
      this.studentDanceRole,
      this.studentWeeklyClassIds,
    );
    this.result(
      error,
      this.studentWeeklyClassIds.length
        ? 'Alumno añadido e inscrito en sus clases semanales.'
        : 'Alumno añadido. Puedes asignarle clases más adelante.',
    );
    if (!error) {
      this.studentName = '';
      this.studentEmail = '';
      this.studentWeeklyClassIds = [];
      this.studentEditorOpen.set(false);
    }
  }
  openStudentEditor(): void {
    this.studentName = '';
    this.studentEmail = '';
    this.studentDanceRole = 'chica';
    this.studentWeeklyClassIds = [];
    this.error.set('');
    this.notice.set('');
    this.studentEditorOpen.set(true);
  }
  closeStudentEditor(): void {
    this.studentEditorOpen.set(false);
    this.error.set('');
  }
  toggleStudentWeeklyClass(id: string): void {
    this.studentWeeklyClassIds = this.studentWeeklyClassIds.includes(id)
      ? this.studentWeeklyClassIds.filter((classId) => classId !== id)
      : [...this.studentWeeklyClassIds, id];
  }
  weeklyTeachers(ids: string[]): string {
    return ids.map((id) => this.store.teacherName(id)).join(' y ') || 'Profesor por confirmar';
  }
  openTeacherEditor(teacher?: Teacher): void {
    this.teacherDraft = teacher ? { ...teacher } : this.emptyTeacher();
    this.error.set('');
    this.notice.set('');
    this.teacherEditorOpen.set(true);
  }
  closeTeacherEditor(): void {
    this.teacherEditorOpen.set(false);
    this.error.set('');
  }
  saveTeacher(): void {
    const editing = Boolean(this.teacherDraft.id);
    const error = this.store.saveTeacher(this.teacherDraft);
    this.result(error, editing ? 'Datos del profesor actualizados.' : 'Profesor añadido.');
    if (!error) this.teacherEditorOpen.set(false);
  }
  teacherClasses(id: string): number {
    return this.store.fixedClasses().filter((lesson) => lesson.teacherIds.includes(id)).length;
  }
  openFixedClassEditor(lesson: WeeklyClass): void {
    this.fixedClassDraft = {
      ...lesson,
      teacherIds: [...lesson.teacherIds],
      roleCapacity: { ...lesson.roleCapacity },
    };
    this.error.set('');
    this.notice.set('');
    this.fixedClassEditorOpen.set(true);
  }
  closeFixedClassEditor(): void {
    this.fixedClassEditorOpen.set(false);
    this.fixedClassDraft = null;
    this.error.set('');
  }
  saveFixedClass(): void {
    if (!this.fixedClassDraft) return;
    const error = this.store.saveFixedClass(this.fixedClassDraft);
    this.result(error, 'Clase fija actualizada en el horario y en sus próximas sesiones.');
    if (!error) this.closeFixedClassEditor();
  }
  toggleFixedClassTeacher(id: string): void {
    if (!this.fixedClassDraft) return;
    this.fixedClassDraft.teacherIds = this.fixedClassDraft.teacherIds.includes(id)
      ? this.fixedClassDraft.teacherIds.filter((teacherId) => teacherId !== id)
      : [...this.fixedClassDraft.teacherIds, id];
  }
  toggleManagementPanel(panel: 'classes' | 'students' | 'teachers'): void {
    this.managementPanel.update((current) => (current === panel ? null : panel));
  }
  attendance(lessonId: string, studentId: string, value: 'present' | 'absent'): void {
    this.result(this.store.setAttendance(lessonId, studentId, value), 'Asistencia guardada.');
  }
  studentClasses(id: string): number {
    return this.store.lessons().filter((l) => l.studentIds.includes(id) && !this.store.isPast(l))
      .length;
  }
  absent(lesson: Lesson): boolean {
    return lesson.absenceIds.includes(this.store.studentId);
  }
  notifyAbsence(lesson: Lesson, absent: boolean): void {
    this.result(
      this.store.notifyAbsence(lesson.id, absent),
      absent
        ? 'Falta avisada. Tu profesor la verá y la plaza queda libre para esta sesión.'
        : 'Asistencia recuperada. Vuelves a tener tu plaza.',
    );
    this.pendingAbsence.set(null);
  }
  respondAttendance(lesson: Lesson, response: AttendanceResponse): void {
    const messages: Record<AttendanceResponse, string> = {
      going: 'Has confirmado que vas a clase.',
      'not-going': 'Has avisado de que no puedes asistir.',
      unsure: 'Has indicado que todavía no lo sabes.',
    };
    this.result(this.store.respondAttendance(lesson.id, response), messages[response]);
  }
  responseStudents(lesson: Lesson, response: AttendanceResponse | null): string[] {
    return lesson.studentIds
      .filter((id) => this.store.attendanceResponse(lesson, id) === response)
      .map((id) => this.store.studentName(id));
  }
  toggleTeacher(id: string): void {
    this.draft.teacherIds = this.draft.teacherIds.includes(id)
      ? this.draft.teacherIds.filter((t) => t !== id)
      : [...this.draft.teacherIds, id];
  }
  openRoster(lesson: Lesson): void {
    this.mobileDayOpen.set(false);
    this.rosterId.set(lesson.id);
    this.requestDraft = { ...lesson.reinforcement };
    this.error.set('');
    this.notice.set('');
  }
  publishRequest(lesson: Lesson): void {
    this.result(
      this.store.requestReinforcement(lesson.id, this.requestDraft),
      this.requestDraft.chico + this.requestDraft.chica
        ? 'Solicitud publicada. Los alumnos pueden apuntarse desde Inicio o Calendario.'
        : 'Solicitud retirada.',
    );
  }
  withdrawRequest(lesson: Lesson): void {
    this.requestDraft = EMPTY_REQUEST();
    this.publishRequest(lesson);
  }
  changeStudentRole(id: string, role: DanceRole): void {
    this.result(this.store.setStudentRole(id, role), 'Tipo de plaza actualizado.');
  }
  saveWebsiteContent(): void {
    const error = this.websiteContent.save(this.websiteDraft);
    this.result(error, error ? '' : 'Contenido publicado en la web.');
  }
  clearWebsiteContent(): void {
    this.websiteDraft = this.websiteContent.empty();
    const error = this.websiteContent.save(this.websiteDraft);
    this.result(error, error ? '' : 'Contenido retirado. La web vuelve a quedar como estaba.');
  }
  saveWebsitePoster(): void {
    const error = this.websiteContent.savePoster(this.posterDraft);
    this.result(error, error ? '' : 'Cartel publicado en la web.');
  }
  clearWebsitePoster(): void {
    this.posterDraft = this.websiteContent.emptyPoster();
    this.posterImageName = '';
    const error = this.websiteContent.savePoster(this.posterDraft);
    this.result(error, error ? '' : 'Cartel retirado de la web.');
  }
  uploadWebsiteImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.result('Selecciona un archivo de imagen.', '');
      input.value = '';
      return;
    }
    if (file.size > 1_500_000) {
      this.result('La imagen no puede superar 1,5 MB en esta maqueta.', '');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      this.posterDraft = { ...this.posterDraft, image: reader.result };
      this.posterImageName = file.name;
      this.error.set('');
    };
    reader.onerror = () => this.result('No se ha podido leer la imagen.', '');
    reader.readAsDataURL(file);
  }
  selectChatChannel(channel: ChatAudience): void {
    this.chatTarget.set(channel);
    this.chat.markAllRead();
  }
  sendChatMessage(): void {
    const error = this.chat.send(this.chatTarget(), this.chatMessage);
    this.result(error, error ? '' : 'Mensaje enviado.');
    if (!error) this.chatMessage = '';
  }
  toggleChat(enabled: boolean): void {
    this.result(
      this.chat.setEnabled(enabled),
      enabled ? 'Chat activado para toda la academia.' : 'Chat desactivado para toda la academia.',
    );
    if (enabled) this.chat.markAllRead();
  }
  closeChatAlert(): void {
    this.chat.markAllRead();
    this.chatAlert.set(null);
  }
  private result(error: string, success: string): void {
    this.error.set(error);
    this.notice.set(error ? '' : success);
  }
  private emptyLesson(): Lesson {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      id: '',
      name: '',
      level: 'Iniciación',
      date: this.selectedDay() > this.today ? this.selectedDay() : dayKey(tomorrow),
      time: '18:00',
      duration: 60,
      capacity: 12,
      teacherIds: ['ruben'],
      roleCapacity: { chico: 6, chica: 6 },
      absenceIds: [],
      reinforcement: EMPTY_REQUEST(),
      room: 'Sala 1',
      studentIds: [],
      attendance: {},
    };
  }
  private emptyTeacher(): Teacher {
    return { id: '', name: '', email: '', phone: '' };
  }
}
