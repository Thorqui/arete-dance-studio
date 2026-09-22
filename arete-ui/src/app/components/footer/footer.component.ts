import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CmsService } from '../../services/cms.service';
import { CookieConsentService } from '../../services/cookie-consent';

@Component({
    selector: 'app-footer',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
    cms = inject(CmsService);
    consentService = inject(CookieConsentService);
    currentYear = new Date().getFullYear();
}
