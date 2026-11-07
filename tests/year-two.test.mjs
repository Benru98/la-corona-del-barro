import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function moduleData(path,expr){const ctx=vm.createContext({});vm.runInContext(read(path),ctx,{filename:path});return JSON.parse(vm.runInContext('JSON.stringify('+expr+')',ctx));}
const book=moduleData('data/campaign.js','BOOK');
const dispatch=moduleData('home/dispatches.js','HOUSE_DISPATCHES');
const summary=moduleData('annual/summaries.js','ANNUAL_SUMMARIES');
const base=JSON.parse(read('data/save-baseline.json'));
const projection=JSON.parse(read('data/approved-save-projection.json'));
test('Año II y fuente aprobada coherentes',()=>{
 assert.equal(book.meta.year,2);
 assert.equal(book.meta.day,150);
 assert.equal(book.editions.at(-1).id,'E0028');
 assert.equal(book.stats.members,11);
 assert.equal(book.stats.dead,1);
 assert.equal(book.stats.gold,1589);
 assert.equal(book.stats.renown,226);
 assert.equal(book.stats.delves,25);
 assert.equal(book.stats.clearRate,92);
 assert.equal(book.stats.bonds,49);
 assert.equal(book.stats.salaryCycle,220);
 assert.equal(base.lastApprovedVisibleDay,150);
 assert.equal(base.lastApprovedInternalDay,149);
 assert.equal(base.lastApprovedSaveSignature,'fmyvti.jr6zxc');
 assert.equal(projection.sig,base.lastApprovedSaveSignature);
 assert.equal(projection.guild.day,149);
 assert.equal(Object.keys(projection.guild.bonds).length,49);
});
test('Frontera refleja tres triunfos y posición real',()=>{
 assert.equal(book.world.division,'Frontera');
 assert.deepEqual([book.world.league.position,book.world.league.of,book.world.league.points,book.world.league.played,book.world.league.won],[2,12,9,3,3]);
 assert.equal(book.world.league.leader,'El Consejo de Hielo');
 assert.equal(book.stats.titles,1);
 assert.equal(book.stats.promotion,1);
 assert.equal(book.world.meetings.length,15);
 assert.equal(book.world.questLog.length,6);
});
test('Todos los aventureros vivos permanecen en plantilla aunque estén de incursión',()=>{
 const living=book.characters.filter(c=>c.status!=='caído'&&c.status!=='retirada');
 assert.equal(living.length,11);
 assert.equal(book.characters.find(c=>c.name==='Brugo').status,'caído');
 assert.equal(book.characters.find(c=>c.name==='Turca de la Tormenta').status,'retirada');
 assert.equal(book.characters.find(c=>c.name==='Yvaldo Guardapuerto').aspirant,false);
 const exp=book.world.activeExpedition;
 assert.equal(exp.returnsDay,154);
 assert.equal(exp.outcome,'pendiente');
 assert.equal(exp.heroIds.length,4);
 for(const id of exp.heroIds){
   const hero=living.find(c=>c.id===id);
   assert.ok(hero);
   assert.equal(hero.status,'en incursión');
   assert.equal(hero.away.returnsDay,154);
 }
 assert.deepEqual(living.filter(c=>c.post==='Vanguardia').length,5);
 assert.deepEqual(living.filter(c=>c.post==='Segunda Guardia').length,4);
 assert.deepEqual(living.filter(c=>c.post==='Reserva').length,2);
});
test('El resumen anual se conserva y la Gaceta sigue el día actual',()=>{
 assert.equal(summary.years[0].year,1);
 assert.equal(summary.years[0].title,'El año que hicimos casa');
 assert.equal(dispatch.latestDay,150);
 assert.equal(dispatch.latestEdition,'E0028');
 assert.equal(dispatch.issues[0].day,150);
 assert.ok(dispatch.issues[0].eye.length>=5);
 const html=read('index.html');
 assert.ok(html.includes('interludio-xxiii-las-piedras-saben-escuchar.js'));
 const ctx=vm.createContext({});
 vm.runInContext(read('data/campaign.js'),ctx);
 vm.runInContext(read('novel/chapters/index.js'),ctx);
 vm.runInContext(read('novel/chapters/interludio-xxiii-las-piedras-saben-escuchar.js'),ctx);
 const chapters=JSON.parse(vm.runInContext('JSON.stringify(BOOK.chapters)',ctx));
 assert.equal(chapters[0].id,'interludio-xxiii-las-piedras-saben-escuchar');
 assert.ok(chapters[0].paragraphs.length>40);
 for(const i of Object.keys(chapters[0].speakers))assert.ok(chapters[0].paragraphs[i].startsWith('—'));
});
test('Patrullas muestran plantilla, no solo disponibles',()=>{
 const js=read('app.js');
 const start=js.indexOf('function patrols(){');
 const end=js.indexOf('function bondTone(',start);
 const patrols=js.slice(start,end);
 assert.ok(patrols.includes('const living=livingMembers()'));
 assert.ok(!patrols.includes('const living=house().available;'));
 assert.ok(patrols.includes('patrol-status away'));
});
