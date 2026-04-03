import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CmsSection {
  slug: string;
  content: any;
}

@Injectable({
  providedIn: 'root'
})
export class CmsService {
  private apiUrl = `${environment.apiUrl}/api/cms`;
  private baseUrl = environment.apiUrl;

  // State signals for components to consume reactively
  heroData = signal<any>(null);
  aboutData = signal<any>(null);
  stylesData = signal<any>(null);
  scheduleData = signal<any>(null);
  footerData = signal<any>(null);
  pwaConfigData = signal<any>(null);

  constructor(private http: HttpClient) {}

  loadCmsData() {
    return this.http.get<CmsSection[]>(this.apiUrl).pipe(
      tap((sections: CmsSection[]) => {
        const hero = sections.find(s => s.slug === 'hero');
        const about = sections.find(s => s.slug === 'about');
        const styles = sections.find(s => s.slug === 'styles');
        const schedule = sections.find(s => s.slug === 'schedule');
        const footer = sections.find(s => s.slug === 'footer');
        const pwa = sections.find(s => s.slug === 'pwa-config');

        if (hero) this.heroData.set(hero.content);
        if (about) this.aboutData.set(about.content);
        if (styles) this.stylesData.set(styles.content);
        if (schedule) this.scheduleData.set(schedule.content);
        if (footer) this.footerData.set(footer.content);
        if (pwa) this.pwaConfigData.set(pwa.content);
      }),
      catchError(err => {
        console.error('Error loading CMS data:', err);
        return of([]);
      })
    );
  }

  updateCmsData(slug: string, content: any) {
    return this.http.put<CmsSection>(`${this.apiUrl}/${slug}`, { slug, content }).pipe(
      tap((updated) => {
        if (slug === 'hero') this.heroData.set(updated.content);
        if (slug === 'about') this.aboutData.set(updated.content);
        if (slug === 'styles') this.stylesData.set(updated.content);
        if (slug === 'schedule') this.scheduleData.set(updated.content);
        if (slug === 'footer') this.footerData.set(updated.content);
        if (slug === 'pwa-config') this.pwaConfigData.set(updated.content);
      })
    );
  }

  // --- Usuarios y Clases (Fase 3/4) ---
  getUsers() { return this.http.get<any[]>(`${this.baseUrl}/api/users`); }
  getClasses() { return this.http.get<any[]>(`${this.baseUrl}/api/classes`); }
  getAvailableClasses() { return this.http.get<any[]>(`${this.baseUrl}/api/classes/available`); }
  createClass(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/classes`, data);
  }
  deleteClass(classId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/classes/${classId}`);
  }
  createUser(userData: any) { return this.http.post<any>(`${this.baseUrl}/api/users`, userData); }
  createBooking(bookingData: any) { return this.http.post<any>(`${this.baseUrl}/api/bookings`, bookingData); }

  // --- Grupos Fijos y Matrículas (Fase 5) ---
  getGroups() { return this.http.get<any[]>(`${this.baseUrl}/api/groups`); }
  createGroup(groupData: any) { return this.http.post<any>(`${this.baseUrl}/api/groups`, groupData); }
  enrollStudent(enrollmentData: any) { return this.http.post<any>(`${this.baseUrl}/api/enrollments`, enrollmentData); }
  getUserEnrollments(userId: number) { return this.http.get<any[]>(`${this.baseUrl}/api/users/${userId}/enrollments`); }

  // --- Soporte Directo / Chat (Fase 6) ---
  getChatHistory(user1Id: number, user2Id: number) { return this.http.get<any[]>(`${this.baseUrl}/api/messages/${user1Id}/${user2Id}`); }
  sendMessage(msgData: any) { return this.http.post<any>(`${this.baseUrl}/api/messages`, msgData); }
}
