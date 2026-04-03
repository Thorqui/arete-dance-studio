import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CmsService } from '../../services/cms.service';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.scss']
})
export class ScheduleComponent {
  cms = inject(CmsService);
}
