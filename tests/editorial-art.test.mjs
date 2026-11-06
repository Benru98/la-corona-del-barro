import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>readFileSync(join(root,file),'utf8');
function evaluate(files,expr) {
 const context=vm.createContext({});
 for(const f of files)vm.runInContext(read(f),context,{filename:f,timeout:8000});
 return JSON.parse(vm.runInContext('JSON.stringify('+expr+')',context));
}
const chapterFiles=[
 'novel/chapters/index.js',
 'novel/chapters/prologo-corona.js',
 'novel/chapters/primer-certamen.js',
 'novel/chapters/lo-que-vuelve.js',
 'novel/chapters/interludio-iv-la-partida-que-no-termina.js'
];
const editorialFiles=['novel/editorial-policy.js','novel/continuity.js','novel/narrative-engine.js'];
const artFiles=['art/catalog.js','art-manifest.js'];

test('Los cuatro capítulos conservan exactamente su contenido y orden original',()=>{
 const previous=evaluate(['data/campaign.js','novel/chapters.js'],'BOOK.chapters');
 const next=evaluate(['data/campaign.js',...chapterFiles],'BOOK.chapters');
 assert.deepEqual(next,previous);
 assert.equal(next.length,4);
 assert.equal(new Set(next.map(c=>c.id)).size,next.length);
});
test('El ensamblador narrativo conserva todas las claves y fuentes de continuidad',()=>{
 const result=evaluate(editorialFiles,'NARRATIVE_ENGINE');
 const policy=evaluate(editorialFiles,'EDITORIAL_POLICY');
 const canon=evaluate(editorialFiles,'LITERARY_CONTINUITY');
 assert.equal(result.prompt,policy.prompt);
 assert.equal(result.guide,policy.guide);
 assert.deepEqual(result.formats,policy.formats);
 assert.deepEqual(result.profiles,canon.profiles);
 assert.deepEqual(result.relationDirections,canon.relationDirections);
 assert.deepEqual(result.relationshipRules,canon.relationshipRules);
 assert.deepEqual(result.canonAsOf,canon.canonAsOf);
 assert.equal(result.name,'Mesa del Escriba · Motor de Crónicas y Atlas de Lazos Vivos');
 assert.equal(result.prompt.length>20000,true);
});
test('Las ilustraciones aprobadas conservan las rutas de producción',()=>{
 const catalog=evaluate(artFiles,'ART_CATALOG'),manifest=evaluate(artFiles,'ART');
 const book=evaluate(['data/campaign.js'],'BOOK');
 assert.equal(catalog.schemaVersion,'1.0.0');
 assert.equal(catalog.items.length,17);
 assert.equal(new Set(catalog.items.map(x=>x.id)).size,catalog.items.length);
 assert.equal(new Set(catalog.items.map(x=>x.legacyKey)).size,catalog.items.length);
 for(const item of catalog.items){
  assert.equal(item.status,'approved',item.id);
  assert.ok(item.id.length>=3);
  assert.ok(existsSync(join(root,item.src)),item.src);
  assert.equal(manifest[item.legacyKey],item.src);
  if(item.characterId)assert.ok(book.characters.some(c=>c.id===item.characterId),'Desconocido: '+item.characterId);
 }
 assert.equal(manifest.groupCover,'portada-grupal.webp');
 assert.equal(manifest['Velasco Rivadeneira'],'velasco.webp');
 assert.equal(manifest.maestreDialogue,'maestre-dialogo.webp');
});
test('Ninguna capa editorial modifica relaciones mecánicas ni personajes',()=>{
 const base=evaluate(['data/campaign.js'],'BOOK');
 const expanded=evaluate(['data/campaign.js',...chapterFiles,'novel/relationships.js',...editorialFiles,...artFiles],'BOOK');
 assert.deepEqual(expanded.characters,base.characters);
 assert.deepEqual(expanded.relationships,base.relationships);
 assert.deepEqual(expanded.stats,base.stats);
 assert.deepEqual(expanded.world,base.world);
 assert.equal(expanded.chapters.length,4);
 assert.equal(expanded.literaryRelationships.length,26);
});
