# Corazón de la Casa — estado, eventos y auditoría

## Separación de responsabilidades

- `data/campaign.js`: hechos aprobados del juego. Los personajes históricos **nunca** se eliminan.
- `data/house-state.js`: vista canónica derivada: vivos, caídos, disponibles, expediciones, relaciones e invariantes. El mismo módulo se ejecuta en navegador y Node.js.
- `scripts/save-core.mjs`: valida y compara guardados privados, produce propuestas y eventos de dominio (no publica).
- `novel/relationships.js`: canon narrativo permanente. El estado *En memoria* es un derivado visual, no una reescritura de los sentimientos.
- `app.js`: presentación de la información. No debe crear listas fijas de personajes vivos ni duplicar contadores.
- `tests/house-state.test.mjs`: escenarios de regresión.

## Ciclo de actualización

1. El usuario exporta el guardado del juego. Cloudflare Pages **no accede** al juego ni lee el disco del usuario automáticamente.
2. Ejecutar el comparador en Node/CI y revisar `diff.events` (death, recruitment, promotion, departure, return, injury, division_changed, building_changed, bond_changed, job_started, job_ended...).
3. La propuesta de campaña incluye `audit`, con errores de referencias inválidas y contradicciones. No publicar hasta resolverlos.
4. Revisar textos literarios, nuevas fichas e identidad visual, e incorporar capítulos si procede.
5. Pasar `node --test`, `node --check app.js` y `node scripts/audit-house.mjs`. Crear PR y desplegar solo tras aprobarla.

## Límites explícitos

- No inferir el resultado de una misión por desaparecer de `activeJobs`.
- No resucitar personajes ni eliminar biografías históricas.
- No reescribir capítulos antiguos por fallecimientos posteriores.
- Un vínculo puede mostrarse como *En memoria* sin inventar una nueva evolución psicológica: `needsEditorialReview` señala casos pendientes.
- Los nombres y valores de divisiones, misiones y emplazamientos que no pueda interpretar el importador requieren revisión.
- La web no se actualiza al instante mientras juegas: se actualiza cuando se importa y publica el nuevo estado. Si se quisiera sincronización continua, haría falta integración/autorización adicional y probablemente un servicio de fondo (Cloudflare Workers/D1/R2 u otro), no simplemente cambiar el HTML.

## Criterio de fallo

Errores tales como `members-mismatch`, `dead-in-job`, `unknown-fallen` y `unknown-literary-bond` bloquean la publicación. La lista de sucesos **no** equivale a una crónica aprobada.
