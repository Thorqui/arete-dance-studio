# Construcción del Gestor de Contenidos (CMS) para Arete-web

## 1. Aislamiento del Proyecto 
Todo el sistema (`arete-ui` y `arete-api`) se copió exitosamente a `Arete-web`, protegiendo de esta forma la carpeta madre y el entorno original de `Arete final`. A partir de ahora todos los comandos se correrán en `Arete-web`.

## 2. Puesta en Marcha de Base de Datos CMS (Backend: Python/FastAPI)
Para eliminar el uso de texto *hardcodeado* o escrito "a fuego" en el código:
* **SQLAlchemy & SQLite**: Se implementó una base de datos embebida ultra ligera.
* Se crearon los esquemas de CMS mediante los que la lógica se estandariza a base de _slugs_ (ej: `hero`, `about`). (Ver [models.py](file:///Users/thorqui/dev/Antigravity/Arete/Arete%20final/Arete-web/arete-api/models.py))
* Se crearon rutas `GET` (lectura) y `PUT` (edición y guardado) y se verificó su uso en [main.py](file:///Users/thorqui/dev/Antigravity/Arete/Arete%20final/Arete-web/arete-api/main.py).
* Se construyó e invocó un script `seed_db.py` que volcó automáticamente en la nueva base de datos los textos que estaban incrustados en las vistas HTML.

## 3. Dinamismo en Interfaz Gráfica (Frontend: Angular PWA)
* **Carga Inicial del CMS**: Se inyectó a nivel de núcleo de la aplicación un `APP_INITIALIZER` en `app.config.ts`, que invoca al nuevo servicio reactivo [cms.service.ts](file:///Users/thorqui/dev/Antigravity/Arete/Arete%20final/Arete-web/arete-ui/src/app/services/cms.service.ts). Esto fuerza que los títulos y textos de la web carguen transparentemente en la inicialización sin demoras o "saltos" molestos en pantalla.
* **Hero y Sobre Nosotros**: Se vaciaron los textos *hardcodeados* de [hero.component.html](file:///Users/thorqui/dev/Antigravity/Arete/Arete%20final/Arete-web/arete-ui/src/app/components/hero/hero.component.html) y de `about.component.html`, reemplazándolos de manera eficaz por etiquetas dinámicas y directivas `*ngIf / else` de fallback para asegurar máxima fiabilidad offline/online.

## 4. Edición de CMS y Panel de Administrador Gráfico
* Se rediseñó el [Panel de Administrador](file:///Users/thorqui/dev/Antigravity/Arete/Arete%20final/Arete-web/arete-ui/src/app/components/admin-dashboard/admin-dashboard.html) en la ruta `/admin` en Angular. 
* Ahora, debajo de las tarjetas originales, hay unas consolas de comando (formularios visuales) que leen la API del CMS en tiempo real, exponen las herramientas para cambiar Títulos, Descripciones e Imágenes, e incluyen un botón **Guardar**.
* Hacer clic en guardar realiza un `PUT` en FastAPI, guardando de forma permanente los textos actualizados en el servidor. Así el dueño del negocio actualizará el web enteramente sin pisar una línea de código ni esperar despliegues.

---

## FASE 2: Deshardcodeo Completo 100% y Opciones Gráficas
A petición posterior, se potenció de lo básico a un CMS integral:
* **Multimedia Dinamizadas**: Los campos de video de fondo y fotos secundarias ahora se leen también del CMS y pueden modificarse introduciendo la URL hacia `assets/videos` o links externos desde el panel Admin.
* **Layouts**: Se añadió control estructural (Alineación a izquierda/derecha, Inversión de Grids) gobernado por el mismo JSON y seleccionable mediante un `select` intuitivo en el Administrador.
* **Agilización de Vistas Avanzadas**:
  * **Estilos de Baile**: Ya no están quemados en 4 paneles de HTML, sino que cargan dinámicamente sus botones, descripciones y videos de la Base de Datos.
  * **Horarios**: La rejilla compleja de HTML de 5 días fue reemplazada por bucles en `*ngFor` que leen las franjas horarias y pintan las celdas asignando el color correspondiente si es *Bachata/Salsa/Ladys* o si está vacía.
  * **Footer**: Propiedades como URL de Instagram, textos de Marca y Copyright son completamente configurables remótamente.
* **Admin Pro**: El Panel Administrativo se dividió en formularios amigables y un editor avanzado de JSON para editar en crudo los arrays robustos de la programación de clases.

---

## FASE 3 y 4: Plataforma "SaaS" Transaccional y Tablón de Refuerzos
Se pasó de un sistema puramente "CMS Visual" a un modelo "SaaS" para gestionar plazas de asistencia a las clases, centrado fuertemente en compensar el desbalance de géneros (Leads/Follows).

* **Base de Datos Relacional**: Además de la tabla estática del CMS (JSON), se implementó un motor puramente transaccional en SQLAlchemy con `User`, `ClassSession` y `Booking`.
* **Roles en Clases Sociales**: En vez de un horario rígido, la creación de Clases es un *Tablón de Llamamientos*. Al dar de alta una nueva clase, el Administrador especifica la cantidad de **Plazas requeridas** y a qué **Rol Requerido (Chicos o Chicas)** va dirigido.
* **UI/UX para Alumnos (`/app/classes`)**: La pestaña privada lanza consultas a la API e identifica visualmente mediante insignias o etiquetas ("badge") si cada sesión "Se Buscan Chicos", "Se Buscan Chicas" o si es "Mixta".
* **Interacción Real-Time y Overbooking**: Al realizar una reserva (1 plaza), se descuenta visual y lógicamente. Al llegar a 0 plazas requeridas, el botón de inscripción se deshabilita instantáneamente para todos los clientes (protegido también en backend SQLAlchemy).

## FASE 5: Grupos de Clases Fijas (Matrículas)
Para gestionar la dualidad entre eventos puntuales o refuerzos versus **asistentes regulares en grupos anuales**, se agregó infraestructura dedicada:
* **Entidades SQLAlchemy**: Se añadieron `ClassGroup` (grupo general, ej. "Salsa 1") y `Enrollment` (la matrícula de un usuario en dicho grupo).
* **Gestión UI Admin Dashboard**: En `/admin`, el personal puede ahora crear estos grupos indicando Horario (`schedule_description`) y el límite máximo de alumnos admitidos. Además, incluye selector para **matricular** un usuario existente en un grupo.
* **Portal del Alumno (`ClassesView`)**: Al loguearse (mockeado temporalmente), el sistema recupera sus matriculaciones de la ruta `/api/users/{id}/enrollments` y las muestra con orgullo ("Matriculado ✔️") en un panel superior distinto a la tabla "pizarra" de llamadas de último minuto.

## FASE 6 y Refinamiento: Chat Centralizado y Transmisiones
Se implementó un sistema de comunicación directa 1 a 1 entre el Alumnado y el equipo de Coordinación (Admin):
* **Pestaña Única**: Se purgaron el Dashboard Admin y el tablero del Usuario para alojar la comunicación visual en el nuevo módulo ruteado independientemente `ChatComponent`.
* **Broadcast**: Utilizando el poder de la estructura relacional de la BD, el administrador puede ahora elegir Grupos de Interés (Ej: "Solo Estudiantes", "Todos", "Solo Profesores") y remitirles un mismo mensaje a cada cuenta activa individual en bloque.
* **Componentización**: Se aprovecharon los "Route Data" pasados en `app.routes.ts` (`data: {role: student/admin}`) para reusar el mismo componente UI y adaptarlo orgánicamente sin duplicar código.

## FASE 7: Refactorización UX del Panel de Administración (Despedida JSON)
Se completó el ciclo integrando FormArrays nativos en Angular en el gestor avanzado de la academia. A nivel lógico y en el HTML se borraron los antiguos `<textarea>` que requerían al Manager de la escuela saber programar JSON a mano.
1. Formulario de **Estilos**: Presenta entradas textuales 1 a 1 para ID, Nombre, Descripción y URL del Vídeo.
2. Formulario del **Horario Fijo**: Permite introducir líneas y separadores temporales explícitamente (`time`, `title`, `subtitle`, `teacher`).
