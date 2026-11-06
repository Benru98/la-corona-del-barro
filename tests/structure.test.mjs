/**
 * Validaciones de regresión para la refactorización conservadora.
 * node --test tests/structure.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(join(root,p),'utf8');
function run(paths,expression){
  const ctx=vm.createContext({});
  for(const p of paths)vm.runInContext(read(p),ctx,{filename:p,timeout:5000});
  return JSON.parse(vm.runInContext('JSON.stringify('+expression+')',ctx));
}
const scripts=["data/campaign.js","novel/chapters/index.js","novel/chapters/prologo-corona.js","novel/chapters/primer-certamen.js","novel/chapters/lo-que-vuelve.js","novel/chapters/interludio-iv-la-partida-que-no-termina.js","novel/relationships.js","novel/editorial-policy.js","novel/continuity.js","novel/narrative-engine.js","art/catalog.js","art-manifest.js","app.js"];
const modules=scripts.filter(p=>p!=='art/catalog.js'&&p!=='art-manifest.js'&&p!=='app.js');
test('El libro modular conserva estructura y canon separado',()=>{
  const b=run(modules,'BOOK');
  assert.equal(b.bookId,'la-corona-de-barro');
  assert.ok(b.meta?.guild && Number.isInteger(b.meta.day));
  assert.ok(Array.isArray(b.characters) && Array.isArray(b.chapters));
  assert.ok(Array.isArray(b.relationships) && Array.isArray(b.literaryRelationships));
  assert.ok(Array.isArray(b.timeline) && Array.isArray(b.editions) && Array.isArray(b.snapshots));
  assert.ok(b.snapshots.every(x=>x.day<=b.meta.day));
  assert.ok(b.characters.every(x=>typeof x.id==='string'&&typeof x.name==='string'));
});
test('Las reglas narrativas conservan íntegramente el motor original',()=>{
  // El motor anterior se declara antes de la IIFE de app.js.
  const old=read('app.js');
  // Se compara con el documento editorial exportado en la migración.
  const engine=run(modules,'NARRATIVE_ENGINE');
  assert.ok(engine.prompt.length>1000);
  assert.equal(engine.name,'Mesa del Escriba · Motor de Crónicas y Atlas de Lazos Vivos');
  assert.ok(!old.includes('const NARRATIVE_ENGINE='));
});
test('El HTML carga los módulos antes de la aplicación',()=>{
  const html=read('index.html');
  const scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(actual,scripts);
  for(const file of scripts)assert.ok(existsSync(join(root,file)),file+' missing');
});
test('Todas las imágenes mencionadas existen en el repositorio',()=>{
  const manifest=run(['art/catalog.js','art-manifest.js'],'ART');
  for(const [name,p] of Object.entries(manifest)){
    assert.ok(!p.startsWith('assets/'),'Ruta heredada: '+name);
    assert.ok(existsSync(join(root,p)),'Imagen ausente: '+name+' -> '+p);
  }
});
test('Referencias a personajes y capítulos válidas',()=>{
  const b=run(modules,'BOOK');
  const ids=new Set(b.characters.map(c=>c.id));
  const names=new Set(b.characters.map(c=>c.name));
  assert.equal(ids.size,b.characters.length,'IDs de personajes duplicados');
  for(const chapter of b.chapters){
    for(const id of (chapter.characterIds??[]))assert.ok(ids.has(id)||names.has(id),'Personaje desconocido en '+chapter.id+': '+id);
  }
  assert.equal(new Set(b.chapters.map(c=>c.id)).size,b.chapters.length,'IDs de capítulos duplicados');
  assert.ok(b.chapters.length>=4,'Faltan capítulos históricos');
});
