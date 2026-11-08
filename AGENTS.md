# AGENTS.md — La Corona de Barro

Instrucciones permanentes para asistentes y colaboradores que editan este repositorio.
Meta: **una actualizacion = una lectura inicial, cambios agrupados, preflight local, un commit atomico y una comprobacion final**.

## Protocolo principal: UN solo JSON de partida
- La entrada suficiente es únicamente el guardado JSON nuevo de Dungeons & Dynasties. **No solicitar un segundo JSON de la Mesa del Escriba** en el flujo habitual.
- Consultar el HEAD de GitHub, la proyección aprobada, el baseline, la Gaceta, los capítulos y el canon literario. Comparar por ID y preparar las modificaciones con el guardado nuevo; no volver a pedir datos ya disponibles.
- Autonomía creativa: el asistente escoge el número y la extensión de crónicas, interludios y escenas según los eventos detectados. Actualiza datos, biografías, relaciones, Gaceta, Ojo del Escriba, memorial, patrullas y asesoramiento cuando corresponda, sin inventar resultados mecánicos.
- Una indicación especial se puede escribir en el mensaje del chat, sin ningún fichero adicional. El export de la Mesa queda como herramienta opcional, solo si el propietario lo adjunta voluntariamente.
- Preservar el JSON privado fuera de GitHub, validar en bloque y publicar los cambios aprobados mediante un único commit atómico.

## Fuentes de verdad y limites
- Publicacion: GitHub `Benru98/la-corona-del-barro`, rama `main`, Cloudflare Pages. El commit no prueba por si solo que el dominio publico se haya actualizado.
- Archivos activos: `data/campaign.js`, `home/dispatches.js`, `data/save-baseline.json`, `data/approved-save-projection.json`, `app.js`, `styles.css`, `novel/chapters/*`, `art/catalog.js`, `art/portrait-library.js`. No editar `book-data.js` ni `novel/chapters.js` (copias historicas).
- El JSON de partida original nunca se sube al repositorio publico. No publicar notas privadas ni atributos ocultos.
- Distinguir hechos mecanicos del guardado, interpretaciones literarias e invenciones autorizadas. Una fecha o version nueva del juego no demuestra una nueva aventura.
- No modificar retratos existentes sin fuente visual aprobada; revisar referencias de `art/catalog.js` y archivos fisicos juntos.

## Camino rapido de publicacion
1. **Leer una vez** el estado de `main`, `README.md` y solo los archivos afectados. Para un JSON nuevo, comprobar `data/save-baseline.json` y `data/approved-save-projection.json`. Comparar antes de escribir.
2. **Plan de cambios minimo**: clasificar como `arte/texto`, `datos` o `estructura+narrativa`. Evitar recorrer todo el repositorio si no es necesario.
3. **Preparar todos los archivos en un lote**, sin publicar ediciones parciales. Actualizar cache busting de `index.html` solo si cambian recursos cargados en navegador. Un cambio en `data/campaign.js` debe incluir `home/dispatches.js` y mantener la edicion/dia coherentes.
4. **Preflight antes del commit**: `node scripts/preflight.mjs --changed "data/campaign.js,home/dispatches.js,app.js"` (adaptar rutas). Para cambios preparados en git: `node scripts/preflight.mjs --staged`. Incluye sintaxis, indices, integridad mecanica, Gaceta y pruebas dinamicas cuando corresponda. Fallo = corregir antes de publicar.
5. **Un unico commit atomico** en `main`; mediante conector GitHub, crear blobs (en paralelo donde sea posible), un arbol, un commit y mover `main` con comprobacion de `expected_sha`. No usar una serie de `update_file` por cada archivo. Si falla alguna validacion tras publicar, realizar **un commit corrector** con el menor alcance posible, no crear muchas ediciones intermedias.
6. **Confirmar** SHA, cambios de archivos y resultado de la validacion rapida. La auditoria de navegador local corre cuando cambian `app.js`, `index.html`, `data/campaign.js`, `home/dispatches.js` o su test. No esperar haciendo polling continuo; consultar los resultados solo cuando sea necesario.
7. La comprobacion contra `pages.dev` pasa a **manual** (`workflow_dispatch`) para evitar dos recorridos de navegador en cada push. Cuando se necesite verificar publicacion, lanzarla expresamente y comprobar el dominio. No decir "desplegado" solo por un commit o por el test local.
8. Entregar informe breve: archivos cambiados, commit, pruebas efectivamente concluidas y estado de despliegue confirmado o pendiente. No prometer trabajo en segundo plano.

