# Botsebita Laboratory TV · v1.10

Reproductor web experimental para probar listas M3U y streams desde el navegador. No requiere Android, APK, Node.js, base de datos ni backend propio.

## Novedades de la versión 1.1 (base anterior)

- Nombre e identidad actualizados a **Botsebita Laboratory TV**.
- Selector de **20 idiomas**: English, 中文（简体）, हिन्दी, Español, Português, العربية, বাংলা, Русский, 日本語, ਪੰਜਾਬੀ, Deutsch, Français, Türkçe, 한국어, Tiếng Việt, Italiano, اردو, فارسی, Bahasa Indonesia y Kiswahili.
- La interfaz, controles, mensajes del reproductor y diálogos cambian al idioma seleccionado.
- El idioma elegido queda guardado en el navegador de esa PC y se restaura en la siguiente apertura.
- Soporte de dirección de texto RTL para árabe, urdu y persa.
- Se conserva la lista global de IPTV-org como playlist predeterminada.


## Novedades de la versión 1.2

- Diseño general negro, con esquinas cuadradas y bordes rectos.
- Reproductor dentro de una carcasa CRT decorativa inspirada en televisores de principios de los 2000, sin logotipos ni marcas. La ventana de video conserva su proporción 16:9.
- Panel derecho rediseñado como un control remoto: teclas de canal numeradas, acabado de plástico oscuro y controles de clasificación.
- Filtros simultáneos por país y categoría. Los países se obtienen del atributo `tvg-country`; las categorías se leen desde `tvg-category` o `group-title`.
- Los nombres de países se muestran según el idioma del selector, cuando el navegador ofrece los nombres regionales.
- Se mantienen los 20 idiomas, IPTV-org predeterminado, favoritos, historial, búsqueda, importación M3U y reproducción HLS.

## Funciones

- Interfaz responsive para escritorio, tablet y móvil.
- Importación local de archivos `.m3u` y `.m3u8`.
- Importación de playlists desde URL cuando el servidor permite CORS.
- Apertura de un enlace de stream individual.
- Reproducción HLS con HLS.js y reproducción directa de formatos compatibles con el navegador.
- Búsqueda, filtros por país y categoría, favoritos y canales recientes.
- Favoritos, recientes e idioma guardados localmente en el navegador.
- Carga automática de `https://iptv-org.github.io/iptv/index.m3u` al iniciar.
- Carga progresiva de canales por bloques para evitar crear miles de elementos de interfaz al mismo tiempo.
- Dos streams públicos de demostración como respaldo si no se puede descargar la lista predeterminada.

## Abrir en tu PC

1. Descomprimí el archivo ZIP.
2. Abrí `index.html` con Chrome, Edge, Firefox o Safari, o ejecutá `ABRIR_BOTSEBITA_LABORATORY_TV.bat` en Windows.
3. La playlist global de IPTV-org se descarga automáticamente al abrir el proyecto.
4. Usá el selector de idioma de la barra superior para cambiar la interfaz. La selección queda guardada en el navegador.
5. Para cargar otra lista, entrá en **Añadir lista** y pegá una URL pública o importá un archivo.

Para mejor compatibilidad con listas remotas, podés abrir la carpeta con la extensión Live Server de VS Code. Algunos navegadores restringen recursos o solicitudes de red al usar `file://`.

## Estructura

```text
botsebita-laboratory-tv/
├── .github/workflows/deploy.yml
├── assets/favicon.svg
├── i18n.js
├── app.js
├── lista3-publica.js
├── index.html
├── styles.css
├── ABRIR_BOTSEBITA_LABORATORY_TV.bat
├── ABRIR_PLAYTV_WEB.bat (acceso anterior)
└── README.md
```

## Lista predeterminada

