# Pruebas — Botsebita Laboratory TV v1.10

## Comprobación del paquete
- [x] JavaScript de `app.js` y `lista3-publica.js` pasa `node --check`.
- [x] El catálogo integrado comienza con `#EXTM3U`.
- [x] Los 14 registros del catálogo contienen nombre, grupo y URL HTTPS con extensión `.m3u8`.
- [x] No hay URLs con parámetros `token`, `auth`, `sig`, `jwt` o credenciales incrustadas en Lista 3.
- [x] Existe el selector Lista 3 y su listener de cambio de fuente.
- [x] La última fuente puede guardar/restaurar `iptv-org`, `moncho` o `public`.
- [x] Cambio a Lista 3 invalida solicitudes remotas anteriores.
- [x] ZIP íntegro y estructura estática presente.

## Disponibilidad de manifiestos consultados
Los manifiestos que devolvieron tipo de contenido M3U se conservaron. Se eliminaron los endpoints que devolvieron 401/403/404, 5xx, timeout o que abrieron páginas HTML en vez de un HLS directo.

## Límite de verificación
El entorno de construcción no permitió completar una reproducción real de video en navegador. No se afirma que todos los canales funcionen en Uruguay; cada proveedor puede aplicar CORS, geobloqueo, cambios de URL o límites regionales. La confirmación definitiva requiere abrir el paquete desde tu navegador y reproducir cada canal.
