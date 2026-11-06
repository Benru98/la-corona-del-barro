# Informe de actualización — La Corona de Barro · día visible 30

**Fecha de recepción:** 2026-11-06. **Juego:** Dungeons & Dynasties v26.  
**Origen recibido:** `La Corona de Barro 2026-11-06 09-55.json` (día interno 29, visible 30).  
**Referencia publicada:** `data/campaign.js` (día visible 20, último guardado firmado `gpgej2.iy6hn0`).

> **Límite de la comparación:** el archivo JSON bruto anterior no estaba disponible. Los deltas de este informe proceden de los campos conservados en el libro público del día 20; la pertenencia de un evento al intervalo se verifica por el día y su presencia en el libro. No equivale a comparar dos guardados completos. Se mantiene intacto el JSON recibido y **no se incorpora al repositorio público**.

## Resultado resumido

| Indicador | Antes: día 20 | Ahora: día 30 | Diferencia |
|---|---:|---:|---:|
| Tesorería | 1.446 g | 2.485 g | +1.039 g |
| Renombre | 12 | 26 | +14 |
| Incursiones despejadas | 6 | 8 | +2 |
| Encuentros de liga ganados | 2 | 3 | +1 |
| Puntos de liga | 6 | 9 | +3 |
| Posición anunciada | 1.º/12 | 1.º/12 | = |
| Aventureros | 11 | 11 | = |
| Fallecidos | 0 | 0 | = |
| Vínculos mecánicos | 26 | 31 | +5 |
| Sinergias descubiertas | 3 | 4 | +1 |

**Matiz de clasificación:** La Corona figura primera en los partes del juego, pero comparte los 9 puntos con La Cofradía de Azulhondo y La Guardia de Mediovado. No presentar una ventaja exclusiva en puntos.

## Hitos confirmados, ordenados cronológicamente

1. **Día interno 20 (visible 21):** el archivo descubre la historia de una casa calcinada en Las Marcas Cenicientas y el nombre de Izgar sin Miedo. No se ha resuelto la trama.
2. **Día interno 22 (visible 23):** Luna resuelve triunfalmente el encargo de Dienteamarillo el Ahíto (+61 g, +2 renombre).
3. **Día interno 23 (visible 24):** Jaro gana los Festejos de Marea Verde, 1.º de 16 (+500 g, +4 renombre). Se celebra en la Casa.
4. **Día interno 23 (visible 24):** Horno Ardiente figura despejada; Brugo se reconoce mentor de Velasco y Jaro toma a Ulf bajo su ala.
5. **Día interno 23 (visible 24):** nueva nómina neta de −204 g (+62 estipendio, −176 salarios, −90 mantenimiento).
6. **Día interno 24 (visible 25):** Luna mueve su cama lejos de Xara; el motivo no consta. Yvaldo elogia sus remiendos.
7. **Día interno 25 (visible 26):** el gremio gana una mascota: La Reina Zarigüeya.
8. **Día interno 28 (visible 29):** victoria en Guarida Salvaje frente a El Cónclave de Azulhondo; el parte registra la tercera victoria de liga y una nueva sinergia, Línea de Hostigamiento (+5 % daño grupal).
9. **Día interno 28 (visible 29):** Belzar y Jaro discuten a lo grande y no se reconcilian; Belzar y Yvaldo se acercan. El grupo rechaza unos dados de un desconocido y Yvaldo evita un desvío hacia un tesoro custodiado.

### Situación pendiente al día 30

- **Luna, Belzar, Jaro y Yvaldo:** fuera en una nueva incursión registrada en la región `elderwood`, regreso previsto para el **día visible 34**. No atribuir resultado ni bajas.
- **Íñigo:** continúa cedido a La Guardia de Conchamuelle; regreso previsto el **día visible 37**.
- **Sin fallecidos ni nuevas incorporaciones al plantel**, aunque existen candidatos a contratación.

## Cambios personales destacados

