# Pruebas — Botsebita Laboratory TV v1.7

## Validaciones ejecutadas

- `node --check app.js` y `node --check i18n.js`.
- Comprobación de IDs HTML duplicados.
- Comprobación de IDs referenciados por `app.js` y presentes en `index.html` (con excepciones para selectores dinámicos/documentales existentes).
- Prueba aislada del normalizador con registros tipo `CLEARKEY`, HLS, audio, rutas relativas, tokens, cabeceras y duplicados entre catálogos.
- Confirmación de que los objetos normalizados no guardan `drm_license_uri`, claves, tokens, cabeceras ni cookies.

## Límites

No se probaron transmisiones reales. No se proporcionaron credenciales de una cuenta autorizada ni endpoints oficiales de licencias. La detección de compatibilidad no garantiza disponibilidad, derechos de acceso, CORS o soporte de códecs/DRM.
