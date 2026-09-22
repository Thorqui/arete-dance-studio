import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CookieConsentService } from '../../../services/cookie-consent';

@Component({
  selector: 'app-cookie-policy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookie-policy.component.html',
  styleUrls: ['./cookie-policy.component.scss'],
})
export class CookiePolicyComponent {
  consentService = inject(CookieConsentService);
}
