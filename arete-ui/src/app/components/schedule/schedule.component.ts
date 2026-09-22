import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CmsService } from '../../services/cms.service';
import { ClassroomService } from '../../services/classroom';
import { WeeklyClass } from '../../data/weekly-schedule';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.scss'],
})
export class ScheduleComponent {
  cms = inject(CmsService);
  classroom = inject(ClassroomService);
  readonly weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  readonly times = ['17:00', '18:00', '19:00', '20:00', '21:00'];
  classesAt(day: number, time: string): WeeklyClass[] {
    return this.classroom
      .fixedClasses()
      .filter((lesson) => lesson.day === day && lesson.slot === time);
  }

  teacherNames(lesson: WeeklyClass): string[] {
    return lesson.teacherIds.map((id) => this.classroom.teacherName(id));
  }
}