| Personaje | Nivel | Moral | Tensión | Fatiga | Nota |
|---|---|---|---|---|---|
| Luna | 2 → 2 | 85 → 100 | 0 → 16 | 10 → 21 | Encargo resuelto; vuelve a estar fuera |
| Belzar | 5 → 6 | 53 → 64 | 55 → 42 | 32 → 32 | Nuevo nivel; fractura con Jaro |
| Ulf | 2 → 2 | 59 → 63 | 27 → 34 | 20 → 24 | Jaro lo toma bajo su ala |
| Velasco | 5 → 5 | 55 → 57 | 52 → 55 | 36 → 38 | Mentoría de Brugo |
| Jaro | 6 → 6 | 72 → 88 | 75 → 75 | 49 → 66 | Campeón del festejo; disputa abierta |
| Brugo | 8 → 8 | 64 → 64 | 35 → 40 | 34 → 35 | Mentoría espontánea |
| Íñigo | 1 → 1 | 81 → 81 | 0 → 0 | 10 → 10 | Cesión en curso |
| Ruc | 1 → 1 | 80 → 88 | 0 → 0 | 4 → 0 | Sigue en la Casa |
| Xara | 1 → 1 | 70 → 78 | 57 → 31 | 41 → 23 | Distancia no explicada con Luna |
| Yvaldo | 5 → 5 | 87 → 96 | 69 → 56 | 50 → 46 | Acercamiento a Belzar |
| Turca | 4 → 4 | 71 → 79 | 23 → 13 | 26 → 16 | Sin nuevo arco personal confirmado |

**No confundir escalas:** se conserva `firstJoin.rating` como valoración inicial; el `currentAbility` del juego se incorpora por separado, sin sustituir esa valoración histórica.

## Vínculos

- **Belzar–Jaro:** +14 → −0,5 (−14,5). Discusión confirmada, no reconciliada.
- **Belzar–Yvaldo:** +14 → +32,925 (+18,925). Acercamiento durante Guarida Salvaje.
- **Brugo–Velasco:** +6,175 → +25 (+18,825). MentorId: Brugo.
- **Jaro–Ulf:** +18 → +21 (+3). MentorId: Jaro.
- **Jaro–Velasco:** +28,9375 → +31 (+2,0625). La atracción solo pertenece al canon literario.
- **5 pares nuevos:** Xara–Luna (−2), Ruc–Luna (−2), Yvaldo–Luna (+6,475), Belzar–Luna (+0,75) y Jaro–Luna (+0,5). Los valores por sí solos no prueban amistad ni romance.

## Capítulo V — La medida de una victoria

**Motor editorial:** las victorias del festejo y la Guarida Salvaje sirven de anclaje, pero la novela dramatiza la incomodidad de la fama, una mentoría discreta y el conflicto entre Belzar y Jaro. No convierte en hecho confirmado la causa concreta de la discusión. Se mantienen abiertas la expedición actual, la cesión de Íñigo y la relación incipiente Velasco–Jaro.

- Nuevo archivo: `novel/chapters/la-medida-de-una-victoria.js`.
- 2.161 palabras; 105 párrafos; 56 diálogos con IDs explícitos.
- Dirección de arte por escena con variantes del catálogo V2 y retrato oficial como alternativa segura.
- Los cuatro capítulos anteriores y sus textos no se han modificado.

## Mejoras incorporadas para la siguiente actualización

**Antes:** la versión del libro y una firma mínima del archivo anterior obligaban a recuperar manualmente el JSON previo, dificultando una comparación automática.

**Ahora:** `data/approved-save-projection.json` conserva una representación reducida del guardado, con personajes, atributos actuales, vínculos, encargos, encuentros, hitos y edificios. El archivo no incluye atributos ocultos ni el guardado original completo.

Después de aprobar esta PR, ante el siguiente guardado:

```bash
node scripts/compare-saves.mjs \
  --previous data/approved-save-projection.json \
  --next "/ruta/nuevo-guardado.json" \
  --campaign data/campaign.js \
  --baseline data/save-baseline.json \
  --out "/ruta/revision"
```

El comparador podrá producir un informe determinista y una propuesta mecánica sin solicitar el JSON de la actualización anterior. Tras revisar y aprobar, `scripts/project-save.mjs` genera la proyección siguiente. El arte, las biografías y la historia continúan sujetos a revisión editorial.

**Próximos puntos a optimizar:** correlación automática de eventos por `id`, validación de cambios de estado de misiones, selección asistida de capítulos relevantes y comprobación de la continuidad narrativa desde una única fuente.
