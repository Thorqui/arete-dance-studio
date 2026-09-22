import { Injectable, signal } from '@angular/core';

export interface CookieConsent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
}

const CONSENT_KEY = 'arete.cookie-consent.v1';

@Injectable({ providedIn: 'root' })
export class CookieConsentService {
  consent = signal<CookieConsent | null>(this.restore());
  panelOpen = signal(false);

  get hasDecided(): boolean {
    return this.consent() !== null;
  }

  acceptAll(): void {
    this.save({ necessary: true, analytics: true, marketing: true, decidedAt: new Date().toISOString() });
  }

  rejectAll(): void {
    this.save({ necessary: true, analytics: false, marketing: false, decidedAt: new Date().toISOString() });
  }

  savePreferences(analytics: boolean, marketing: boolean): void {
    this.save({ necessary: true, analytics, marketing, decidedAt: new Date().toISOString() });
  }

  openPreferences(): void {
    this.panelOpen.set(true);
  }

  closePreferences(): void {
    this.panelOpen.set(false);
  }

  private save(consent: CookieConsent): void {
    this.consent.set(consent);
    this.panelOpen.set(false);
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    } catch {
      // localStorage no disponible (modo privado, etc.): la preferencia solo dura esta sesión.
    }
  }

  private restore(): CookieConsent | null {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      return raw ? (JSON.parse(raw) as CookieConsent) : null;
    } catch {
      return null;
    }
  }
}
