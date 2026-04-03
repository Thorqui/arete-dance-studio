# Estrategias de Embebido de Vídeo para la PWA de Arete

Cuando queremos mostrar vídeos de las clases o exhibiciones dentro de la aplicación sin que la web pese toneladas, usar enlaces (`<iframe>`) es nuestra mejor opción. A continuación te desgrano las mejores opciones comparadas:

## 1. Google Drive (Directo e "Invisible")
Es posible usar vídeos que subas a tu Google Drive para que se reproduzcan nativamente en la academia, aunque Drive es restrictivo.
- **Cómo**: Subes tu MP4 a Drive, le das acceso de lectura a "Cualquier persona con el enlace", extraes el `ID` del vídeo de ese enlace, y en el código usamos la estructura `<iframe src="https://drive.google.com/file/d/TU_ID/preview"></iframe>`.
- **Ventajas**: Gratis y privado (no pueden encontrarlo buscando por internet).
- **Desventajas**: El reproductor de Drive pinta barras de Google grises, y si mucha gente pulsa Play a la vez, Google bloquea la cuota de ancho de banda y sale un error 429 Limitado.

## 2. YouTube ("Oculto") 🥇 Nuestra Recomendación Gratuita
Usa YouTube subiendo vídeos marcados como **"Ocultos"** (Unlisted).
- **Cómo**: En YouTube Studio subes los bailes, e incluyes los enlaces como `https://www.youtube.com/embed/TU_ID`.
- **Ventajas**: Rápido, no caduca, soporta a miles de usuarios reproduciendo a la vez, se incrusta fácilmente. Angular se traga los Iframes de Youtube genial.
- **Desventajas**: Al final del vídeo salen sugerencias de Youtube (se puede intentar ocultar con parámetros `?rel=0`).

## 3. Vimeo PRO (Para puristas de la academia)
Es como Youtube pero más elegante y profesional. Cuesta dinero al mes, pero te permite eliminar TODOS los botones, marcas de agua, y que el reproductor sea de tu color Fucsia (`#DE4190`).

## 4. Hosting MP4 Nativo (Fuerza Bruta rápida)
Para clíps muy pequeños (menos de 5MB) o el vídeo "Hero" que se reproduce al fondo de tu web automáticamente, los seguimos subiendo directamente a tu servidor backend como `video.mp4` para usar la etiqueta nativa `<video autoplay loop>` de tu pantalla de inicio, porque son extremadamente rápidos.

**Veredicto / Tareas a seguir:**
En la sección "Estilos", donde el profesor pondrá el enlace, dile a tus profes que peguen enlaces de Youtube. Angular se encarga de convertirlos en un reproductor incrustado. Si es privado de tus alumnos, dile a los profes que lo marquen como "Oculto" al subirlo.
