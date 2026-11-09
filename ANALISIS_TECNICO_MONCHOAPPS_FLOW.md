# Análisis técnico de MonchoApps / Flow — v1.3

## Fuentes públicas revisadas

- Repositorio: https://github.com/monchotv/MonchoApps
- `original_url.json`: el resumen del archivo declara 453 streams y 30 categorías.
- `channels_alt.json`: declara 449 streams y 29 categorías; el snapshot indica exportación `2026-06-14T18:35:44.036Z`.
- `whitelist.txt`: contiene nombres de grupos/categorías, por ejemplo Argentina, deportes, cine y series, infantiles, cultura, noticias y música.

## Dominios observados durante el análisis previo del APK

- `https://portal.app.flow.com.ar`
- `https://portal.app.flow.com.ar/` (referer)
- `https://portal.app.flow.com.py`
- `https://flow.com.ar`
- `https://flow.com.py`

La presencia de estos dominios no demuestra por sí sola que exista un endpoint de reproducción público ni concede autorización para consumirlo.

## Cabeceras que aparecen en los registros

En los objetos de canal de `original_url.json` aparecen campos HTTP como:

- `Origin`: identifica el origen web desde el que se hace una petición.
- `Referer`: indica la página de referencia que presenta el cliente.
- `User-Agent`: identifica el navegador o cliente que realiza la petición.

Son cabeceras de contexto del cliente. No equivalen por sí mismas a un token de sesión, prueba de suscripción o autorización de reproducción. El archivo contiene distintos valores según el proveedor y la categoría.

## Metadatos DRM

Los objetos revisados incluyen un campo `drm_license_uri` con estructura ClearKey (`kid` y `k`) y referencias a manifiestos DASH (`.mpd`) o listas HLS. Los valores de licencia son material criptográfico de reproducción, no parámetros genéricos de encabezado. No se copian, reconstruyen ni se usan en esta adaptación web.

## Tokens y firma

Los archivos JSON examinados no proporcionan un procedimiento legítimo y completo para emitir tokens de sesión de Flow. El APK analizado previamente contiene referencias a componentes internos de token/firma, pero reproducir el algoritmo, generar tokens o falsificar encabezados para entrar a servicios autenticados facilitaría eludir los controles de acceso. Por eso esta versión no implementa esa parte.

## Qué hace la v1.3

- Mantiene IPTV-org como lista inicial.
- Añade un botón **Otros canales** que abre un panel informativo de MonchoApps.
- Muestra estadísticas del catálogo y ejemplos de grupos, sin descargar claves ni direcciones de streams protegidos.
- Permite importar una playlist M3U/M3U8 propia o una URL de emisión que el usuario tenga autorización para reproducir.
- No añade compatibilidad DRM ni autenticación Flow.

## Referencias

- https://github.com/monchotv/MonchoApps
- https://raw.githubusercontent.com/monchotv/MonchoApps/main/original_url.json
- https://raw.githubusercontent.com/monchotv/MonchoApps/main/channels_alt.json
- https://raw.githubusercontent.com/monchotv/MonchoApps/main/whitelist.txt

## Cómo se representan las cabeceras en el JSON

En los objetos consultados, `headers` se guarda como un objeto de pares nombre/valor por canal. Para los registros de Flow observados se ven `Origin`, `Referer` y `User-Agent`; en otros proveedores aparecen además cabeceras de contexto del navegador como `X-Requested-With` y `Sec-Fetch-*`. El código no revela un método de firma de token a partir de esos campos: son valores estáticos que el reproductor adjuntaría a solicitudes cuando la plataforma y el navegador lo permiten.

`drm_license_uri` es un campo distinto de `headers`. Su estructura `kid`/`k` corresponde a material de licencia ClearKey que permite descifrar segmentos protegidos; no es un token HTTP de sesión. La web estática tampoco puede establecer de forma arbitraria todos los encabezados de petición desde `HTMLVideoElement` o HLS.js, y los navegadores aplican restricciones CORS y de origen.


## Actualización de integración — v1.5

- La aplicación consulta los dos catálogos `original_url.json` y `channels_alt.json` en forma independiente.
- El extractor recorre las entradas de cada grupo (`samples`, `channels`, `streams`, `items` y `entries`) y contempla también listas en el nivel raíz.
- La interfaz muestra todos los registros identificables de ambos snapshots, deduplicados por nombre y URL, e indica por qué algunas entradas no se pueden reproducir desde una página estática.
- Solo se consideran candidatos de reproducción los enlaces HTTPS directos sin DRM/ClearKey, token de sesión, firma ni cabeceras adicionales, y cuyo formato sea HLS, audio o video reconocido.
- La marca de compatibilidad no verifica disponibilidad en vivo: el servidor puede estar fuera de línea, requerir CORS o haber retirado el stream.
- No se añaden funciones de reproducción DRM, reconstrucción de tokens, firma de URL ni evasión de autenticación.


## Actualización de integración — v1.6

La v1.6 añade un flujo de consentimiento y una integración de Shaka Player para que el titular de una suscripción pueda configurar el endpoint HTTPS oficial de licencias. No se interpreta ni se extrae el objeto `drm_license_uri` con valores `kid`/`k` del catálogo. Para Clear Key se configura únicamente el sistema EME `org.w3.clearkey` contra un endpoint autorizado que devuelva una licencia JWK válida; para Widevine se utiliza el CDM soportado por el navegador y el servidor autorizado correspondiente.

El aviso de consentimiento no concede autorización ni constituye una garantía de exención legal. El usuario debe disponer de derechos de acceso y una licencia válida. La página no genera tokens, no firma URLs, no falsifica cabeceras y no reutiliza credenciales de la aplicación Android.


## Nota de implementación v1.7
La aplicación muestra registros y clasifica requisitos, pero no extrae ni reutiliza claves, tokens, cabeceras ni datos de sesión del catálogo.
