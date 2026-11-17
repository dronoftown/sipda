# SIPDA-CON-001 · Agenda municipal — prototipo

Fuente oficial: https://agenda.platjadaro.com/

Sin bases de datos, almacenamiento de eventos ni dependencia de proveedores IA.

Rutas previstas: /health, /diagnostic y /events?hours=72.

**IMPORTANTE: extracción no validada con eventos reales.** Se han verificado los filtros de la agenda, pero el HTML accesible desde las herramientas de lectura no muestra eventos. La web podría cargarlos dinámicamente. Este primer módulo busca eventos JSON-LD y, si no los encuentra, responde 503 extraction_unverified (nunca interpreta que no existan eventos).

El código está aislado en esta rama; **no está desplegado** y no modifica producción.

Despliegue futuro: Worker ES Modules de Cloudflare, sujeto a comprobación del plan gratuito, permisos de extracción y revisión de logs de plataforma.
## Validación de acceso (17 noviembre 2026)

- GitHub Actions ejecutó 4/4 pruebas unitarias correctas.
- La consulta HTTP automatizada a la fuente pública devolvió **403 Forbidden** desde GitHub Actions; el evento no se puede leer con ese acceso.
- No se han almacenado eventos. El diagnóstico únicamente escribe metadatos técnicos en los logs de GitHub Actions.
- No forzar acceso ni sortear protección anti-bot. Próximo requisito: obtener del Ayuntamiento una API/exportación estructurada y permiso de consumo automatizado (o una modalidad técnica aprobada).
- El estado de disponibilidad de datos sigue siendo **no validado**. La rama permanece sin desplegar.
