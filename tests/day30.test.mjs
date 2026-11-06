import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import {compareSaves,prepareCampaignUpdate,validateSave} from '../scripts/save-core.mjs';
import {projectApprovedSave} from '../scripts/project-save.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const txt=file=>readFileSync(path.join(root,file),'utf8');
const ctx=vm.createContext({});
for(const file of ['data/campaign.js','novel/chapters/index.js','novel/chapters/prologo-corona.js',
 'novel/chapters/primer-certamen.js','novel/chapters/lo-que-vuelve.js',
 'novel/chapters/interludio-iv-la-partida-que-no-termina.js','novel/chapters/la-medida-de-una-victoria.js',
 'novel/relationships.js'])
 vm.runInContext(txt(file),ctx,{filename:file,timeout:15000});
const book=JSON.parse(vm.runInContext('JSON.stringify(BOOK)',ctx));
const baseline=JSON.parse(txt('data/save-baseline.json'));
const approved=JSON.parse(txt('data/approved-save-projection.json'));
const idName=new Map(book.characters.map(h=>[h.id,h.name]));
const pair=(a,b)=>book.relationships.find(r=>[r.a,r.b].sort().join('|')===[a,b].sort().join('|'));

test('La nueva línea base y su proyección coinciden exactamente con el libro',()=>{
 validateSave(approved);
 assert.equal(baseline.lastApprovedSaveSignature,approved.sig);
 assert.equal(baseline.lastApprovedInternalDay,approved.guild.day);
 assert.equal(baseline.lastApprovedVisibleDay,book.meta.day);
 assert.equal(baseline.lastApprovedInternalDay,29);
 assert.equal(baseline.lastApprovedVisibleDay,30);
 assert.equal(book.stats.gold,2485);
 assert.equal(book.stats.renown,26);
 assert.equal(book.stats.members,11);
 assert.equal(book.stats.delves,8);
 assert.equal(book.stats.dead,0);
 assert.equal(book.stats.encounters,3);
 assert.equal(book.stats.leaguePoints,9);
 assert.equal(book.stats.bonds,31);
 assert.equal(book.stats.synergies,4);
 assert.equal(book.stats.clearRate,100);
 assert.equal(approved.guild.roster.length,book.characters.length);
 assert.deepEqual(new Set(approved.guild.roster.map(h=>h.id)),new Set(book.characters.map(h=>h.id)));
});
test('No se pierden fichas, biografías, memorias, reliquias ni capítulos anteriores',()=>{
 assert.equal(book.chapters.length,5);
 assert.equal(book.chapters[4].id,'la-medida-de-una-victoria');
 assert.ok(book.characters.every(h=>h.id&&h.name&&h.bio&&h.memories.length&&h.portrait));
 assert.equal(book.characters.find(h=>h.name==='Íñigo Guzmán').status,'en cesión');
 assert.equal(book.characters.find(h=>h.name==='Jaro').status,'en incursión');
 assert.ok(book.editions.some(e=>e.id==='E0016'));
 assert.ok(book.editions.some(e=>e.id==='E0017'));
 assert.ok(book.world.legacyItems.some(x=>x.name.includes('Escarno')));
 assert.ok(book.meta.notice.includes('DÍA 30'));
 assert.ok(book.chapters[4].paragraphs.length>=90);
 assert.equal(Object.keys(book.chapters[4].speakers).length,56);
 for(const [idx,id] of Object.entries(book.chapters[4].speakers)){
  assert.ok(idName.has(id),'Diálogo de desconocido: '+id);
  assert.ok(book.chapters[4].paragraphs[Number(idx)].startsWith('—'),'Intervención mal marcada: '+idx);
 }
});
test('La Casa mantiene retornos pendientes sin atribuir resultados futuros',()=>{
 assert.equal(book.world.activeJobs.length,1);
 assert.equal(book.world.activeJobs[0].returnsDay,37);
 assert.deepEqual(book.world.activeExpedition.heroIds.map(id=>idName.get(id)).sort(),[
  'Belzar de la Ofrenda','Jaro','Luna','Yvaldo Guardapuerto'].sort());
 assert.equal(book.world.activeExpedition.returnsDay,34);
 assert.equal(book.world.activeExpedition.status,'en curso');
});
test('Se preservan afinidades reales y se incluyen nuevos vínculos, sin mezclarlos con romance',()=>{
 assert.equal(book.relationships.length,31);
 assert.equal(book.literaryRelationships.length,27);
 assert.equal(pair('adv_agorapai6eaw','adv_vir5cr755mej').rawValue,-0.5);
 assert.equal(pair('adv_vir5cr755mej','adv_nmu0cr5oezjw').rawValue,32.925);
 assert.equal(pair('adv_hpzq2ixhvxtq','adv_w21f5zhwf7li').mentorId,'adv_w21f5zhwf7li');
 assert.equal(pair('adv_dvyb6kaxgy9l','adv_xvecyci8knko').rawValue,-2);
 const rel=book.literaryRelationships.find(x=>x.id==='lit-jaro-belzar-de-la-ofrenda');
 assert.equal(rel.type,'conflicto');
 assert.ok(rel.evolution.some(x=>x.chapterId==='la-medida-de-una-victoria'));
 assert.equal(book.literaryRelationships.find(x=>x.id==='lit-velasco-jaro-interest-y1d20').stage,'atracción');
});
test('La proyección aprobada permite comparar el próximo guardado sin el JSON bruto anterior',()=>{
 const next=structuredClone(approved);
 next.guild.day++;
 next.guild.gold+=42;
 next.guild.roster[0].stress+=3;
 next.guild.bonds[Object.keys(next.guild.bonds)[0]].value+=1;
 const diff=compareSaves(approved,next);
 assert.equal(diff.summary.metrics.find(x=>x.field==='gold').delta,42);
 assert.equal(diff.roster.changed.some(x=>x.id===next.guild.roster[0].id),true);
 assert.equal(diff.bonds.length,1);
 const proposal=prepareCampaignUpdate(book,approved,next,'siguiente-guardado.json');
 assert.equal(proposal.campaign.stats.gold,book.stats.gold+42);
 assert.equal(proposal.campaign.meta.day,book.meta.day+1);
 assert.deepEqual(proposal.campaign.chapters,book.chapters,'El motor conserva íntegros los capítulos durante el importado');
});
test('La función de proyección no conserva atributos ocultos ni publica un archivo de juego completo',()=>{
 const fake=structuredClone(approved);
 fake.guild.league.divisions=[{tier:fake.guild.league.playerTier,guilds:[{
  id:'player',...fake.guild.league.playerStanding[0]}]}];
 fake.guild.roster[0].hidden={secretTest:123};
 const p=projectApprovedSave(fake);
 assert.equal(p.version,26);
 assert.equal(p.guild.day,29);
 assert.equal(p.guild.roster[0].hidden,undefined);
 assert.equal(p.guild.roster[0].id,fake.guild.roster[0].id);
});
