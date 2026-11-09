# Pruebas previstas — Botsebita Laboratory TV v1.9

- [x] La cabecera incluye dos selectores pequeños: Lista 1 y Lista 2 (MonchoApps).
- [x] La lista activa se identifica con estado visual y aria-pressed.
- [x] La fuente activa y su cantidad de canales aparecen sobre el panel de canales.
- [x] La última fuente seleccionada se guarda en localStorage.
- [x] Las listas ya descargadas se conservan en memoria durante la sesión.
- [x] Se incluye actualización manual de la fuente activa.
- [x] Las solicitudes de catálogo se cancelan por timeout a los 18 segundos.
- [x] Una respuesta de una descarga anterior no pisa la fuente seleccionada más recientemente.
- [ ] Prueba funcional en navegador: IPTV-org disponible y bloqueado por CORS.
- [ ] Prueba funcional en navegador: descarga parcial/total de los dos JSON de MonchoApps.
- [ ] Prueba funcional en navegador: reproducción HLS y DASH sin DRM.
- [ ] Prueba funcional en navegador: flujo de licencia oficial con credenciales válidas del titular.

No se incluyen pruebas de evasión DRM, extracción de claves, recuperación de tokens privados ni automatización de consentimiento.
