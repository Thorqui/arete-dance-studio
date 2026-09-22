# Estado del proyecto Aretè Dance Studio

Actualizado: 22 de septiembre de 2026.

Este es el documento principal para retomar el proyecto en otra sesión. `RESUMEN_CONTINUACION.md` describe una fase anterior y puede contener información que ya no representa la maqueta actual.

## Ubicación y normas de trabajo

- Repositorio activo: `/Users/thorqui/dev/Antigravity/Arete/Arete final/Arete-web`
- Frontend Angular/PWA: `arete-ui`
- Backend FastAPI: `arete-api`
- Rama activa: `main`
- Último commit publicado: `6e0abfa` (`Solución definitiva: Calendario con datos fallback`)
- Hay muchos cambios locales sin commit. No hacer `commit`, `push` ni desplegar sin una petición expresa del usuario.
- El servidor local de Angular está detenido. El puerto `4200` no se dejó ejecutando.

## Estado funcional actual

### Web pública

- Mantiene la portada y la identidad visual de Aretè.
- Los colores del campus se han alineado con la web.
- Existe una sección de contenido editorial administrable entre la cabecera y “Quiénes somos”. Si no tiene contenido, la portada conserva su aspecto normal.
- Existe una sección independiente para publicar un cartel o imagen, con posición configurable por encima o por debajo del contenido editorial.
- La sección de horarios usa el formato semanal original, sin tarjetas internas.
- Muestra un rango fijo desde las 17:00 hasta la última clase.
- Solo muestra de lunes a viernes la hora, baile/nivel y profesores. No muestra fecha, sala, duración ni plazas.
- El horario público y las clases fijas del campus parten de la misma fuente de datos: `arete-ui/src/app/data/weekly-schedule.ts`.

### Campus PWA

- Entrada por `/login` y rutas principales `/campus/inicio`, `/campus/calendario`, `/campus/gestion` y `/campus/chat`.
- Perfiles contemplados en la maqueta: alumno, profesor y administrador.
- Navegación y diseño adaptados a móvil.
- Panel de inicio con información relevante según el rol.
- Calendario semanal con vista móvil a pantalla completa.
- En móvil, al tocar un día se abre un modal con las clases de ese día y las acciones disponibles.
- Selector “Mis clases” para resaltar o filtrar las clases del usuario con un fondo diferenciado.
- El alumno puede reservar, cancelar y responder a la asistencia diaria: “Voy”, “No puedo asistir” o “Aún no lo sé”.
- El aviso diario permanece visible hasta que el alumno selecciona una respuesta.
- Profesores asociados y administradores ven en Inicio tarjetas con quién va, quién falta, quién duda y quién está pendiente de responder.
- Las clases admiten plazas diferenciadas para chico y chica y hasta dos profesores.
- Profesor y administrador pueden solicitar refuerzo para completar una clase.

### Gestión

- La página está compactada en desplegables para Clases, Profesores y Alumnos.
- “Clases programadas” muestra una sola ficha por clase fija semanal, no una repetición por cada fecha.
- Una clase fija se puede crear y editar con el mismo conjunto de datos generales.
- La edición de una sesión concreta y la solicitud de refuerzo se realizan desde Calendario.
- El administrador puede crear alumnos y asignar roles de alumno o profesor.
- Están precargados, sin nombres duplicados, los profesores que aparecen en el horario: Rubén, Paula, Igor, Mónica/Moni, Pablo, María, Juan, Kiko, Javi y Rebeca. Los datos se pueden modificar desde Gestión.

### Chat y avisos

- Hay chat interno con mensajes individuales, búsqueda de destinatarios y mensajes dirigidos a grupos de clase.
- El administrador puede activar o desactivar el chat.
- Los mensajes pendientes se muestran mediante aviso/modal en la maqueta.
- Hay avisos internos de clase y una integración Web Push preparada para recibir notificaciones con la PWA cerrada.

## Horario fijo cargado

- Lunes: 18:00 Salsa Línea Inicio (Rubén y Paula); 19:00 Bachata Sensual Intermedio (Rubén y Paula).
- Martes: 17:00 Competición Kids (Paula); 18:00 Sexy Style (Paula) y Men Style (Igor); 19:00 Bachata Sensual Intermedio/Avanzado (Igor y Mónica); 20:00 Coreográfico Lady Bachata (Moni); 21:00 Bachata & Roze.
- Miércoles: 18:00 Salsa Cubana Intermedio (Pablo y María); 19:00 Salsa Línea Intermedio (Pablo y Moni); 20:00 Bachata Sensual Intermedio 2 (Rubén y Moni); 21:00 Bachata Inicio (Rubén y María).
- Jueves: 18:00 Bachata Inicio (Juan y Paula); 19:00 Salsa Cubana Inicio (Kiko y Paula); 20:00 Bachata Sensual Inicio 2 Plus (Javi y Moni); 21:00 Bachata Sensual Avanzado (Javi y Moni).
- Viernes: 19:30 Bachata + Salsa Cubana Inicio (Kiko y Rebeca).

Antes de modificar nombres o normalizar “Mónica/Moni”, confirmar con el usuario si representan a la misma persona. La maqueta actual sigue la información facilitada durante la sesión.

## Persistencia y límites de la maqueta

