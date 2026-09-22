import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CookieConsentService } from '../../services/cookie-consent';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookie-banner.component.html',
  styleUrls: ['./cookie-banner.component.scss'],
})
export class CookieBannerComponent {
  consentService = inject(CookieConsentService);

  customizing = signal(false);
  analyticsChoice = signal(false);
  marketingChoice = signal(false);

  get visible(): boolean {
    return !this.consentService.hasDecided || this.consentService.panelOpen();
  }

  startCustomize(): void {
    const current = this.consentService.consent();
    this.analyticsChoice.set(current?.analytics ?? false);
    this.marketingChoice.set(current?.marketing ?? false);
    this.customizing.set(true);
  }

  toggleAnalytics(): void {
    this.analyticsChoice.set(!this.analyticsChoice());
  }

  toggleMarketing(): void {
    this.marketingChoice.set(!this.marketingChoice());
  }

  acceptAll(): void {
    this.consentService.acceptAll();
    this.customizing.set(false);
  }

  rejectAll(): void {
    this.consentService.rejectAll();
    this.customizing.set(false);
  }

  savePreferences(): void {
    this.consentService.savePreferences(this.analyticsChoice(), this.marketingChoice());
    this.customizing.set(false);
  }

  cancelCustomize(): void {
    this.customizing.set(false);
    if (this.consentService.hasDecided) {
      this.consentService.closePreferences();
    }
  }
}
