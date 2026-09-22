import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { AuthService } from './services/auth';

describe('Application layout and campus access', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient()],
    }).compileComponents();
  });
  it('keeps the public header and footer on the website', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-header')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-footer')).toBeTruthy();
  });
  it('redirects anonymous campus visits to the three-profile login', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/campus/calendario');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(fixture.nativeElement.querySelector('app-header')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Soy profesor');
  });
  it('shows only the assigned teacher classes and no administration editor', async () => {
    TestBed.inject(AuthService).login('teacher');
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/campus/gestion');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Rubén');
    // Co-taught classes can display both teachers. Other teachers' classes remain hidden.
    const rows = fixture.nativeElement.querySelectorAll('.lesson-row');
    expect(
      Array.from(rows as NodeListOf<HTMLElement>).every((row) =>
        row.textContent?.includes('Rubén'),
      ),
    ).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('Crear clase');
    expect(fixture.nativeElement.querySelector('app-footer')).toBeNull();
  });
  it('shows one row per fixed weekly class and student management for administrators', async () => {
    TestBed.inject(AuthService).login('admin');
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/campus/gestion');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.fixed-class-list .lesson-row')).toHaveLength(0);
    fixture.nativeElement.querySelector('[aria-controls="management-classes"]').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.fixed-class-list .lesson-row')).toHaveLength(17);
    expect(fixture.nativeElement.textContent).toContain('Gestionar calendario');
    expect(fixture.nativeElement.textContent).not.toContain('91 clases');
    expect(fixture.nativeElement.textContent).toContain('Añadir alumno');
  });

  it('shows the global chat switch only to administrators', async () => {
    TestBed.inject(AuthService).login('admin');
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/campus/chat');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Chat para la academia');
    expect(fixture.nativeElement.textContent).toContain('Toda la academia');
  });

  it('lets students access Todos and Administración without the global switch', async () => {
    TestBed.inject(AuthService).login('user');
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/campus/chat');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Administración');
    expect(fixture.nativeElement.textContent).not.toContain('Chat para la academia');
  });
});
