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
 assert.equal(book.editions.at(-1).id,'E0030');
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
 assert.equal(base.lastApprovedSaveSignature,'lmc4sv.8q7cd');
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
 assert.equal(dispatch.latestEdition,'E0030');
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

test('Capacidades y puntuaciones del guardado v26 se presentan en escalas separadas',()=>{
 const roster=book.characters.filter(c=>c.status!=='caído'&&c.status!=='retirada');
 assert.equal(roster.length,11);
 assert.equal(book.world.patch301.gameSaveVersion,26);
 assert.equal(Object.keys(book.world.patch301.portraitFiles).length,11);
 assert.deepEqual(book.world.patch301.personalCrestIds,['adv_vir5cr755mej']);
 assert.equal(book.world.patch301.shapeLines[0].shape,'1-2-1');
 for(const hero of roster){
  const expected=projection.guild.roster.find(x=>x.id===hero.id);
  assert.ok(expected,'Falta personaje en proyección: '+hero.name);
  assert.equal(hero.ratingAtJoin,expected.ratingAtJoin,'Valoración inicial errónea: '+hero.name);
  assert.equal(hero.currentAbility,Math.round(expected.currentAbility*1000)/1000,'Habilidad errónea: '+hero.name);
  assert.equal(hero.potentialAbility,Math.round(expected.potentialAbility*1000)/1000,'Potencial erróneo: '+hero.name);
  assert.equal(hero.ingamePortraitFile,expected.ingamePortraitFile,'Retrato incorrecto: '+hero.name);
 }
 assert.equal(book.characters.find(x=>x.name==='Luna').ratingAtJoin,52);
 assert.equal(book.characters.find(x=>x.name==='Luna').currentAbility,132);
 assert.equal(book.characters.find(x=>x.name==='Velasco Rivadeneira').currentAbility,142);
 assert.equal(book.characters.find(x=>x.name==='Grosco del Puño de Piedra').ratingAtJoin,68);
 assert.equal(book.characters.find(x=>x.name==='Grosco del Puño de Piedra').ratingLastYearEnd,null);
});
test('El tablón y los récords corresponden al último guardado',()=>{
 assert.deepEqual(book.world.board.map(x=>x.name),['Cado Feroz','Cado Aullante','Espesura Aullante','Caverna sin Luz','Gruta Insondable','Tumba Inviolable']);
 assert.ok(book.world.board.every(x=>x.expiresDay>=book.stats.day));
 assert.equal(book.world.records.delveDealt.value,3025);
 assert.equal(book.world.records.delveFaced.value,2842);
 assert.equal(book.world.records.careerHealed.value,9215);
 assert.equal(book.world.records.delveDealt.day,149);
 assert.equal(projection.guild.portraitFiles['adv_3yrkzbvzvfzu'],'grosco_512x512.webp');
 assert.equal(base.lastApprovedSource,'La Corona de Barro 2026-11-08 08-35.json');
});

test('Valoración de clase, CA, PA y etapa se leen por separado',()=>{
 const expected={'Luna':55,'Belzar de la Ofrenda':66,'Ulf Vallehondo':53,'Velasco Rivadeneira':69,'Jaro':63,'Íñigo Guzmán':40,'Ruc':45,'Xara del Cuerno':47,'Yvaldo Guardapuerto':76,'Iligar el Rompehuesos':70,'Grosco del Puño de Piedra':68};
 const living=book.characters.filter(c=>c.status!=='caído'&&c.status!=='retirada');
 assert.equal(living.length,11);
 for(const hero of living){
  const saved=projection.guild.roster.find(c=>c.id===hero.id);
  assert.ok(saved,'No aparece en proyección '+hero.name);
  assert.equal(hero.gameRating,expected[hero.name],hero.name+' valoración verificada');
  assert.equal(hero.rating,hero.gameRating,hero.name+' rating debe ser de clase');
  assert.equal(hero.gameRating,saved.gameRatingVerified,hero.name+' proyección inconsistente');
  assert.equal(hero.ratingAtJoin,saved.ratingAtJoin,hero.name+' valoración de entrada alterada');
  assert.equal(hero.gameCareerStage,saved.gameCareerStageVerified,hero.name+' etapa distinta');
  assert.equal(hero.potentialGap,Math.round(Math.max(0,hero.potentialAbility-hero.currentAbility)*100)/100,hero.name+' margen incorrecto');
 }
 assert.equal(book.characters.find(x=>x.name==='Yvaldo Guardapuerto').gameRating,76);
 assert.equal(book.characters.find(x=>x.name==='Yvaldo Guardapuerto').ratingAtJoin,62);
 assert.equal(book.characters.find(x=>x.name==='Velasco Rivadeneira').gameCareerStage,'Ascendiendo');
 assert.equal(book.characters.find(x=>x.name==='Velasco Rivadeneira').potentialGap,0);
});
test('Economía: forecast −343, último cargo −475 y Consejo vacante',()=>{
 const f=book.world.finance;
 assert.equal(f.current.delverWages,220);
 assert.equal(f.current.staffWages,0);
 assert.equal(f.current.upkeep,202);
 assert.equal(f.current.stipend,79);
 assert.equal(f.current.netBeforeDelves,-343);
 assert.equal(f.lastPayroll.net,-475);
 assert.equal(f.lastPayroll.staffWages,132);
 assert.equal(f.recentStaffDeparture.visibleDay,148);
 assert.equal(f.avgDelvesGoldPerPay,411);
 assert.equal(f.netWithAvgDelves,68);
 assert.equal(f.current.stipend-f.current.delverWages-f.current.staffWages-f.current.upkeep,f.current.netBeforeDelves);
 assert.equal(projection.guild.financeSnapshot.netBeforeDelves,-343);
});
