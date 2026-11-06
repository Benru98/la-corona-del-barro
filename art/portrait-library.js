/* Biblioteca visual de la Casa: selección estable, explícita y sin cambios retroactivos.
 * Funciona con ART_CATALOG y no necesita red ni IA durante la lectura.
 */
const PORTRAIT_LIBRARY = (()=>{
  const approved=()=>ART_CATALOG.items.filter(x=>x.status==='approved');
  const allFor=characterId=>approved().filter(x=>x.kind==='portrait'&&x.characterId===characterId);
  const byId=(artId,characterId)=>{
    const item=approved().find(x=>x.id===artId&&x.kind==='portrait'&&x.characterId===characterId);
    return item||null;
  };
  const primary=characterId=>allFor(characterId).find(x=>x.legacyKey)||null;
  const variants=characterId=>allFor(characterId).filter(x=>!x.legacyKey);
  function resolve(characterId,chapter,sceneIndex,paragraphIndex,defaultSrc) {
    const direction=chapter?.artDirection;
    const explicit=[
      direction?.paragraphs?.[String(paragraphIndex)]?.[characterId],
      direction?.scenes?.[String(sceneIndex)]?.[characterId],
      direction?.defaultPortraits?.[characterId]
    ];
    for(const id of explicit){if(typeof id!=='string')continue;const item=byId(id,characterId);if(item)return item.src;}
    // Etiquetas opcionales definidas por el escritor; no se deduce emoción leyendo el texto.
    const mood=direction?.sceneMoods?.[String(sceneIndex)];
    if(typeof mood==='string'&&mood){
      const matches=variants(characterId).filter(x=>Array.isArray(x.moods)&&x.moods.includes(mood));
      // Selección estable por escena: volver a abrir un capítulo produce la misma imagen.
      if(matches.length)return matches[Math.abs(sceneIndex)%matches.length].src;
    }
    return primary(characterId)?.src||defaultSrc;
  }
  return Object.freeze({allFor,primary,variants,byId,resolve});
})();
