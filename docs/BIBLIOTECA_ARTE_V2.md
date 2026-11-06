# Biblioteca visual V2 — La Corona de Barro

## Material recibido (6 noviembre 2026)

- 2 portadas: `corona-grupal-v2.webp` para Portada y `cronicas-fantasia-v2.webp` para Crónicas.
- 31 variantes de retrato: `<personaje>-v2-[a|b|c].webp`.
- Se mantienen los once retratos oficiales existentes en la raíz. Ninguno se sobrescribe.
- Las imágenes antiguas de las dos portadas se conservan como archivo histórico, aunque las portadas oficiales cambian a V2.
- El catálogo `art/catalog.js` liga cada variante al **ID real** de su personaje. Los archivos han sido convertidos de PNG a WebP, sin recortes.

**Distribución:** Jaro tiene 2 variantes, Luna tiene 2, y los otros 9 aventureros tienen 3 cada uno.

## Clasificación de expresiones (propuestas, no hechos)

Las etiquetas `moods` describen lo que se ve en la ilustración: `alegre`, `risa`, `reflexivo`, `serio`, `guardia`, `sereno`, `cansancio`, `preocupacion`, `estudio`, `musica`, `determinacion`, etc. No se ha etiquetado ninguna imagen como combate o herida sin representación visual de ello. Si el sentido de una imagen cambia en una crónica, se corrigen las etiquetas explícitamente.

## Cómo se usan los retratos

- En **Aventureros**, la ficha y las tarjetas mantienen el retrato oficial.
- En la ficha hay una **galería** con las versiones aprobadas, incluido el oficial.
- En los diálogos de **Crónicas**, el retrato se resuelve por persona y por escena, pero **los capítulos antiguos conservan el oficial por defecto**.
- Las reglas editoriales pueden seleccionar una variante por ID exacto o por emoción declarada. La web no interpreta texto con IA ni elige al azar.
- Si una variante no existe, pertenece a otra persona o no está aprobada, se usa el retrato oficial.

### Ejemplo de metadatos en un capítulo nuevo

El capítulo puede añadir un campo `artDirection`:

```json
{
  "artDirection": {
    "defaultPortraits": {
      "adv_hpzq2ixhvxtq": "portrait-adv_hpzq2ixhvxtq-v2-a"
    },
    "sceneMoods": {
      "0": "alegre",
      "1": "reflexivo"
    },
    "scenes": {
      "1": {
        "adv_agorapai6eaw": "portrait-adv_agorapai6eaw-v2-a"
      }
    },
    "paragraphs": {
      "27": {
        "adv_hpzq2ixhvxtq": "portrait-adv_hpzq2ixhvxtq-v2-c"
      }
    }
  }
}
```

Los índices de escena empiezan en **0** y aumentan cada vez que hay un párrafo `***`; los índices de párrafo son los del array `paragraphs`, también empezando en 0.

Prioridad: **párrafo > escena > personaje por defecto > emoción de escena > retrato principal**. La validación por `characterId` impide asignar la imagen de Velasco a Jaro.

Solo aparecen retratos en diálogos que ya tienen `speakers[i]` identificado y cuando está activada la opción de mostrar retratos.

### Añadir más variantes en el futuro

Ejemplo (imagen ya subida a la carpeta correspondiente):

```bash
node scripts/register-art.mjs --id portrait-adv_agorapai6eaw-v3-a \
  --src jaro-v3-a.webp --kind portrait \
  --character-id adv_agorapai6eaw --label "Preocupado" \
  --moods "reflexivo,preocupacion" --edition v3
```

La entrada se registra como **draft**. Debe revisarse y aprobarse en la PR; nunca sobrescribir un ID anterior.

## Despliegue del lote recibido

La PR contiene código, catálogo y pruebas. Los 33 WebP ya se han subido a la **raíz** del repositorio; sus rutas se han reconciliado con el catálogo para evitar volver a subirlos.

Los archivos V2 están ya en la raíz del repositorio y el catálogo apunta exactamente a esos nombres. Verificar GitHub Actions y vista previa antes de fusionar. No deben moverse los ficheros ni crearse una carpeta `assets/` duplicada.

## Pruebas

`node --test tests/*.test.mjs` comprueba identidad, número de variantes, ausencia de sobrescritura, portadas y elección por capítulo/escena/párrafo. El smoke test de navegador comprueba las ocho secciones y las rutas de imágenes en la versión de prueba.
