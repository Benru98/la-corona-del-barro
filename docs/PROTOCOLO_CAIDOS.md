# Protocolo de los Caídos — El Juramento del Barro

**Objetivo:** una baja del juego debe propagarse a toda la aplicación sin reescribir a mano textos, listas, contadores o el memorial. Este protocolo se aplica siempre que se importe un nuevo guardado JSON.

## Fuente de verdad

El archivo del juego identifica a los vivos en `guild.roster[]` y a los fallecidos en `guild.fallen[]`. En la práctica, las entradas de fallecidos pueden venir como `{adventurer:{id, name, ...}, day, dungeon, epitaph}` o como la proyección reducida `{id,name}`.

- `scripts/save-core.mjs` compara ambos estados por ID y llama a `scripts/mortality-core.mjs`.
- `reconcileCasualties` conserva la ficha original y asigna `status:'caído'`, `death`, `away:null`, memoria y registro en `BOOK.world.fallen`.
- `BOOK.stats.members` cuenta solo integrantes vivos; `BOOK.stats.dead` cuenta fallecidos acumulados. `BOOK.characters` **siempre** conserva vivos y caídos.
- El importador genera una **propuesta revisable**. Una muerte no se publica de forma autónoma desde el navegador ni desde un JSON sin aprobación.
- Una reaparición de alguien identificado como fallecido requiere revisión editorial; no se «resucita» automáticamente.

## Qué cambia en la interfaz sin tocar más código

| Área | Reacción automática |
| --- | --- |
| Portada | Aviso discreto de duelo y enlace al memorial |
| Retratos | Marco de luto y distintivo `IN MEMORIAM` en la galería actual |
| Aventureros | Filtro «En activo» y «En memoria»; el fallecido conserva su ficha |
| Biografía | Día, lugar, epitafio, hazaña y, si existe, versión literaria de su final |
| Patrullas | Exclusión del fallecido y recálculo de integrantes por turno |
| Archivo | Contadores, clasificación y estado leídos del último guardado |
| Leyendas | Memorial permanente, con grandes retratos y homenaje |
| Crónicas anteriores | **Sin cambio retroactivo:** personajes que seguían vivos en el pasado no muestran luto en sus diálogos |

## Parte literaria (revisión humana)

Para cada nueva baja, documentar en `BOOK.characters[].memorial` los campos opcionales:

```json
{
  "feat": "Logro significativo, respaldado por datos reales",
  "quote": "Palabras imaginadas por un compañero",
  "attribution": "Nombre del compañero · homenaje literario",
  "literaryDeath": "Versión narrativa de cómo pudo morir",
  "writtenAsLiterature": true
}
```

No inventar las cifras ni la identidad, ni confundir una conjetura con el registro del juego. **Si el guardado no explica los últimos instantes**, se puede escribir libremente una escena coherente con su carácter y el canon, **pero se debe indicar expresamente que es reconstrucción literaria**. No alterar el texto de capítulos previos; si se aborda en una nueva crónica, mantener la cronología.

La fecha se calcula como `fallen.day + 1`, porque la aplicación usa días visibles; el lugar se toma de `fallen.dungeon`. Los detalles del funeral se incluyen solo cuando constan en el guardado o están claramente marcados como narración.

## Proceso en futuros updates

1. Comparar el último guardado con `data/approved-save-projection.json` mediante `scripts/compare-saves.mjs`.
2. Revisar el bloque `fallen.added` del diff y comprobar que sus IDs no están en `roster[]`.
3. Ejecutar `prepareCampaignUpdate` para actualizar datos seguros y el protocolo de bajas.
4. Completar la crónica y los campos editoriales `memorial` de los caídos.
5. Actualizar la proyección y la línea base, ejecutar `node --test` y la auditoría en Chrome.
6. Fusionar únicamente cuando el memorial, biografía, patrullas, recuentos y capítulos históricos pasen las pruebas.

### La primera inscripción: Brugo

- **Muere** el año I, día visible 34, en El Asalto de Ashfall (Cindermoor).
- **Regresan** Jaro, Velasco y Ulf. La coalición gana.
- **Funeral** al día visible 35: sepultura detrás de la Casa, túmulo, gasto de 520 g.
- **Hazaña:** cuatro incursiones, 53 bloqueos y tres momentos heroicos en su historial.
- **Legado:** mentoría con Velasco y último turno de guardia con Ulf.
- La forma concreta de su muerte, que no aparece en el JSON, se cuenta como **leyenda literaria**, nunca como hecho mecánico.
