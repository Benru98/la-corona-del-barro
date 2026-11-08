# La Corona de Barro — El Libro de la Casa

Sitio narrativo estático de **Dungeons & Dynasties**. Se publica desde la rama `main` de GitHub mediante Cloudflare Pages. No requiere framework, servidor de aplicación ni compilación.

## Arquitectura vigente

- `index.html`: entrada y orden de carga; `app.js` y `styles.css`: interfaz.
- `data/campaign.js`: hechos mecánicos aprobados de la partida.
- `novel/chapters/index.js` y `novel/chapters/*.js`: crónicas independientes.
- `novel/relationships.js` y `novel/continuity.js`: vínculos, secundarios y memoria **literaria**, separados de las afinidades del juego.
- `novel/editorial-policy.js` y `novel/narrative-engine.js`: Motor de Crónicas 3.1 y Mesa del Escriba.
- `art/catalog.js`, `art-manifest.js`, `art/portrait-library.js`: arte aprobado y variantes.
- `data/house-state.js`: estado vital, disponibilidad y memorial.
- `scripts/compare-saves.mjs`: diferencia de guardados antes de actualizar el libro.

**Copias históricas, no activas:** `book-data.js` y `novel/chapters.js`. Se conservan como referencia de migración; no deben editarse ni utilizarse como fuente vigente.

## Publicación

En Cloudflare Pages: rama `main`, framework **None**, build vacío o `exit 0`, salida `.` (raíz). Los commits desencadenan el despliegue, pero el éxito del commit no confirma que la versión pública esté ya actualizada.

## Añadir una crónica

Preparar un capítulo JSON revisado con `id`, `chapter`, `title`, `years`, `lead`, `source`, `characterIds`, `paragraphs`, `speakers` y `facts`.

```bash
node scripts/add-chapter.mjs --file /ruta/capitulo-aprobado.json --dry-run
node scripts/add-chapter.mjs --file /ruta/capitulo-aprobado.json
```

El comando comprueba que no exista ya, valida personajes, secundarios literarios y atribución de diálogos; después crea el archivo y lo registra en `index.html`. **No publica** ni modifica por sí solo el canon relacional. Revisar por separado `novel/relationships.js` y `novel/continuity.js` cuando la escena deje consecuencias.

## Validaciones ligeras

El punto de entrada es `scripts/preflight.mjs`: revisa sintaxis de los archivos cambiados, integridad de capítulos, estado vital, Gaceta y coherencia de campaña, sin iniciar navegador. Es el **mismo script** que invoca el workflow rápido de GitHub.

```bash
node scripts/preflight.mjs --changed "data/campaign.js,home/dispatches.js,app.js"   # antes del commit
node scripts/preflight.mjs --staged                                  # cambios preparados
node scripts/preflight.mjs --base HEAD~1                             # revisión del último commit
node scripts/preflight.mjs --all                                     # validación completa del estado
```

La auditoría en navegador sigue ejecutándose en GitHub al cambiar código o datos relevantes, **una sola vez contra un servidor local**. La segunda auditoría contra Cloudflare Pages es ahora manual (`workflow_dispatch`), evitando ejecutar el mismo recorrido dos veces en cada publicación. Solo cambios de Markdown, CSS o imágenes no arrancan la validación rápida.

Ver `AGENTS.md` para el procedimiento de publicación con un único commit, sin esperas ni ediciones parciales.

## Privacidad

No subir guardados de partida originales, credenciales o datos personales al repositorio público. Solo se publica información revisada. Véase `docs/IMPORTADOR.md` y `docs/SISTEMA_EDITORIAL.md`.

## Flujo vigente de actualización con dos JSON

En la Mesa del Escriba se elige cuántas crónicas y noticias crear, su extensión y las instrucciones narrativas. Se descarga el **JSON del encargo** y se adjunta junto al **guardado nuevo de Dungeons & Dynasties**. No hace falta ZIP, HTML ni guardar en el chat el JSON anterior.

El encargo solo contiene preferencias y contexto editorial abreviado; el estado vigente se consulta siempre en GitHub. El guardado define los hechos, y el asistente completa la narrativa y una nueva edición del Ojo del Escriba y de la Gaceta.

Si cambia `data/campaign.js`, actualizar también `home/dispatches.js` en el mismo commit. Jamás subir el JSON bruto; no atribuir resultados de misiones pendientes. Véase `docs/PROTOCOLO_DOS_JSON.md`.
## Actualizaciones rápidas (formato v2)

El JSON exportado por la Mesa incluye solo el número y extensión de crónicas, tus instrucciones y noticias solicitadas; ya no incrusta Motor 3.1, todas las fichas, crónicas y vínculos. El contexto vigente se consulta en GitHub.

```bash
node scripts/prepare-next.mjs --save /ruta/guardado-nuevo.json --out /tmp/corona-propuesta
```

Este comando prepara **borradores no publicados** de campaña, baseline, proyección y un `resumen.json` para la parte creativa. Nunca sube el guardado bruto ni inventa crónicas: hay que revisar muertes, altas, nuevos vínculos, sucesos y completar Gaceta/edición antes de publicar en un único commit. No añade pruebas automáticas.
