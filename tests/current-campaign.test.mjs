import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const load=(file,expr)=>{
 const context=vm.createContext({});
 vm.runInContext(read(file),context,{filename:file,timeout:10000});
 return JSON.parse(vm.runInContext('JSON.stringify('+expr+')',context,{timeout:10000}));
};
const book=load('data/campaign.js','BOOK');
const dispatch=load('home/dispatches.js','HOUSE_DISPATCHES');
const base=JSON.parse(read('data/save-baseline.json'));
const projection=JSON.parse(read('data/approved-save-projection.json'));
const active=book.characters.filter(c=>c.status!=='caído'&&c.status!=='retirada'&&c.status!=='vendida');
const fallen=book.characters.filter(c=>c.status==='caído');

test('Fuente, baseline, proyeccion y edicion coinciden sin version escrita a mano',()=>{
 assert.equal(base.game,'Dungeons & Dynasties');
 assert.equal(base.lastApprovedSaveSignature,projection.sig);
 assert.equal(base.lastApprovedInternalDay,projection.guild.day);
 assert.equal(base.lastApprovedVisibleDay,projection.guild.day+1);
 assert.equal(book.meta.day,base.lastApprovedVisibleDay);
 assert.equal(book.world.sourcesCurrent,base.lastApprovedSource);
 assert.equal(dispatch.latestDay,book.meta.day);
 assert.equal(dispatch.latestEdition,book.editions.at(-1).id);
 assert.equal(dispatch.issues[0].edition,dispatch.latestEdition);
 assert.equal(dispatch.issues[0].day,book.meta.day);
 assert.equal(book.stats.members,projection.guild.roster.length);
 assert.equal(book.stats.dead,projection.guild.fallen.length);
 assert.equal(book.stats.gold,projection.guild.gold);
 assert.equal(book.stats.renown,projection.guild.renown);
 assert.equal(book.stats.delves,projection.guild.tally.delves);
 assert.equal(book.stats.clearRate,Math.round(100*projection.guild.tally.cleared/Math.max(1,projection.guild.tally.delves)));
});

test('Los vivos, el memorial y las expediciones respetan sus IDs',()=>{
 const byId=new Map(book.characters.map(c=>[c.id,c]));
 assert.equal(byId.size,book.characters.length,'Personajes duplicados');
 assert.equal(active.length,projection.guild.roster.length);
 assert.equal(fallen.length,projection.guild.fallen.length);
 for(const p of projection.guild.roster){
  const hero=byId.get(p.id);
  assert.ok(hero,'Falta aventurero vivo: '+p.name);
  assert.notEqual(hero.status,'caído',p.name);
  assert.notEqual(hero.status,'retirada',p.name);
  assert.equal(hero.name,p.name,'ID mezclado');
  assert.equal(hero.level,p.level,'Nivel desincronizado: '+p.name);
  assert.equal(hero.currentAbility,Math.round((p.currentAbility??0)*1000)/1000,'CA incorrecta: '+p.name);
  if(p.potentialAbility!==undefined)assert.equal(hero.potentialAbility,Math.round(p.potentialAbility*1000)/1000,'PA incorrecta: '+p.name);
  if(hero.gameRating!=null){
   assert.ok(hero.gameRating>0&&hero.gameRating<=100,'Valoracion de clase fuera de escala');
   assert.notEqual(hero.ratingAtJoin,hero.currentAbility,'Posible confusion de escala '+p.name);
  }
 }
 for(const entry of projection.guild.fallen){
  const hero=byId.get(entry.id);
  assert.ok(hero,'Falta personaje caido en memorial');
  assert.equal(hero.status,'caído');
 }
 const away=projection.guild.roster.filter(h=>h.away?.delve);
 if(away.length){
  assert.ok(book.world.activeExpedition,'Incursion en guardado sin registrar');
  assert.deepEqual([...book.world.activeExpedition.heroIds].sort(),away.map(x=>x.id).sort());
  assert.ok(away.every(h=>book.world.activeExpedition.returnsDay===h.away.returnsDay+1));
 }else{
  assert.ok(!book.world.activeExpedition||book.world.activeExpedition.outcome!=='pendiente',
    'No quedan aventureros en incursión; estado pendiente desfasado');
 }
});

test('La liga y la economia conservan procedencia y formulas',()=>{
 const g=projection.guild,leag=book.world.league;
 const own=g.league.playerStanding?.[0];
 if(own){
  assert.equal(leag.points,own.points);
  assert.equal(leag.played,own.played);
  assert.equal(leag.won,own.won);
 }
 assert.equal(book.stats.salaryCycle,g.roster.reduce((sum,p)=>sum+(p.oathWage||0),0)+(book.world.staff||[]).reduce((sum,p)=>sum+(p.wage||0),0));
 if(book.world.finance?.asOfVisibleDay===book.meta.day){
  const {current}=book.world.finance;
  assert.equal(current.netBeforeDelves,current.stipend-current.delverWages-current.staffWages-current.upkeep);
  assert.equal(book.world.finance.netWithAvgDelves,current.netBeforeDelves+book.world.finance.avgDelvesGoldPerPay);
 }
});

test('La Gaceta es verificable y conserva memoria sin afirmar nuevas victorias',()=>{
 assert.ok(dispatch.issues.length>0);
 assert.ok(book.editions.length>0);
 assert.ok(dispatch.issues[0].news.length>0);
 assert.ok(dispatch.issues[0].eye.length>0);
 assert.equal(new Set(dispatch.issues.map(x=>x.id)).size,dispatch.issues.length);
 assert.equal(book.stats.dead,fallen.length);
 assert.equal(book.stats.members,active.length);
 // Las notas literarias no sustituyen registros mecanicos ni revelan el guardado bruto.
 assert.ok(!read('data/campaign.js').includes('guildNotes":'), 'No publicar bloc privado');
});
