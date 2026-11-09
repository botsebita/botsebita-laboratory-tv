# Pruebas realizadas — Botsebita Laboratory TV v1.6

- Sintaxis JavaScript validada con `node --check` para `app.js` e `i18n.js`.
- Clasificador Moncho verificado con casos simulados: HLS directo, ClearKey con manifiesto HTTPS, DRM con token, DRM con cabeceras adicionales y DASH sin metadatos DRM.
- Confirmado que los objetos devueltos por el clasificador no incluyen los valores `kid`/`k` recibidos en la entrada.
- Estructura HTML revisada: IDs sin duplicados y diálogo DRM presente.
- No se realizó una prueba de reproducción real de canales Moncho protegidos: no se proporcionó un endpoint oficial de licencias ni una cuenta autorizada para ese contenido.

La disponibilidad real depende del manifiesto, la autorización del proveedor, el endpoint de licencias, CORS y las capacidades DRM del navegador.
