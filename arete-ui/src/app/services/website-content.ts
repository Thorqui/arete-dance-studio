import { Injectable, signal } from '@angular/core';

export interface WebsiteHighlight {
  title: string;
  body: string;
  linkLabel: string;
  linkUrl: string;
}

export interface WebsitePoster {
  image: string;
  position: 'above' | 'below';
}

const HIGHLIGHT_KEY = 'arete.website-highlight.v1';
const POSTER_KEY = 'arete.website-poster.v1';
const EMPTY_HIGHLIGHT: WebsiteHighlight = { title: '', body: '', linkLabel: '', linkUrl: '' };
const EMPTY_POSTER: WebsitePoster = { image: '', position: 'above' };

@Injectable({ providedIn: 'root' })
export class WebsiteContentService {
  highlight = signal<WebsiteHighlight>(this.restoreHighlight());
  poster = signal<WebsitePoster>(this.restorePoster());

  empty(): WebsiteHighlight {
    return { ...EMPTY_HIGHLIGHT };
  }

  emptyPoster(): WebsitePoster {
    return { ...EMPTY_POSTER };
  }

  hasContent(): boolean {
    const content = this.highlight();
    return Boolean(content.title.trim() || content.body.trim());
  }

  hasPoster(): boolean {
    return Boolean(this.poster().image.trim());
  }

  save(content: WebsiteHighlight): string {
    const cleaned: WebsiteHighlight = {
      title: content.title.trim(),
      body: content.body.trim(),
      linkLabel: content.linkLabel.trim(),
      linkUrl: content.linkUrl.trim(),
    };
    if (cleaned.linkLabel && !cleaned.linkUrl) return 'Añade el enlace del botón o déjalo vacío.';
    this.highlight.set(cleaned);
    return this.persist(HIGHLIGHT_KEY, cleaned);
  }

  savePoster(poster: WebsitePoster): string {
    const cleaned: WebsitePoster = {
      image: poster.image.trim(),
      position: poster.position === 'below' ? 'below' : 'above',
    };
    this.poster.set(cleaned);
    return this.persist(POSTER_KEY, cleaned);
  }

  private restoreHighlight(): WebsiteHighlight {
    const value = this.read(HIGHLIGHT_KEY);
    if (!value) return { ...EMPTY_HIGHLIGHT };
    const item = value as Partial<WebsiteHighlight>;
    if (
      [item.title, item.body, item.linkLabel, item.linkUrl].every(
        (field) => field === undefined || typeof field === 'string',
      )
    ) {
      return { ...EMPTY_HIGHLIGHT, ...item };
    }
    return { ...EMPTY_HIGHLIGHT };
  }

  private restorePoster(): WebsitePoster {
    const saved = this.read(POSTER_KEY) as Partial<WebsitePoster> | null;
    if (
      saved &&
      (saved.image === undefined || typeof saved.image === 'string') &&
      (saved.position === undefined || saved.position === 'above' || saved.position === 'below')
    ) {
      return { ...EMPTY_POSTER, ...saved };
    }

    // Migrate posters saved while image and text shared the same prototype block.
    const legacy = this.read(HIGHLIGHT_KEY) as { image?: unknown; imagePosition?: unknown } | null;
    if (legacy && typeof legacy.image === 'string') {
      return {
        image: legacy.image,
        position: legacy.imagePosition === 'below' ? 'below' : 'above',
      };
    }
    return { ...EMPTY_POSTER };
  }

  private read(key: string): object | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      return value && typeof value === 'object' ? value : null;
    } catch {
      return null;
    }
  }

  private persist(key: string, value: object): string {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return '';
    } catch {
      return 'El contenido se muestra ahora, pero el navegador no ha podido guardarlo.';
    }
  }
}
