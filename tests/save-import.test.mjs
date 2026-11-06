import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {mkdtempSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {validateSave,compareSaves,prepareCampaignUpdate,reportMarkdown} from '../scripts/save-core.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const ctx=vm.createContext({});
vm.runInContext(readFileSync(join(root,'data/campaign.js'),'utf8'),ctx);
const book=JSON.parse(vm.runInContext('JSON.stringify(BOOK)',ctx));
const clone=x=>structuredClone(x);
function fixture() {
 const bonds={};
 for(const rel of book.relationships) bonds[rel.a+'|'+rel.b]={value:rel.rawValue??rel.strength};
 return {version:26,sig:'test-baseline',guild:{
  name:book.meta.guild,day:book.meta.day-1,gold:book.stats.gold,renown:book.stats.renown,
  roster:book.characters.map(h=>({id:h.id,name:h.name,level:h.level,experience:h.experience,
    morale:h.morale,stress:h.stress,condition:h.condition,fatigue:h.fatigue,
    oathWage:h.salary,attributes:clone(h.attributes)})),
  fallen:[],bonds,
  league:{playerTier:6},tally:{delves:book.stats.delves,cleared:book.stats.delves},
  activeJobs:[],meetings:[],questLog:[],hall:{level:book.world.hallLevel,facilities:clone(book.world.buildings)}
 }};
}
test('Acepta un guardado realista v26 y detecta guardados incompatibles',()=>{
 const a=fixture();assert.equal(validateSave(a).name,book.meta.guild);
 assert.throws(()=>validateSave({...a,version:99}),/versión 26/);
 assert.throws(()=>validateSave({...a,guild:{...a.guild,roster:[a.guild.roster[0],a.guild.roster[0]]}}),/duplicados/);
});
test('Guardados idénticos no registran novedades',()=>{
 const a=fixture();const d=compareSaves(a,clone(a));
 assert.equal(d.roster.changed.length,0);assert.equal(d.bonds.length,0);assert.equal(d.summary.metrics.length,0);
});
test('Compara por IDs: detecta recursos, niveles, vínculos, misiones y altas',()=>{
 const a=fixture(),b=clone(a);
 b.guild.day++;b.guild.gold+=120;b.guild.renown+=3;
 b.guild.roster[0].level++;b.guild.roster[0].experience+=9;
 const pair=Object.keys(b.guild.bonds)[0];b.guild.bonds[pair].value+=4;
 b.guild.meetings.push({day:b.guild.day,oppId:'enemy1',result:'win',kind:'league'});
 b.guild.questLog.push({id:'job-new',day:b.guild.day,title:'Vuelta a casa'});
 b.guild.roster.push({id:'adv_new',name:'Alguien nuevo'});
 const d=compareSaves(a,b);
 assert.equal(d.fromDay,a.guild.day+1);assert.equal(d.toDay,b.guild.day+1);
 assert.equal(d.roster.added[0].id,'adv_new');assert.equal(d.roster.changed[0].fields.some(x=>x.field==='level'),true);
 assert.equal(d.bonds.length,1);assert.equal(d.meetings.added.length,1);assert.equal(d.quests.added.length,1);
 assert.ok(d.requiresEditorialReview);assert.match(reportMarkdown(d),/Revisión obligatoria/);
});
test('Rechaza regresiones temporales y distintas Casas',()=>{
 const a=fixture(),b=clone(a);b.guild.day--;
 assert.throws(()=>compareSaves(a,b),/anterior/);
 b.guild.day=a.guild.day;b.guild.name='Otra Casa';
 assert.throws(()=>compareSaves(a,b),/gremios distintos/);
});
test('Prepara campos seguros sin reescribir canon narrativo',()=>{
 const a=fixture(),b=clone(a);
 b.guild.day++;b.guild.gold+=33;b.guild.roster[0].fatigue+=2;
 const pair=Object.keys(b.guild.bonds)[0];b.guild.bonds[pair].value+=2;
 const proposal=prepareCampaignUpdate(book,a,b,'nuevo.json');
 assert.equal(proposal.campaign.stats.gold,book.stats.gold+33);
 assert.equal(proposal.campaign.meta.day,book.meta.day+1);
 assert.equal(proposal.campaign.characters[0].fatigue,book.characters[0].fatigue+2);
 assert.equal(proposal.campaign.chapters,undefined);
 assert.deepEqual(proposal.campaign.editions,book.editions);
 assert.deepEqual(proposal.campaign.timeline,book.timeline);
 assert.deepEqual(proposal.campaign.marginalia,book.marginalia);
 assert.equal(proposal.campaign.stats.leaguePosition,book.stats.leaguePosition);
 assert.equal(proposal.campaign.characters[0].bio,book.characters[0].bio);
 assert.ok(proposal.changes.some(x=>x.path.startsWith('relationships.')));
});
test('No aplica propuesta cuando la línea base del libro no coincide',()=>{
 const a=fixture(),b=clone(a);b.guild.day++;a.guild.day--;
 assert.throws(()=>prepareCampaignUpdate(book,a,b),/no coincide/);
});

test('CLI crea informe y propuesta sin alterar archivos originales',()=>{
  const work=mkdtempSync(join(tmpdir(),'corona-save-test-'));
  try{
    const a=fixture(),b=clone(a);b.guild.day++;b.guild.gold+=18;
    const prev=join(work,'antes.json'),next=join(work,'despues.json');
    const baseline=join(work,'baseline.json'),out=join(work,'salida');
    writeFileSync(prev,JSON.stringify(a));writeFileSync(next,JSON.stringify(b));
    writeFileSync(baseline,JSON.stringify({guild:a.guild.name,lastApprovedInternalDay:a.guild.day,lastApprovedSaveSignature:a.sig}));
    const args=['scripts/compare-saves.mjs','--previous',prev,'--next',next,'--campaign','data/campaign.js',
      '--baseline',baseline,'--out',out];
    const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});
    assert.equal(r.status,0,r.stderr);
    for(const file of ['report.md','diff.json','campaign.proposed.js','changes.json','baseline.proposed.json'])
      assert.ok(existsSync(join(out,file)),file);
    const altered=JSON.parse(readFileSync(join(out,'diff.json'),'utf8'));
    assert.equal(altered.summary.after.gold,a.guild.gold+18);
    const repeat=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});
    assert.notEqual(repeat.status,0,'Nunca sobrescribir salida existente');
    assert.equal(JSON.parse(readFileSync(prev,'utf8')).guild.gold,a.guild.gold,'Guardar fuente intacta');
  }finally{rmSync(work,{recursive:true,force:true});}
});
