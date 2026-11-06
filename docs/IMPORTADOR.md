# Importador de guardados · Fase 2 + primera actualización real

## Flujo recomendado desde el día visible 30

El repositorio incluye `data/approved-save-projection.json`: datos seguros de la última partida aprobada, sin conservar el guardado bruto del juego ni atributos ocultos. Esto permite comparar el próximo guardado sin recuperar el JSON anterior del chat.

1. Recibir el nuevo JSON en el chat y guardarlo **fuera** del repositorio público.
2. Ejecutar el comparador frente a la proyección aprobada:

```bash
node scripts/compare-saves.mjs \
  --previous data/approved-save-projection.json \
  --next "/ruta/La Corona de Barro NUEVO.json" \
  --campaign data/campaign.js \
  --baseline data/save-baseline.json \
  --out "/ruta/informe-nuevo"
```

3. Revisar la propuesta automática y los hechos registrados con ID; los vínculos nuevos, las escenas y las misiones desaparecidas necesitan decisión editorial.
4. Preparar PR con datos, cronología, una crónica seleccionada por relevancia y pruebas de regresión.
5. Después de aprobar la PR, generar una nueva proyección con el JSON original en entorno local:

```bash
node scripts/project-save.mjs \
  --input "/ruta/La Corona de Barro NUEVO.json" \
  --out "/ruta/proyeccion-nueva.json"
```

6. Copiar la proyección **revisada** a `data/approved-save-projection.json` en la misma PR, actualizar `data/save-baseline.json` con día y firma y comprobar que coinciden con el libro. Jamás subir el guardado bruto.

### Alcance de la comparación

El primer salto (día 20 → 30) se comparó contra la instantánea del libro, pues el JSON bruto del día 20 no estaba disponible. Desde el día 30, la proyección permite volver a comparar por IDs estables usando `compareSaves`, aunque no sustituye un guardado íntegro para campos que no fueron proyectados.

Consulta `docs/ACTUALIZACION_DIA_30.md` para ver el informe de referencia de la primera prueba de fuego.

---

## Qué hace

Lee dos exportaciones **Dungeons & Dynasties v26**, compara su contenido y prepara un informe. Si se indica el libro publicado y la línea base, también genera un **borrador** de actualización de campos mecánicos.

No sube nada, no modifica el guardado ni el libro original y **nunca genera capítulos automáticamente**.

## Comandos (Node.js 22+)

Comparación de dos partidas:

    node scripts/compare-saves.mjs --previous "/ruta/guardado-anterior.json" --next "/ruta/guardado-nuevo.json" --out ./revisiones/comparativa-01

Propuesta frente al último guardado aprobado (año 1, día visible 20):

    node scripts/compare-saves.mjs --previous "/ruta/La Corona de Barro 2026-11-05 17-27.json" --next "/ruta/guardado-nuevo.json" --campaign data/campaign.js --baseline data/save-baseline.json --out ./revisiones/dia-siguiente

Nota: la opción --campaign solo admite el guardado anterior aprobado (comprobación de día y firma) y un libro alineado con ese guardado.

## Archivos generados

- report.md: resumen legible de cambios y cuestiones editoriales.
- diff.json: detalle estructurado, útil para ChatGPT.
- campaign.proposed.js: cambios mecánicos permitidos, **no** se publica directamente.
- changes.json: campos propuestos y revisión pendiente.
- baseline.proposed.json: línea base para una siguiente actualización, únicamente si se aprueba la publicación.

La salida es local. Se recomienda usar una ruta fuera del repositorio. \`revisiones/\` queda ignorada por Git.

## Campos mecánicos que sí se proponen

- Día visible, oro, renombre, miembros, fallecidos, incursiones y porcentaje despejado.
- Niveles, experiencia, moral, condición, tensión, fatiga, salario y atributos de personajes **existentes**.
- Valores numéricos de vínculos **existentes**, sin deducir amistades ni etiquetas.
- Instalaciones, nivel del salón y encargos activos (sin afirmar resultados).
- Instantánea del día cuando haya avance.

## Campos protegidos

La salida NO sobreescribe capítulos, canon literario, memorias, biografías, cronología, fichas de nuevos personajes, clasificaciones ambiguas, antiguas ediciones ni ilustraciones.

Altas, bajas, muertes, nuevos vínculos, conclusiones de expediciones y cambios de división se señalan para revisión editorial.

## Seguridad y continuidad

- Rechaza guardados incompatibles, de otra Casa o retrocesos de día.
- Compara héroes por IDs persistentes, nunca por nombre.
- Compara vínculos sin depender del orden del par.
- Impide generar un borrador sobre un libro desalineado o una línea base incorrecta.
- La línea base describe solo la identidad mínima del último JSON aprobado; los guardados originales NO deben subirse a un repositorio público.
- Si cambia el formato del juego en un parche, actualizar el adaptador y sus pruebas antes de intentar importar.

## Procedimiento al recibir un guardado en ChatGPT

1. Abrir el guardado actual y la última línea base aprobada.
2. Ejecutar el importador y leer el informe.
3. Revisar las diferencias que requieren interpretación editorial.
4. Preparar un PR con solo los datos aprobados (y capítulos si se encargan expresamente).
5. Pasar pruebas automáticas, comprobar vista previa de Pages y fusionar en \`main\`.
6. Actualizar la línea base únicamente en el mismo PR aprobado.

No ejecutar actualizaciones que sobrescriban \`main\` directamente.
