/* Adaptador de claves de retratos para la interfaz existente. Catálogo: art/catalog.js */
const ART=Object.fromEntries(ART_CATALOG.items.map(item=>[item.legacyKey,item.src]));
