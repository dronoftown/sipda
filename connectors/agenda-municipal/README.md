# SIPDA-CON-001 · Agenda municipal — prototipo

Fuente oficial: https://agenda.platjadaro.com/

Sin bases de datos, almacenamiento de eventos ni dependencia de proveedores IA.

Rutas previstas: /health, /diagnostic y /events?hours=72.

**IMPORTANTE: extracción no validada con eventos reales.** Se han verificado los filtros de la agenda, pero el HTML accesible desde las herramientas de lectura no muestra eventos. La web podría cargarlos dinámicamente. Este primer módulo busca eventos JSON-LD y, si no los encuentra, responde 503 extraction_unverified (nunca interpreta que no existan eventos).

El código está aislado en esta rama; **no está desplegado** y no modifica producción.

Despliegue futuro: Worker ES Modules de Cloudflare, sujeto a comprobación del plan gratuito, permisos de extracción y revisión de logs de plataforma.