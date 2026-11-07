# Sistema editorial de La Corona de Barro (fase 3)

## Objetivo
Preservar el canon y facilitar capítulos e imágenes incrementales sin reescribir la aplicación ni el guardado.

## Capítulos
- novel/chapters/index.js inicializa BOOK.chapters.
- novel/chapters/<id>.js contiene cada capítulo publicado. index.html los carga en orden.
- novel/chapters.js permanece como **copia histórica** para comparación, pero no se carga.
- Los cuatro capítulos originales se han preservado sin alteraciones.

Registrar un nuevo capítulo editorial previamente revisado:

    node scripts/add-chapter.mjs --file /ruta/capitulo-aprobado.json --dry-run
    node scripts/add-chapter.mjs --file /ruta/capitulo-aprobado.json

Requiere id, chapter, title, years, lead, source, paragraphs, facts y characterIds válidos. Valida las atribuciones mediante speakers y acepta IDs de secundarios declarados en literaryCharacters. Rechaza sobrescrituras, no publica por sí mismo y solo modifica index.html y un archivo nuevo.

## Motor editorial y continuidad
- novel/editorial-policy.js: prompt, guía y formatos para la Mesa del Escriba.
- novel/continuity.js: perfiles, canonAsOf, reglas de vínculos y orientaciones literarias.
- novel/relationships.js: vínculos literarios confirmados publicados, asociados por IDs permanentes.
- novel/narrative-engine.js: adaptador compatible con la interfaz existente.

La verdad mecánica se obtiene de la partida. El canon literario pertenece a los capítulos y vínculos publicados. No deducir causas a partir de meros deltas del guardado ni alterar escenas sin aprobación.

## Arte persistente
- art/catalog.js guarda id estable, src, kind, status y characterId cuando corresponda.
- art-manifest.js expone a ART **solo recursos aprobados** con legacyKey, sin alterar las 17 imágenes existentes.
- Las imágenes históricas siguen en la raíz; para las nuevas usar assets/portraits, assets/scenes y assets/covers.

Una vez copiada una imagen al repositorio local:

    node scripts/register-art.mjs --id scene-regreso-jaro --src assets/scenes/regreso-jaro.webp --kind scene

Tipos válidos: portrait, scene, cover, crest, dialogue, character-art, placeholder.
Admite --character-id adv_... y opcionalmente --legacy-key NUEVA_CLAVE.
Las nuevas entradas comienzan como draft y no aparecen en la web hasta su aprobación.
No reutilizar IDs ni claves de recursos ya aprobados.

## Publicación y control
1. Comparar el nuevo guardado (fase 2) y revisar cambios.
2. Añadir capítulo o imagen sin tocar los anteriores; prevalidar capítulos con --dry-run.
3. Comprobar el índice con `node scripts/check-chapter-order.mjs` si se ha añadido una crónica.
4. El CI de GitHub valida solamente archivos modificados; no ejecuta una batería de tests ni abre un navegador automáticamente.
5. Publicar en `main` tras revisar el canon; Cloudflare despliega la versión por separado.

No subir guardados originales ni contenido privado a un repositorio público.
