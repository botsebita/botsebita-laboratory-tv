# Pruebas — Botsebita Laboratory TV v1.8

## Validaciones ejecutadas

- `node --check app.js` y `node --check i18n.js`.
- Comprobación de IDs HTML duplicados.
- Comprobación de IDs usados por `app.js` y presentes en `index.html`.
- Prueba del clasificador de MonchoApps para HLS, DASH sin DRM, DASH/ClearKey, enlaces con tokens, cabeceras y rutas HTTP relativas.
- Confirmación de que los canales DASH solo quedan habilitados si el registro no declara DRM, tokens, firmas ni cabeceras especiales.
- Confirmación de que el formulario DRM exige la casilla de consentimiento manual y una URL HTTPS sin usuario/contraseña incrustados.

## Límites

No se probaron transmisiones reales ni endpoints de licencia. La clasificación depende de los metadatos publicados por el catálogo; no garantiza que un manifiesto clasificado como DASH sin DRM esté realmente desprotegido. La disponibilidad depende de CORS, códecs, navegador y permisos del origen.