- La nueva experiencia del campus usa servicios del frontend y almacenamiento local para buena parte de las clases, usuarios, contenido editable, chat y asistencia.
- Esto permite probar el flujo completo en un navegador, pero todavía no convierte esas operaciones en datos compartidos entre móviles o usuarios reales.
- El backend existente tiene FastAPI, SQLAlchemy y endpoints anteriores de usuarios, clases, grupos, reservas, chat y CMS, pero aún hay que unificar el nuevo campus con esa API y con autenticación real.
- La autenticación actual sigue siendo de maqueta. No se debe considerar segura para producción ni usar con datos personales reales.
- El siguiente bloque importante de trabajo es llevar usuarios, roles, matrículas, clases, asistencia, chat y contenido editable a la base de datos; después, vincular todo a la sesión autenticada.

## Recordatorios Push

El frontend y el backend contienen la base técnica de Web Push:

- Servicio PWA de suscripción y sincronización.
- Endpoints FastAPI de configuración, alta, actualización, baja y envío.
- Tabla `push_devices` mediante `arete-api/init_push_db.py`.
- Generador de claves VAPID en `arete-api/generate_vapid_keys.py`.
- Cron diario de Vercel a las 07:00 UTC en `arete-api/vercel.json`.
- Pruebas del backend en `arete-api/test_push_reminders.py`.

Para activarlo en producción hay que seguir `PUSH_NOTIFICATIONS_SETUP.md`, crear la tabla y configurar en el proyecto Vercel del backend:

- `PUSH_DEMO_ENABLED=true`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `CRON_SECRET`

La identidad usada por Push sigue vinculada a la maqueta local. Antes del uso real debe asociarse al usuario autenticado del backend.

## Comprobaciones realizadas

El 22 de septiembre de 2026:

- `npm test`: correcto, 5 archivos y 39 pruebas superadas.
- Build de producción con Node `22.22.0`: correcto.
- El build muestra avisos no bloqueantes por el tamaño del bundle inicial y varios ficheros SCSS.
- En Node `24.14.0`, el módulo nativo LMDB usado por la caché de Angular se abortó localmente. Para desarrollar y compilar, usar Node 22.
- Las pruebas Python no se repitieron porque el entorno virtual local no contiene `pytest`; el archivo de pruebas está creado, pero debe ejecutarse después de instalar las dependencias de desarrollo.

Comandos recomendados:

```bash
cd "/Users/thorqui/dev/Antigravity/Arete/Arete final/Arete-web/arete-ui"
nvm use 22
npm test
npm run build
npm start -- --host 127.0.0.1 --port 4200
```

Backend local:

```bash
cd "/Users/thorqui/dev/Antigravity/Arete/Arete final/Arete-web/arete-api"
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

## Despliegue en Vercel

El repositorio remoto es `Thorqui/arete-dance-studio` y `main` sigue a `origin/main`. El historial muestra que el repositorio ya se usó para despliegues de Vercel. Existen configuraciones separadas:

- Frontend: `arete-ui/vercel.json`, salida `dist/arete-ui/browser` y reescritura SPA a `index.html`.
- Backend: `arete-api/vercel.json`, función Python sobre `main.py` y cron de recordatorios.

Si ambos proyectos de Vercel siguen conectados a GitHub con sus directorios raíz respectivos (`arete-ui` y `arete-api`) y Production Branch=`main`, un `push` a `main` iniciará automáticamente los dos despliegues.

Antes de subir:

1. Revisar visualmente el diff completo y confirmar que se quiere publicar toda la maqueta actual.
2. Confirmar que `arete-ui/src/environments/environment.prod.ts` apunta al dominio estable correcto del backend. Ahora contiene una URL específica de despliegue que conviene sustituir por el dominio de producción estable.
3. Comprobar en Vercel las variables `DATABASE_URL` y las cinco variables Push anteriores.
4. Confirmar que la base de datos de producción tiene la tabla `push_devices`.
5. Recordar que los datos nuevos del campus que viven en `localStorage` no se compartirán entre dispositivos aunque el frontend esté desplegado.

El frontend ya fija Node `22.x` en `arete-ui/package.json` para que Vercel use la versión con la que se validó el build.

No se realizó ningún commit ni push durante esta sesión.

## Archivos principales de esta fase

- `arete-ui/src/app/components/campus/`: interfaz completa del campus y estilos responsive.
- `arete-ui/src/app/data/weekly-schedule.ts`: horario fijo compartido.
- `arete-ui/src/app/services/classroom.ts`: clases, alumnos, profesores y asistencia de la maqueta.
- `arete-ui/src/app/services/internal-chat.ts`: chat interno de la maqueta.
- `arete-ui/src/app/services/website-content.ts`: contenido y cartel editables.
- `arete-ui/src/app/services/push-reminders.ts`: integración de Push en la PWA.
- `arete-api/push_reminders.py`: API y envío de notificaciones Web Push.
- `PUSH_NOTIFICATIONS_SETUP.md`: activación de Push en producción.

## Próximo orden de trabajo recomendado

1. Revisar el diff y preparar un commit único o varios commits temáticos cuando el usuario lo pida.
2. Corregir la URL estable del backend.
3. Desplegar una vista previa y comprobar portada, login, campus, responsive y actualización PWA.
4. Implementar autenticación real y persistencia compartida.
5. Migrar gestión de usuarios, roles, clases, matrículas, asistencia, chat y CMS desde `localStorage` a la API/base de datos.
6. Activar y probar Web Push con un usuario autenticado real.
7. Añadir vídeos por clase mediante enlaces autorizados de Drive/YouTube y permisos por matrícula.
