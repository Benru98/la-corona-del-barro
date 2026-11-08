# Flujo opcional: JSON adicional de la Mesa del Escriba

**El flujo habitual necesita únicamente el JSON de la partida guardada.** Este documento conserva el antiguo procedimiento de dos archivos solo por si el propietario quiere especificar un encargo editorial especial. No se debe solicitar el segundo archivo por defecto.

Si el usuario desea dar preferencias narrativas, también puede escribirlas directamente en el mensaje, sin exportar un JSON.
## Para el asistente

- El guardado nuevo determina los hechos. El JSON del encargo, si se proporciona voluntariamente, recoge preferencias editoriales; el estado actual siempre se contrasta con GitHub.
- Con checkout actualizado ejecutar `node scripts/prepare-next.mjs --save /ruta/nuevo.json --out /tmp/corona-E0025` para preparar borradores mecánicos y resumen sin tocar producción. Si solo se dispone del conector GitHub, se aplica ese mismo contrato sin afirmar que el script se ha ejecutado. Releer continuidad y Gaceta desde GitHub, no desde el encargo.
- Comparar cambios por ID estable: fallecidos, nuevos integrantes, incidencias, relaciones mecánicas, encargos, liga, economía, sucesos. Documentar y validar antes de modificar datos. Nunca inventar causas o resultados.
- Actualizar canon literario y crear la cantidad de capítulos solicitados si existe una preferencia explícita; de lo contrario decidirlos según los acontecimientos. El Motor 3.1 permite escenas cotidianas autónomas: no convertir el JSON en una recapitulación.
- Abrir **un nuevo número de Gaceta** al inicio de `HOUSE_DISPATCHES.issues`, conservar anteriores y actualizar `latestDay` y `latestEdition` al estado aprobado. Crear noticias originales (preferencia 1–3) que pueden tratar de Villorio, otros gremios o rumores. Etiquetar como `game`, `literary` o `fiction`; evitar noticias repetidas. Si son rumores inventados, no elevarlos a hechos mecánicos.
- Generar hallazgos del **Ojo del Escriba** desde cambios realmente verificados. Cada entrada contiene `id,title,fact,source,kind:'game',interpretation`. Si no hay descubrimientos importantes, preferir menos entradas antes que inventar datos.
- Actualizar archivos en un **commit coherente**. Si se altera la campaña, el CI obliga a alterar también `home/dispatches.js`; comprueba formato, edición y fecha. No ejecutar batería de pruebas generales, móvil o navegador si no se necesita.
- En la respuesta: resumen del nuevo período, títulos añadidos, nuevos indicios y noticias, enlace a la app y SHA del commit. No prometer trabajo asíncrono ni confundir commit en GitHub con despliegue confirmado de Cloudflare.

## Separación de verdad

- **Juego**: únicamente hechos confirmados por guardado.
- **Literatura**: escenas, vínculos, secundarios y objetos publicados. No cambian afinidades, heridas ni misiones del juego.
- **Rumor**: sátira y ficciones de entorno. Pueden enriquecer el ambiente, pero se mantienen explícitamente como rumores sin afirmarse como historia real.

## Estructura mínima de `home/dispatches.js`

`HOUSE_DISPATCHES={schemaVersion:1,bookId:'la-corona-de-barro',latestDay:<día aprobado>,latestEdition:'<edición aprobada>',issues:[{id,year,day,edition,headline,eye:[],news:[]}]}` (sustituir los marcadores por valores literales de la campaña vigente).

Cada noticia incluye `id,rubric,title,body,sourceType,source,editorialNote` y opcionalmente `relatedChapterId`.

No se requiere API de IA, base de datos ni servicio de pago: las noticias y crónicas se generan en la conversación y se publican por GitHub.
