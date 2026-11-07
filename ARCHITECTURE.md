# Arquitectura — El Libro de la Casa

## Principio de diseño

HTML/CSS/JavaScript estáticos servidos por Cloudflare Pages desde GitHub `main`. Mantener los cambios pequeños y localizados; no añadir compilador, framework ni base de datos sin una necesidad demostrada.

## Capas y fuentes de verdad

1. **Mecánica** — `data/campaign.js` define fichas, estadísticas, resultados, bajas, ausencias y vínculos numéricos. `data/house-state.js` deriva disponibilidad y memoria de los caídos.
2. **Novela** — `novel/chapters/index.js` inicializa `BOOK.chapters`. Los capítulos de `novel/chapters/*.js` se cargan por orden en `index.html`, sin reescribir capítulos publicados. El índice del lector los muestra de más recientes a más antiguos.
3. **Memoria literaria** — `novel/relationships.js` y `novel/continuity.js` guardan escenas, vínculos, objetos, secundarios y secretos inventados. Nada de ello altera el JSON mecánico.
4. **Motor 3.1** — `novel/editorial-policy.js` contiene las reglas narrativas; `novel/narrative-engine.js` las conecta a Mesa del Escriba. La web no genera prosa mediante IA.
5. **Arte** — `art/catalog.js`, `art-manifest.js`, `art/portrait-library.js` exponen recursos aprobados y variantes estables.
6. **Interfaz** — `app.js`, `styles.css`, `index.html`.

## Referencias históricas

`book-data.js` y `novel/chapters.js` son copias antiguas de migración. **No están cargadas en la web**. Se conservan para comparación, sin mantenerlas en paralelo.

## Flujo de actualización

- Guardado: comparar cambios con `scripts/compare-saves.mjs`, verificar IDs y aprobar los cambios mecánicos antes de publicar.
- Crónica: `scripts/add-chapter.mjs --file ... --dry-run` para prevalidar, después registrar y añadir consecuencias a la continuidad si procede.
- Interfaz: editar únicamente los archivos relacionados.
- CI: `.github/workflows/validate.yml` comprueba sintaxis solo de los JS/JSON modificados. Si cambia `index.html` o un capítulo, `scripts/check-chapter-order.mjs`; si cambia campaña, estado vital o vínculos, `scripts/audit-house.mjs`.
- Pruebas de navegador: solo manualmente, fuera de las ejecuciones automáticas.
- Despliegue: el commit en `main` desencadena Cloudflare Pages; verificar la versión pública por separado cuando haga falta.

El sitio ya utiliza WebP y carga diferida en buena parte de las imágenes. No se modifican estos recursos mientras el rendimiento sea satisfactorio.
