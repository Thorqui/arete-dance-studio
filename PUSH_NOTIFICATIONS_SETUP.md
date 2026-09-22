# Activación de recordatorios push

El código está preparado, pero el envío permanece desactivado hasta configurar el backend desplegado. El aviso dentro de la PWA funciona sin este paso.

## 1. Crear la tabla

Con `DATABASE_URL` apuntando a la base de datos de producción:

```bash
cd arete-api
python init_push_db.py
```

El script solo crea `push_devices` si todavía no existe.

## 2. Generar las claves

Después de instalar `requirements.txt`:

```bash
cd arete-api
python generate_vapid_keys.py
```

Guarda ambos valores en un gestor de secretos. No añadas las claves generadas al repositorio.

## 3. Variables del backend en Vercel

Configura estas variables en el proyecto del backend:

- `PUSH_DEMO_ENABLED=true`
- `VAPID_PUBLIC_KEY`: salida pública del script.
- `VAPID_PRIVATE_KEY`: salida privada del script.
- `VAPID_SUBJECT`: un correo de contacto con formato `mailto:correo@dominio.com`.
- `CRON_SECRET`: una cadena aleatoria de al menos 32 caracteres.

El cron de `vercel.json` llama a `/api/push/dispatch` una vez al día a las 07:00 UTC. En el plan Hobby la ejecución puede retrasarse hasta 59 minutos.

## 4. Comportamiento esperado

- El alumno debe pulsar **Activar notificaciones** desde la PWA instalada y aceptar el permiso del sistema.
- La agenda se vuelve a sincronizar cuando reserva, cancela o avisa de una falta.
- Cada dispositivo recibe como máximo un recordatorio al día con sus clases pendientes.
- Al abrir la notificación se navega a `/campus/gestion`.
- En iPhone o iPad, la PWA debe añadirse a la pantalla de inicio antes de activar Web Push.

Esta integración usa la identidad local de la maqueta. Antes de producción real debe vincularse cada suscripción al usuario autenticado del backend.
