import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CmsService } from '../../services/cms.service';

@Component({
  selector: 'app-styles',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './styles.component.html',
  styleUrls: ['./styles.component.scss']
})
export class StylesComponent {
  cms = inject(CmsService);
  /* Nombre de la pestaña activa.
     Valores posibles: 'bachata' | 'salsa' | 'comercial' | 'ladys'
     Modifica el valor inicial para cambiar qué estilo aparece por defecto */
  activeTab: string = 'bachata';

  /* Cambia la pestaña activa cuando el usuario hace click */
  setActive(tab: string): void {
    this.activeTab = tab;
  }
}
