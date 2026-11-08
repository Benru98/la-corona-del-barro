import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {insertChapterScript} from '../scripts/chapter-index.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function getBook(){
 const ctx=vm.createContext({});
 vm.runInContext(read('data/campaign.js'),ctx,{timeout:10000});
 return JSON.parse(vm.runInContext('JSON.stringify(BOOK)',ctx));
}
test('La inserción de capítulo hereda la versión de caché y conserva su posición',()=>{
 const html=read('index.html');
 const version=html.match(/src="novel\/relationships\.js(\?[^"]*)?"/);
 assert.ok(version,'Falta índice narrativo');
 const id='capitulo-prueba-no-publicado',modified=insertChapterScript(html,id);
 assert.ok(modified.includes('src="novel/chapters/'+id+'.js'+(version[1]||'')+'"'));
 assert.ok(modified.indexOf('novel/chapters/'+id+'.js')<modified.indexOf('novel/relationships.js'));
 assert.equal(modified.split('novel/chapters/'+id+'.js').length,2);
 assert.throws(()=>insertChapterScript(modified,id),/registrado/);
 assert.equal(read('index.html'),html,'El test no modifica el índice real');
});
test('Preparación íntegra con vendidos/retirados y lista de IDs intacta',()=>{
 const current=JSON.parse(read('data/approved-save-projection.json'));
 const baseline=JSON.parse(read('data/save-baseline.json'));
 const book=getBook();
 assert.equal(current.sig,baseline.lastApprovedSaveSignature);
 const historical=book.characters.filter(c=>['vendida','retirada'].includes(c.status));
 const next=structuredClone(current);
 next.sig='test-draft-'+(current.guild.day+1);
 next.guild.day=current.guild.day+1;
 next.guild.gold=current.guild.gold+1;
 const standing=next.guild.league.playerStanding[0];
 next.guild.league.divisions=[{tier:next.guild.league.playerTier,guilds:[
   {id:'player',name:next.guild.name,points:standing.points,won:standing.won,drawn:standing.drawn,lost:standing.lost,played:standing.played},
   {id:'other',name:'Gremio de prueba',points:0,won:0,drawn:0,lost:0,played:0}
 ]}];
 const workspace=mkdtempSync(join(tmpdir(),'corona-update-test-'));
 try{
  const input=join(workspace,'guardado-ficticio.json'),output=join(workspace,'propuesta');
  writeFileSync(input,JSON.stringify(next));
  const run=spawnSync(process.execPath,['scripts/prepare-next.mjs','--save',input,'--out',output],{
   cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:25000
  });
  assert.equal(run.status,0,'Preparador rechazó el guardado ficticio: '+run.stderr+'\n'+run.stdout);
  assert.ok(existsSync(join(output,'resumen.json')));
  const context=vm.createContext({});
  vm.runInContext(readFileSync(join(output,'data/campaign.js'),'utf8'),context,{timeout:10000});
  const draft=JSON.parse(vm.runInContext('JSON.stringify(BOOK)',context));
  assert.equal(draft.meta.day,book.meta.day+1);
  assert.equal(draft.stats.gold,book.stats.gold+1);
  assert.deepEqual(draft.world.guildRosterAlive,next.guild.roster.map(c=>c.id));
  for(const c of historical){
   const preserved=draft.characters.find(p=>p.id===c.id);
   assert.ok(preserved&&preserved.status===c.status,'Se perdió una ficha histórica: '+c.name);
  }
  const projection=JSON.parse(readFileSync(join(output,'data/approved-save-projection.json'),'utf8'));
  assert.equal(projection.sig,next.sig);
  assert.equal(draft.world.finance?.lastPayroll?.net,book.world.finance?.lastPayroll?.net,
   'La preparación no debe alterar importes de la última nómina');
 }finally{rmSync(workspace,{recursive:true,force:true});}
});
