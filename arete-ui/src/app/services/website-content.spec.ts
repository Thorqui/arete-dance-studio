import { TestBed } from '@angular/core/testing';
import { WebsiteContentService } from './website-content';

describe('WebsiteContentService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('keeps the public block hidden while it is empty and persists published content', () => {
    let service = TestBed.inject(WebsiteContentService);
    expect(service.hasContent()).toBe(false);
    expect(
      service.save({
        title: 'Puertas abiertas',
        body: 'Ven a conocernos.',
        linkLabel: '',
        linkUrl: '',
      }),
    ).toBe('');
    expect(service.hasContent()).toBe(true);

    TestBed.resetTestingModule();
    service = TestBed.inject(WebsiteContentService);
    expect(service.highlight().title).toBe('Puertas abiertas');
  });

  it('requires a destination when the editor adds a button', () => {
    const service = TestBed.inject(WebsiteContentService);
    expect(
      service.save({
        title: 'Evento',
        body: '',
        linkLabel: 'Reservar',
        linkUrl: '',
      }),
    ).toContain('enlace');
  });

  it('stores the poster independently and keeps its position', () => {
    let service = TestBed.inject(WebsiteContentService);
    expect(service.hasPoster()).toBe(false);
    expect(service.savePoster({ image: 'data:image/png;base64,poster', position: 'below' })).toBe(
      '',
    );

    TestBed.resetTestingModule();
    service = TestBed.inject(WebsiteContentService);
    expect(service.hasPoster()).toBe(true);
    expect(service.poster().position).toBe('below');
    expect(service.hasContent()).toBe(false);
  });
});
