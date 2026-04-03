import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CmsService } from '../../services/cms.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  public cms = inject(CmsService);
}
