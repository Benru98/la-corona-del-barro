# La Corona de Barro — El Libro de la Casa

Web estática (HTML/CSS/JavaScript) publicada en Cloudflare Pages desde la rama `main`.

## Arquitectura (fase 1)

- `index.html`: estructura HTML y orden de carga de scripts.
- `styles.css`: estilos existentes, sin cambios.
- `app.js`: interfaz y navegación; **sin motor editorial embebido**.
- `data/campaign.js`: estado mecánico de la campaña, fichas, expediciones, historia y metadatos.
- `novel/chapters.js`: capítulos publicados, separados del estado del juego.
- `novel/relationships.js`: vínculos literarios y categorías narrativas (no son los valores mecánicos).
- `novel/narrative-engine.js`: guía editorial y reglas de continuidad de Mesa del Escriba; no ejecuta IA en el navegador.
- `art-manifest.js`: catálogo de imágenes con rutas **relativas a la raíz**.
- `*.webp`, `*.svg`: imágenes actuales en raíz. No mover sin actualizar las rutas.
- `book-data.js`: copia histórica de compatibilidad (ya no cargada por la web). Retenida temporalmente para validar que no se ha perdido ni cambiado información.

## Validación

Con Node.js 22 o posterior:

```bash
node --test tests/structure.test.mjs
node --check app.js
```

GitHub Actions ejecuta comprobaciones en cada pull request y en cada push a `main`.

## Publicación

Cloudflare Pages está configurado con `main`, framework `None`, build `exit 0`, output `.`. Fusionar una PR en `main` despliega la nueva versión. Mantener las mejoras en una rama y utilizar vistas previas antes de fusionar.

## Política editorial y de datos

La verdad del **guardado del juego** y el **canon literario** son capas distintas. Un cambio mecánico no autoriza inventar su causa. Conservar IDs estables y capítulos publicados; no sobrescribir imágenes aprobadas sin instrucción explícita.

**Fase 2 (propuesta de importación):** `scripts/save-core.mjs` valida y compara guardados v26; `scripts/compare-saves.mjs` crea informes y borradores sin publicar. `data/save-baseline.json` identifica el último guardado aprobado. Véase `docs/IMPORTADOR.md`. Las nuevas fichas, el canon literario y los acontecimientos narrativos siguen requiriendo revisión.

No subir credenciales, guardados privados ni datos sensibles al repositorio público.
