# 🚀 ARETÈ DANCE STUDIO - ESTADO DEL PROYECTO (PARA CONTINUAR MAÑANA)

## 📌 Contexto General
Este documento sirve como "memoria caché" del agente IA para retomar el desarrollo del sistema web CMS y PWA de la academia de baile 'Aretè' con precisión cronológica.

**Stack Tecnológico:**
- **Backend:** FastAPI (Python) + SQLite (`cms.db`). Enrutador de APIs REST interactivo.
- **Frontend:** Angular 18 (Arquitectura Standalone sin módulos). SCSS puro, Bootstrap 5 nativo. PWA Configurada.

---

## ✅ Logros y Tareas Completadas (Hasta el corte de hoy)
1. **Arquitectura y Modelado Base de Datos**: Modelos SQLAlchemy listos para CMS, Usuarios, Matrículas de Grupos Fijos, Reservas Puntuales y Mensajes de Chat.
2. **Chat Centralizado e Independiente**:
   - Implementado componente `/app/chat` y `/admin-chat`.
   - Soporte para **Broadcast** (Mensajes masivos del admin a "Estudiantes", "Profesores" o "Todos").
   - Mensajería 1 a 1 garantizada.
3. **Panel de Gestión Admin (Dashboard Refactorizado)**:
   - Eliminados los campos JSON "crudos". Sustituidos por `Form Arrays` de Angular con botones visuales de añadir ➕ y borrar 🗑️ para Estilos de Baile y Horarios.
   - Creación de un **Menú Landing** en `/admin` (Pestañas limpias para separar *CMS Visual* de *Gestión Base de Datos*).
   - Implementado endpoint seguro de **Borrado de Clases** desde la interfaz visual y borrado en cascada de sus reservas asociadas.
4. **Diseño, Identidad y Paleta Oficial**:
   - Variables CSS nativas de Bootstrap integradas en `styles.scss` interceptando su compilación para aplicar el **Fucsia (`#DE4190`)**, el **Lila Empolvado** (`#DDBEDC`), y sus acentos **Verde Menta** y **Azul Cielo** respetando el fondo espacial profundo.
   - Logotipos registrados en Cabecera (`isotipo.png` y `logotipo_leyenda.png`), e integración de imágenes de fondo locales con opacidad 85% en las capas de los TABS mediante overlays fotográficos.
   - Incorporación exitosa de las fuentes propietarias nativas `.otf` (`Roc Grotesk` y `Gyst Variable`).
5. **Seguridad Lógica (Booking MVP)**:
   - Control nativo preventivo (`IntegrityError`/500) que frena al Frontend y alerta formalmente si el usuario 2 intenta matricularse en una misma clase 2 veces consecutivas.

---

## 🎯 PRÓXIMOS PASOS (TO-DO PARA MAÑANA)
Cuando se retome la sesión de trabajo, arrancar enfocándose en lo siguiente:

1. **Autenticación Real (Desvincular Mock)**:
   - Las reservas front-end actúan actualmente simulando con el usuario ID 2 (`user_id: 2`). Se requiere terminar de atar el token/session global en base al Login Real para que cada alumno que inicie sesión reserve automáticamente bajo su propia chapa.
2. **Reproductor de Vídeos de Estilos**:
   - Implementar formalmente las cajas de reproducción `<iframe>` (YouTube) o de reproductores HTML5 (`<video autoplay>`) en los estilos (`components/styles` o componente visual final) para aprovechar la infraestructura analizada y redactada en el informe de estrategias de vídeo.
3. **Pulido Fino de Pantallas y Roles**:
   - Terminar panel "Profesores". Contamos con el fondo `Imagen 1.jpg` subido y listo, pero requerimos crear el rol que limite sus permisos a dictar correcciones o chat (sin poder modificar los textos web).
   - Aplicar el salto semántico final de las fuentes importadas hoy (`font-family: Gyst Variable, ...`) a los títulos `h1, h2, h3` clave que aún no se lo hayan bebido por herencia.
4. **Validar entorno de Despliegue**:
   - Validar configuración del backend en puertos y base de datos para pasarlo a Producción en su alojamiento definitivo.
