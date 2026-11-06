import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const context=vm.createContext({});
for(const file of ['data/campaign.js','art/catalog.js','art-manifest.js','art/portrait-library.js'])
 vm.runInContext(readFileSync(join(root,file),'utf8'),context,{filename:file});
const data=JSON.parse(vm.runInContext('JSON.stringify({book:BOOK,catalog:ART_CATALOG,art:ART})',context));
const run=expression=>JSON.parse(vm.runInContext('JSON.stringify('+expression+')',context));
test('Todas las ilustraciones v2 están asociadas a un personaje estable y son utilizables',()=>{
 const variants=data.catalog.items.filter(x=>x.kind==='portrait'&&x.edition==='v2');
 assert.equal(variants.length,31);
 assert.equal(new Set(variants.map(x=>x.id)).size,31);
 for(const item of variants){
  assert.ok(data.book.characters.some(c=>c.id===item.characterId),item.id);
  assert.equal(item.status,'approved',item.id);
  assert.ok(item.src.endsWith('.webp'),item.id);
  assert.ok(Array.isArray(item.moods)&&item.moods.length>0,item.id);
  assert.ok(existsSync(join(root,item.src)), 'Imagen V2 pendiente de subir: '+item.src);
 }
});
test('La nueva portada institucional convive con la vertical y preserva las portadas históricas',()=>{
 assert.equal(data.art.groupCover,'portada-casa.webp');
 assert.ok(data.catalog.items.some(x=>x.id==='cover-group-v2-historical'&&x.src==='corona-grupal-v2.webp'));
 assert.ok(existsSync(join(root,'corona-grupal-v2.webp')));
 assert.equal(data.art.cover,'cronicas-fantasia-v2.webp');
 assert.ok(existsSync(join(root,data.art.groupCover)));
 assert.ok(existsSync(join(root,data.art.cover)));
 assert.ok(existsSync(join(root,'portada-grupal.webp')));
 assert.ok(existsSync(join(root,'portada-antigua.webp')));
});
test('El catálogo del personaje no mezcla retratos de otros aventureros',()=>{
 const jaro='adv_agorapai6eaw',velasco='adv_hpzq2ixhvxtq';
 assert.equal(run("PORTRAIT_LIBRARY.variants('"+jaro+"').length"),2);
 assert.equal(run("PORTRAIT_LIBRARY.variants('"+velasco+"').length"),3);
 const wrong=run("PORTRAIT_LIBRARY.byId('portrait-"+velasco+"-v2-a','"+jaro+"')");
 assert.equal(wrong,null);
});
test('La selección por párrafo prevalece sobre escena y selección general',()=>{
 const jaro='adv_agorapai6eaw';
 const chapter={artDirection:{
  defaultPortraits:{[jaro]:'portrait-'+jaro+'-v2-a'},
  scenes:{'1':{[jaro]:'portrait-'+jaro+'-v2-b'}},
  paragraphs:{'19':{[jaro]:'portrait-'+jaro+'-v2-a'}}
 }};
 context.testInput={jaro,chapter};
 const first=run("PORTRAIT_LIBRARY.resolve(testInput.jaro,testInput.chapter,1,19,'fallback.webp')");
 const second=run("PORTRAIT_LIBRARY.resolve(testInput.jaro,testInput.chapter,1,20,'fallback.webp')");
 assert.match(first, /jaro-v2-a\.webp$/);
 assert.match(second,/jaro-v2-b\.webp$/);
});
test('Una variante desconocida o cruzada no rompe el retrato oficial',()=>{
 const jaro='adv_agorapai6eaw';
 context.testInput={jaro,chapter:{artDirection:{defaultPortraits:{[jaro]:'portrait-adv_hpzq2ixhvxtq-v2-a'}}}};
 const path=run("PORTRAIT_LIBRARY.resolve(testInput.jaro,testInput.chapter,0,1,'fallback.webp')");
 assert.equal(path,'jaro.webp');
 const absent=run("PORTRAIT_LIBRARY.resolve(testInput.jaro,{},0,1,'fallback.webp')");
 assert.equal(absent,'jaro.webp');
});
test('Si se declara una emoción, la selección se mantiene determinista',()=>{
 const jaro='adv_agorapai6eaw';
 context.testInput={jaro,chapter:{artDirection:{sceneMoods:{'2':'serio'}}}};
 const expr="PORTRAIT_LIBRARY.resolve(testInput.jaro,testInput.chapter,2,5,'fallback.webp')";
 assert.equal(run(expr),run(expr));
 assert.match(run(expr),/jaro-v2-[ab]\.webp$/);
});
