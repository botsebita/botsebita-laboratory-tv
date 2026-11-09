# Changelog

## 1.1 — Botsebita Laboratory TV

- Rebranding from PlayTV Web Lab to Botsebita Laboratory TV.
- Added a 20-language selector and translations for the main interface, channel controls, player states and playlist dialogs.
- Saved the selected language in local browser storage.
- Added right-to-left layout direction for Arabic, Urdu and Persian.
- Updated favicon, page title and README.
- Preserved IPTV-org as the default playlist, plus M3U imports, HLS playback, search, categories, favorites and recently viewed channels.


## 1.2 — Black CRT / Remote Control

- Reworked the interface with a black palette and square-corner geometry.
- Added a brand-free early-2000s CRT television cabinet around the player, keeping the video viewport at 16:9.
- Restyled the right-side channel list as a physical remote-control panel with numbered channel keys.
- Added simultaneous country and category filters using IPTV-org `tvg-country`, `tvg-category` and `group-title` metadata.
- Country names adapt to the selected interface language through `Intl.DisplayNames` when supported by the browser.
- Preserved the 20-language selector and existing IPTV/M3U/HLS features.


## v1.3 — 2026-11-08

- Se agrega botón **Otros canales** y panel de fuente secundaria MonchoApps.
- Se muestran estadísticas públicas de los archivos de catálogo y grupos de ejemplo.
- Se agrega enlace al repositorio y acceso directo a importar listas M3U/M3U8 autorizadas.
- No se implementan claves DRM/ClearKey, tokens, ni cabeceras de autenticación de servicios privados.
- Se documenta la diferencia entre cabeceras de contexto HTTP y autenticación/licencia DRM.


## v1.4
- El botón **Moncho** carga directamente el catálogo `original_url.json` de MonchoApps.
- Se extraen y muestran las entradas HLS HTTPS directas compatibles.
- Se excluyen entradas DRM/ClearKey, DASH, URLs tokenizadas y streams que requieren cabeceras.
- El canal se reproduce al seleccionarlo en el mando/listado.


## v1.5 — 2026-11-08

- Moncho ahora combina `original_url.json` y `channels_alt.json`.
- Se incorporan al listado todos los registros identificables de ambos catálogos, incluidos los que no son reproducibles desde un navegador estático.
- Se clasifican automáticamente las entradas: DRM, DASH, URL relativa, token, cabeceras, HTTP, HLS, audio, video o formato no reconocido.
- Se deduplican registros equivalentes por nombre y URL, conservando las fuentes donde aparecen.
- Se agregan indicadores de compatibilidad y mensajes explicativos al seleccionar una entrada bloqueada.
- Se mantiene la política de no usar DRM, claves, tokens ni autenticación.


## v1.6 — 2026-11-08

- Aviso de consentimiento y responsabilidad antes de intentar reproducir canales protegidos.
- Integración de Shaka Player para manifiestos DASH/HLS protegidos con endpoints de licencia oficiales configurados por el usuario.
- Configuración compatible con W3C Clear Key mediante servidor de licencias autorizado y Google Widevine mediante CDM del navegador.
- Sin extracción ni uso de claves `kid`/`k` del catálogo MonchoApps, ni generación de tokens o evasión de autenticación.
- Los manifiestos con tokens, cabeceras especiales o direcciones no compatibles siguen bloqueados.


## v1.7

- Normalizador recursivo para las estructuras de los catálogos MonchoApps.
- Recuento y desglose por compatibilidad: reproducibles, DRM y otras restricciones.
- Filtros rápidos para navegar el catálogo completo sin ocultar las emisiones que no pueden reproducirse desde una página estática.
- Detección ampliada de formatos, campos de URL, tokens y cabeceras requeridas.
- Sin extracción ni reutilización de claves, tokens, firmas, cookies o cabeceras privadas; no se autocompletan permisos ni se automatiza el consentimiento.


## v1.8

- Reproducción de DASH HTTPS sin indicadores de DRM ni credenciales privadas mediante Shaka Player.
- La reproducción DASH pública no añade claves, tokens, cookies ni cabeceras del proveedor.
- Consentimiento explícito y manual antes de intentar DRM con licencia oficial.
- Validación reforzada del endpoint de licencia HTTPS: sin credenciales incrustadas.
- Sin elusión de DRM, autenticación ni permisos.


## v1.9 — Dos listas y navegación mejorada

- Se reemplaza el botón único de Moncho por dos botones compactos: **Lista 1** e **Lista 2 · MonchoApps**.
- Se mantiene una caché independiente en memoria para cada catálogo durante la sesión.
- Se recuerda la última lista seleccionada y se restaura al abrir la aplicación.
- Se agrega un botón para actualizar la fuente activa; las listas locales muestran una indicación para volver a importarlas.
- Se muestra el origen activo y el total de canales junto al título del panel.
- Se añade un límite de espera de 18 segundos para las solicitudes de catálogos y se invalidan respuestas antiguas al cambiar de fuente.
- La reproducción DRM continúa limitada a mecanismos oficiales y autorización válida; no se extraen credenciales ni se eluden controles.


## v1.10 — Tercera lista pública

- Se agrega el selector compacto **Lista 3 · Públicos** y un catálogo M3U local integrado.
- Se agregan 14 manifiestos HLS que respondieron con MIME M3U en la comprobación inicial.
- Se excluyen los enlaces con errores 4xx/5xx, respuestas no reproducibles como URL directa, tiempos de espera y redirecciones no verificables.
- Se descartan enlaces con tokens temporales, credenciales o rutas de proveedores IPTV privados.
- Las tres fuentes se seleccionan de forma independiente, se recuerdan entre aperturas y se mantienen en caché durante la sesión.
- Se invalidan solicitudes remotas pendientes al cambiar a la lista integrada para evitar que una carga tardía reemplace la fuente seleccionada.
- La reproducción real de los segmentos y CORS debe comprobarse en el navegador del usuario y puede variar por país o por proveedor.
