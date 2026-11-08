# Importador de guardados — procedimiento vigente

El flujo habitual trabaja con **un solo JSON privado**: el guardado nuevo de Dungeons & Dynasties v26. No se necesita el archivo de la partida anterior, un ZIP ni el JSON de la Mesa del Escriba.

## Entrada del usuario

**Solo el JSON del juego.** El asistente decide por defecto cuántas crónicas, interludios y noticias crear según lo relevante de los hechos; revisa cambios de personajes, vínculos, lesiones, misiones, economía, bajas, fichajes y patrullas. Puede crear escenas de ficción, pero nunca presentar invenciones como resultados confirmados del juego.

Si el usuario desea personalizar alguna historia, puede indicarlo por texto normal en la conversación; no se le pide otro JSON.

Consultar el estado publicado de GitHub (`data/campaign.js`, `data/approved-save-projection.json`, `data/save-baseline.json`, `home/dispatches.js` y canon literario). El JSON bruto no debe publicarse.

El JSON de encargo de la Mesa del Escriba sigue siendo **opcional** y solo se procesa cuando el usuario lo aporta voluntariamente.
## Un único paso mecánico, si hay checkout local

```bash
node scripts/prepare-next.mjs --save '/ruta/privada/guardado-nuevo.json' --out '/tmp/corona-borrador'
```

El preparador compara el guardado con la proyección aprobada y escribe **fuera del repositorio** un borrador de `data/campaign.js`, `data/save-baseline.json`, `data/approved-save-projection.json` y `resumen.json`.

El resultado aún necesita revisión. El programa no crea capítulos, nuevas biografías ni retratos, no confirma victorias por desaparición de un encargo y no inventa las finanzas. Un fichero del mismo día, una versión de guardado distinta o un desajuste de identidad deben revisarse manualmente.

El códice conserva los caídos, retirados y vendidos aunque ya no aparezcan en la plantilla activa del JSON. El importador comprueba los IDs del guardado anterior en vez de exigir que la lista histórica tenga el mismo tamaño. `world.guildRosterAlive` sigue siendo una **lista de IDs**.

### Si solo está disponible GitHub conectado

Aplicar la misma comparación y validación con las herramientas conectadas, sin afirmar que se ha ejecutado un comando local que no se haya ejecutado. No solicitar al usuario de nuevo la información ya enviada.

## Revisión editorial y publicación

1. Verificar por ID altas, bajas, caídos, ausencias, contratos, lesiones, atributos, vínculos, clasificación, construcciones, misiones y economía. Distinguir hechos comprobados de escenas imaginadas.
2. Completar las fichas de nuevos héroes, sus retratos autorizados, las consecuencias narrativas, las noticias y el Ojo del Escriba; no sobrescribir capítulos publicados.
3. Si cambia la campaña, actualizar en el mismo lote `home/dispatches.js` y la edición correspondiente. Revisar también el **Consejo de patrullas** con el nuevo estado.
4. Ejecutar el preflight selectivo, por ejemplo:

```bash
node scripts/preflight.mjs --changed 'data/campaign.js,home/dispatches.js,data/save-baseline.json,data/approved-save-projection.json'
```

5. Publicar mediante **un único commit atómico** en `main`. Consultar las pruebas automáticas y, si hace falta confirmar la web pública, verificar Cloudflare Pages aparte.

## Para añadir capítulos

```bash
node scripts/add-chapter.mjs --file '/ruta/capitulo-aprobado.json' --dry-run
node scripts/add-chapter.mjs --file '/ruta/capitulo-aprobado.json'
```

El registro reutiliza el `?v=` de `index.html` y comprueba el orden de carga antes de la publicación. `scripts/compare-saves.mjs` sigue disponible para **diagnóstico opcional** de diferencias detalladas: no es un segundo paso obligatorio después de `prepare-next`.

**Archivos históricos**: `book-data.js` y `novel/chapters.js` permanecen como copias de referencia. No forman parte de la aplicación actual ni deben actualizarse en cada edición.