La aplicación consulta en tiempo real la playlist global de [IPTV-org](https://github.com/iptv-org/iptv). No guarda una copia local de esa lista. Si el servidor o el navegador bloquean la solicitud, se muestran los canales de demostración de respaldo.

## Límites del navegador

- El servidor de cada stream debe permitir solicitudes CORS cuando el navegador necesite descargar manifiestos o segmentos.
- HTTPS puede bloquear streams servidos únicamente por HTTP (contenido mixto).
- Los formatos, códecs, DRM, licencias, restricciones geográficas y autenticación dependen del proveedor. Esta versión no elude DRM ni controles de acceso.
- Algunas listas incluyen enlaces temporales o tokens que pueden dejar de funcionar.

## Nota sobre GitHub

El código puede guardarse en un repositorio privado. GitHub Pages puede publicar el contenido web públicamente según el plan y la configuración de la cuenta; para mantener una prueba solo local, abrí `index.html` en tu PC y no actives la publicación.

## Análisis del APK original

El APK original era una aplicación Android nativa y no contenía una lista de canales completa reutilizable. La adaptación web es un rework independiente. Consultá `ANALISIS_APK_ORIGINAL.md` para más detalles del análisis previo.


## Novedades de la versión 1.3

- Nuevo botón **Otros canales** en la barra superior.
- Panel alternativo con referencia al repositorio público MonchoApps, resumen del catálogo y ejemplos de grupos/categorías.
- Acceso directo al repositorio original y botón para importar una playlist M3U/M3U8 propia/autorizada.
- Se mantienen separadas la fuente principal IPTV-org y las listas que el usuario importe.
- No se incorporan URLs de streams protegidos, claves ClearKey, tokens ni cabeceras para acceder a servicios autenticados. El material de referencia incluye DASH protegido por DRM/ClearKey, por lo que esas emisiones no se reproducen en esta versión.
- Se agrega `ANALISIS_TECNICO_MONCHOAPPS_FLOW.md` con el resumen de los dominios, cabeceras observadas y límites de compatibilidad.

## Fuente secundaria y compatibilidad

El repositorio MonchoApps expone archivos de catálogo JSON. `original_url.json` declara 453 streams en 30 categorías; `channels_alt.json` es otro snapshot con 449 streams en 29 categorías (exportación fechada 2026-06-14). Los archivos contienen una mezcla de HLS, radios, DASH/ClearKey, enlaces relativos, URLs con tokens y fuentes que declaran cabeceras HTTP. La v1.5 descarga ambos catálogos y muestra la unión de registros identificables, sin intentar reproducir las entradas protegidas o no compatibles.


## Versión 1.4 — Fuente Moncho

El botón **Moncho** descarga `original_url.json` desde el repositorio público MonchoApps y carga sus canales compatibles en el listado lateral. Se aceptan únicamente streams HLS HTTPS directos (`.m3u8`) que no incluyan DRM/ClearKey, cabeceras de autenticación ni URLs tokenizadas. Las emisiones DASH protegidas y las entradas que requieren cabeceras se omiten deliberadamente. Para reproducir, seleccioná un canal cargado; la carga de la lista no inicia audio automáticamente.


## Versión 1.5 — Catálogo Moncho completo

- El botón **Moncho** consulta ambos archivos públicos: `original_url.json` y `channels_alt.json`.
- Combina registros y elimina duplicados por nombre y URL, conservando la referencia de los catálogos donde aparece cada entrada.
- Muestra también canales que antes se omitían: enlaces relativos, DASH/ClearKey, fuentes con cabeceras, URLs temporales y formatos no compatibles.
- Cada fila muestra una marca de compatibilidad. Al seleccionar una entrada no reproducible, el reproductor explica el motivo en lugar de intentar abrirla.
- Habilita la reproducción únicamente para URLs HTTPS directas sin DRM, tokens ni cabeceras adicionales y con formato de video, audio o HLS reconocido. Que una URL figure como candidata no garantiza que siga online ni que su servidor permita CORS.
- No se extraen ni usan claves DRM, tokens de sesión, firmas ni mecanismos de autenticación.


## Versión 1.6 — DRM con licencia oficial y consentimiento

- Al seleccionar una entrada identificada como DRM/ClearKey aparece un aviso de consentimiento y responsabilidad de uso antes de cualquier intento de reproducción.
- La reproducción protegida utiliza Shaka Player y solo puede intentarse con una URL HTTPS de manifiesto directa y un endpoint HTTPS de licencias oficial proporcionado por el usuario.
- Sistemas disponibles en el formulario: W3C Clear Key (`org.w3.clearkey`, con servidor oficial que responda en formato JWK) y Google Widevine (`com.widevine.alpha`, con servicio autorizado y CDM compatible en el navegador).
- El usuario debe marcar que dispone de autorización. El aviso no concede derechos, no elimina DRM y no sustituye una licencia válida.
- La aplicación no extrae, copia ni utiliza los valores `kid`/`k` publicados en el catálogo. Tampoco genera tokens, firmas ni credenciales, ni configura cabeceras privadas.
- Entradas con tokens, cabeceras adicionales, rutas relativas o manifiestos no identificables continúan visibles, pero el reproductor no intenta acceder a ellas.
- El servidor de licencias y el servidor del manifiesto deben permitir las solicitudes desde el dominio de la web (CORS). La compatibilidad depende del navegador, la suscripción y la configuración legítima del proveedor.

### Configuración de reproducción protegida

1. Seleccioná un canal marcado como `DRM`.
2. Leé el aviso y marcá la confirmación de autorización.
3. Seleccioná el sistema DRM correcto y pegá la URL HTTPS del endpoint oficial de licencias que te haya entregado el proveedor.
4. Tocá **Continuar y reproducir**. Si no tenés ese endpoint o una licencia válida, no se podrá reproducir el canal.

El formulario no guarda la URL de licencia en almacenamiento local; se utiliza solo para el intento de reproducción actual. No pegues credenciales privadas en una página pública o de terceros.


## Versión 1.7 — Catálogo Moncho ampliado y filtros

- Se amplió la lectura de estructuras JSON: categorías anidadas, listas y colecciones con nombres de campos alternativos.
- Se muestra el recuento real de registros descargados, canales únicos, duplicados, candidatos reproducibles, DRM y otras restricciones.
- Se añadieron filtros para ver solo candidatos reproducibles, entradas marcadas como DRM o registros con otras restricciones.
- La clasificación detecta más variantes de nombres de URL, formato, licencia, token y cabeceras, pero conserva únicamente metadatos de visualización.
- No se copian ni utilizan claves ClearKey, tokens, cookies, firmas, cabeceras privadas ni datos de sesión de MonchoApps/Flow. Tampoco se autocompletan permisos ni se simula el consentimiento.
- Las rutas relativas se mantienen visibles y no se convierten en direcciones de un servidor supuesto. La reproducción protegida requiere autorización y mecanismos oficiales del proveedor; el consentimiento de la interfaz no concede acceso.
- Se mantiene el consentimiento explícito antes de cualquier intento de reproducción DRM con un endpoint oficial suministrado por el titular de la cuenta.

### Importante sobre los canales protegidos

El catálogo puede contener metadatos de DRM/ClearKey y referencias de acceso al proveedor. La v1.7 no los transforma en credenciales de reproducción. Por eso puede mostrar todas las entradas que consiga leer, pero no garantiza que todas sean reproducibles. La disponibilidad depende del proveedor, la autorización de la cuenta, el endpoint oficial, CORS y las capacidades del navegador.


## Versión 1.8 — Reproducción DASH sin DRM

- Se incorpora reproducción de manifiestos DASH (`.mpd`) HTTPS cuando el catálogo no los identifica como DRM ni declara tokens, firmas o cabeceras privadas.
- Los streams DASH sin protección se cargan con Shaka Player, sin agregar credenciales ni modificar las solicitudes del proveedor.
- La reproducción protegida conserva el aviso y la aceptación manual. Requiere un endpoint HTTPS de licencia oficial y autorización válida.
- Se rechazan URLs de licencia HTTPS que incluyan usuario o contraseña incrustados.
- No se extraen ni autocompletan claves ClearKey, tokens, cookies, cabeceras privadas o permisos, y no se automatiza el consentimiento.

La detección se basa en los metadatos disponibles: un manifiesto que no está marcado como DRM podría seguir protegido del lado del servidor. La reproducción solo funcionará si el origen permite acceso directo, CORS y códecs compatibles.


## Novedades de la versión 1.9

1. **Dos listas con botones pequeños:** Lista 1 para IPTV-org o listas propias y Lista 2 para el catálogo MonchoApps.
2. **Caché en memoria por fuente:** al cambiar entre listas ya cargadas durante la misma sesión, no se vuelven a descargar.
3. **Restauración de la última lista:** la aplicación recuerda si se utilizó Lista 1 o Lista 2 y vuelve a consultar esa fuente al abrirse.
4. **Actualización manual:** el botón ↻ recarga la fuente remota activa; una lista importada desde archivo indica que debe importarse de nuevo.
5. **Estado y carga más claros:** la interfaz muestra fuente y cantidad de canales, y las solicitudes remotas tienen un límite de espera de 18 segundos. Las descargas antiguas se invalidan cuando se cambia de fuente.

La Lista 2 sigue leyendo únicamente los catálogos públicos de MonchoApps. No extrae claves privadas, tokens, cookies ni cabeceras de autenticación, no automatiza consentimientos y no evita DRM. Las emisiones protegidas necesitan una licencia oficial y autorización del proveedor.


## Novedades de la versión 1.10

1. Se agrega **Lista 3 · Canales públicos**, seleccionable junto a Lista 1 y Lista 2.
2. La tercera lista está integrada en el paquete y no necesita descargar un catálogo externo para aparecer.
3. Se incluyen 14 manifiestos HLS públicos que respondieron con el tipo de contenido M3U durante las comprobaciones iniciales: France 24 (EN/ES/FR), RTVE La 1 y 24h, TRECE, DW Español, ETB 1, ETB 2, EITB Basque, Negocios TV, Canal Parlamento, Sport Italia y Tagesschau24.
4. Se excluyen los enlaces que devolvieron errores HTTP, redirecciones no comprobables o tiempos de espera; también se excluyen URLs con tokens temporales, credenciales y rutas de IPTV privadas.
5. La selección de las tres fuentes se guarda y se restaura. La Lista 3 se conserva en caché y puede reconstruirse con el botón de actualización.

**Alcance de las pruebas:** se verificó la respuesta de los manifiestos desde el entorno de comprobación, pero no se pudo validar la reproducción completa de los segmentos de video ni las reglas CORS en tu navegador. Un manifiesto disponible no garantiza reproducción en Uruguay: pueden aplicar geobloqueos, límites del proveedor, cambios de URL o restricciones del navegador. Por eso la lista es una selección inicial, no una certificación permanente de emisión.
