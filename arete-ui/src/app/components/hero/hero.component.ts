import { Component, AfterViewInit, ElementRef, ViewChild, inject } from '@angular/core';
import { CmsService } from '../../services/cms.service';
import { CommonModule } from '@angular/common';
import { AboutComponent } from '../about/about.component';
import { StylesComponent } from '../styles/styles.component';
import { ScheduleComponent } from '../schedule/schedule.component';
import { ContactComponent } from '../contact/contact.component';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [
    CommonModule,
    AboutComponent,
    StylesComponent,
    ScheduleComponent,
    ContactComponent
  ],
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss']
})
export class HeroComponent implements AfterViewInit {

  @ViewChild('heroVideo') heroVideoRef!: ElementRef<HTMLVideoElement>;

  /** Instancia inyectada del servicio CMS para acceder a la data dinámica de forma reactiva */
  public cms = inject(CmsService);

  /** True si el navegador no puede reproducir el vídeo (fallback a imagen de fondo) */
  videoFailed = false;

  ngAfterViewInit(): void {
    const video = this.heroVideoRef?.nativeElement;
    if (!video) return;

    // Forzar la carga del vídeo y reproducción programática
    // — soluciona el bug de Angular/Chrome donde el atributo autoplay
    //   no siempre se ejecuta en el primer ciclo de detección de cambios.
    video.muted = true;
    video.load();

    const tryPlay = () => {
      video.play().catch(() => {
        // Si el navegador bloquea el autoplay incluso con muted, marcamos fallback
        this.videoFailed = true;
      });
    };

    if (video.readyState >= 2) {
      // El vídeo ya tiene datos suficientes
      tryPlay();
    } else {
      video.addEventListener('canplay', tryPlay, { once: true });
      // Timeout de seguridad: si en 5s no carga, activa el fallback
      setTimeout(() => {
        if (video.paused) {
          tryPlay();
        }
      }, 5000);
    }
  }
}
