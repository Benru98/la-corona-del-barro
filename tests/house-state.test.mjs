import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import HouseEngine from '../data/house-state.js';
import {compareSaves,prepareCampaignUpdate} from '../scripts/save-core.mjs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const ctx=vm.createContext({});
vm.runInContext(read('data/campaign.js'),ctx);
vm.runInContext(read('novel/relationships.js'),ctx);
const campaign=JSON.parse(vm.runInContext('JSON.stringify(BOOK)',ctx));
const save=JSON.parse(read('data/approved-save-projection.json'));
const clone=()=>structuredClone(campaign);
const brugo='adv_w21f5zhwf7li',luna='adv_xvecyci8knko';
test('El estado compartido concilia la edición publicada',()=>{
 const h=HouseEngine.create(campaign);
 assert.equal(h.counts.living,11);
 assert.equal(h.counts.fallen,1);
 assert.equal(h.counts.total,12);
 assert.ok(!h.availableIds.has(brugo));
 assert.ok(h.featured.every(r=>r.people.every(id=>typeof id==='string')));
 assert.deepEqual(HouseEngine.audit(campaign),[]);
 assert.equal(h.counts.available,10);
 assert.equal(h.expedition,null);
 assert.equal(h.activeJobs.length,1);
 assert.equal(h.activeJobs[0].returnsDay,92);
});
test('Una muerte y una expedición concurrente producen un error verificable',()=>{
 const b=clone(),c=b.characters.find(c=>c.id===luna);
 c.status='caído';c.death={year:1,day:40,place:'La Niebla'};c.away=null;
 b.world.fallen.push({id:luna,year:1,day:40,place:'La Niebla'});
 b.stats.members=10;b.stats.dead=2;
 b.world.guildRosterAlive=b.world.guildRosterAlive.filter(id=>id!==luna);
 b.world.activeExpedition={name:'La Niebla',heroIds:[luna],returnsDay:41};
 assert.equal(HouseEngine.create(b).counts.fallen,2);
 assert.ok(!HouseEngine.create(b).availableIds.has(luna));
 assert.ok(HouseEngine.audit(b).some(x=>x.code==='dead-in-job'));
 b.world.activeExpedition=null;
 b.world.activeJobs=b.world.activeJobs.filter(j=>!j.heroIds.includes(luna));
 assert.deepEqual(HouseEngine.audit(b),[]);
});
test('El motor detecta reclutamiento, ascenso, cesión, regreso, lesiones, construcción, división y vínculos',()=>{
 const input={fallen:{added:[{id:'b',name:'Brugo'}]},roster:{
  added:[{id:'n',name:'Nueva'}],changed:[
   {id:'a',name:'A',fields:[{field:'level',before:2,after:3},{field:'away',before:null,after:{loan:true}},{field:'injury',before:null,after:{kind:'herida'}}]},
   {id:'c',name:'C',fields:[{field:'away',before:{loan:true},after:null}]}]},
  bonds:[{pair:'a|c',before:12,after:18,delta:6,status:'changed'}],
  facilities:{tavern:{before:0,after:1}},
  summary:{before:{leagueTier:1},after:{leagueTier:2}},
  jobs:{added:[{id:'j1'}],removed:[{id:'j0'}]}};
 const kinds=new Set(HouseEngine.eventsFromDiff(input).map(x=>x.kind));
 for(const kind of ['death','recruitment','promotion','departure','return','injury','building_changed','division_changed','bond_changed','job_started','job_ended'])assert.ok(kinds.has(kind),kind);
});
test('El importador incorpora eventos sin mutar la historia publicada',()=>{
 const next=structuredClone(save);next.guild.day++;
 const hero=next.guild.roster.find(h=>h.id===luna);
 next.guild.roster=next.guild.roster.filter(h=>h.id!==luna);
 next.guild.fallen.push({adventurer:{id:hero.id,name:hero.name},day:save.guild.day,dungeon:'La Niebla'});
 const diff=compareSaves(save,next);
 assert.ok(diff.events.some(e=>e.kind==='death'&&e.subjectId===luna));
 const proposed=prepareCampaignUpdate(campaign,save,next);
 assert.ok(proposed.events.some(e=>e.kind==='death'));
 assert.deepEqual(proposed.campaign.literaryRelationships,campaign.literaryRelationships);
 assert.deepEqual(proposed.campaign.chapters,campaign.chapters);
});
test('Los componentes no mantienen listas manuales de personajes destacados',()=>{
 const app=read('app.js'),html=read('index.html');
 assert.ok(app.includes('house().featured'));
 assert.ok(app.includes('house().available'));
 assert.ok(app.includes('house().counts.living'));
 assert.ok(html.includes('data/house-state.js'));
 assert.ok(!app.includes("const featuredPairs=[['Velasco Rivadeneira'"));
 assert.ok(!app.includes('La Corona de Barro lidera Villorio'));
});

test('Dos bajas simultáneas se reflejan en todos los contadores y sin perder sus fichas',()=>{
 const b=clone(),victims=b.characters.filter(c=>!c.death).slice(0,2);
 for(const c of victims){
  c.status='caído';c.death={year:1,day:40,place:'El Paso del Norte'};c.away=null;
  b.world.fallen.push({id:c.id,year:1,day:40,place:'El Paso del Norte'});
 }
 b.stats.members-=2;b.stats.dead+=2;
 b.world.guildRosterAlive=b.world.guildRosterAlive.filter(id=>!victims.some(c=>c.id===id));
 if(b.world.activeExpedition)b.world.activeExpedition.heroIds=b.world.activeExpedition.heroIds.filter(id=>!victims.some(c=>c.id===id));
 b.world.activeJobs=b.world.activeJobs.filter(j=>!j.heroIds.some(id=>victims.some(c=>c.id===id)));
 const h=HouseEngine.create(b);
 assert.equal(h.counts.living,9);
 assert.equal(h.counts.fallen,3);
 assert.equal(h.counts.total,12);
 assert.ok(victims.every(c=>!h.availableIds.has(c.id)));
 assert.deepEqual(HouseEngine.audit(b),[]);
 b.stats.dead=1;
 assert.ok(HouseEngine.audit(b).some(i=>i.code==='dead-mismatch'));
});