## Guardados y narrativa
- Para guardados posteriores: `node scripts/prepare-next.mjs --save /ruta/privada.json --out /tmp/corona-propuesta`. Produce borrador, nunca lo publica.
- Un guardado del **mismo dia** que el baseline requiere comparacion manual de esquema/campos, sin forzar `prepare-next` ni inventar cronicas.
- Mantener identidades por ID, personajes caidos en el memorial, retirados fuera de patrullas y fechas visibles (dia interno +1).
- Valorar `rating` (valoracion de clase verificada), `firstJoin.rating` (entrada historica), `currentAbility` (CA) y `potentialAbility` (PA) como escalas diferentes. Nunca calcular una valoracion actual sumando CA o reutilizando el rating de entrada.
- Cifras economicas: distinguir ultima nomina real, proyeccion siguiente y media de ingresos variables; documentar periodos y procedencia.
- Mantener continuidad: no reescribir capitulos ya publicados ni inferir muertes, lesiones, relaciones o resultados de una expedicion pendiente.

## Pruebas y latencia
- `scripts/preflight.mjs` es el punto de entrada unico, compartido por el desarrollador y la validacion rapida de GitHub.
- `tests/current-campaign.test.mjs` valida coherencia entre campana, baseline, proyeccion y Gaceta **sin codificar a mano el numero de edicion ni la firma del guardado**. Las pruebas historicas pueden mantener afirmaciones de una fecha concreta, pero no deben bloquear avances futuros solo por un cambio de dia.
- `tests/browser-smoke.mjs` debe leer la edicion esperada de `data/campaign.js` en vez de tener `E0030` fijo.
- No duplicar navegacion local y publica en el mismo push. Las imagenes nuevas deben comprobarse en la prueba de navegador si afectan a retratos o portada.
- Si se edita una guia Markdown, no iniciar compilaciones o navegadores sin razon.

## Consejo táctico — revisión obligatoria en cada actualización
- El modal de Patrullas lee BOOK.characters, BOOK.relationships y BOOK.meta en cada apertura, sin datos fijos de una edición.
- Tras cada guardado aprobado, revisar cobertura por rol, fichajes, ausencias, bajas, lesiones, entrenamiento y afinidades. Ejecutar tests/patrol-advisor.test.mjs dentro del preflight.
- No confundir valoración histórica (última captura) con CA o PA del guardado. Afinidad entre héroes no confirma beneficios de combate.
- No modificar importes ni sustituir cifras económicas por cálculos editoriales.

## Segunda auditoría: futuros guardados y pruebas sin datos caducados
- Los personajes antiguos se conservan en BOOK.characters; el importador valida los IDs del guardado anterior, sin exigir igualdad con el total histórico.
- `scripts/prepare-next.mjs` mantiene `world.guildRosterAlive` como lista de IDs y distingue incursión, cesión, viaje de incorporación y encargo.
- El registro de crónicas usa `scripts/chapter-index.mjs` y respeta el token de caché del índice.
- Cada nueva campaña debe superar `tests/update-pipeline.test.mjs`, las pruebas de campaña y patrullas y las de navegador cuando cambie su interfaz. Evitar tests atados a nombres o días concretos.
- `compare-saves.mjs` es diagnóstico opcional: no duplicar `prepare-next`.

## Portada viva y nuevas ediciones
- La cabecera y el acontecimiento destacado se calculan en `home-summary.js` desde `BOOK.meta`, `BOOK.stats`, `BOOK.world.systemEvents`, las ausencias y la última edición.
- Los cierres anuales se seleccionan por año desde `ANNUAL_SUMMARIES.years`; nunca introducir textos de una temporada específica en `app.js`.
- Solo se destacan acontecimientos de la fecha visible actual. Si no hay, recurrir a notas de la edición actual o a la crónica más reciente, sin convertir ficción en hechos del juego.
- La previsión financiera de portada solo aparece si `world.finance.asOfVisibleDay === BOOK.meta.day`. Conservar los importes aprobados.
- Ejecutar `tests/home-summary.test.mjs` tras cambios de campaña, portada, índice o cierres anuales; cubrir salto de año y retirada de anuncios caducados.
