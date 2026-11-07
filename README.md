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

GitHub Actions ejecuta verificaciones **solo sobre los archivos cambiados**: sintaxis de JS/JSON; índice de capítulos si se modifica el HTML o una crónica; estado derivado si cambia la campaña o las relaciones. No se ejecutan pruebas móviles ni de navegador automáticamente.

Comprobación local puntual:

```bash
node scripts/check-chapter-order.mjs
```

## Privacidad

No subir guardados de partida originales, credenciales o datos personales al repositorio público. Solo se publica información revisada. Véase `docs/IMPORTADOR.md` y `docs/SISTEMA_EDITORIAL.md`.
