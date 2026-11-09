# Resultado de inspección de PlayTV Premium 20.1

## ¿Hay una lista de canales dentro del APK?

No se encontró una lista M3U/M3U8, una base de datos local ni un archivo JSON con canales dentro del paquete analizado.

El único archivo de datos ubicado en `assets/` es `worldtv6.json` (422 bytes). Contiene configuración de origen y dominios del portal Flow:

- `https://portal.app.flow.com.ar/`
- `https://portal.app.flow.com.py/`

No contiene nombres de canales, logos ni URLs de streams.

## Qué indica el paquete

En los binarios aparecen referencias a componentes como `FlowTokenManager`, `FlowSigner`, `FlowHeaders`, `Catalog` y `Channels`. Esto es consistente con una aplicación que obtiene el catálogo desde un servicio remoto en tiempo de ejecución, en lugar de llevar la lista completa dentro del APK.

Por ese motivo no es posible importar desde este APK una lista local de canales auténtica. Tampoco sería correcto inventar nombres o enlaces y presentarlos como si fueran los originales.

## Cómo probar la versión web

La versión web conserva la importación de listas M3U/M3U8 desde un archivo o una URL. Para cargar el mismo catálogo que muestra la aplicación Android, hace falta una exportación M3U legítima del proveedor o una lista que el usuario tenga autorización para utilizar.

El proyecto web no reproduce ni elude el inicio de sesión, la firma de peticiones, la gestión de tokens ni las restricciones de acceso del servicio Flow.
