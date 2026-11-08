#!/usr/bin/env node
/* Propuesta mecánica rápida. No publica ni modifica el checkout.
 * node scripts/prepare-next.mjs --save /fuera-del-repo/nuevo.json --out /tmp/corona-E0025
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {validateSave,compareSaves,prepareCampaignUpdate} from './save-core.mjs';
import {projectApprovedSave} from './project-save.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
function requireThat(ok,reason){if(!ok)throw Error(reason)}
function argumentsOf(argv){
 const result={};
 for(let i=0;i<argv.length;i+=2){requireThat(argv[i]?.startsWith('--')&&argv[i+1]&&!argv[i+1].startsWith('--'),'Uso: --save nuevo.json --out /tmp/propuesta');result[argv[i].slice(2)]=argv[i+1]}
 requireThat(result.save&&result.out,'Falta --save o --out');
 return result;
}
function getBook(){
 const ctx=vm.createContext({});
 vm.runInContext(read('data/campaign.js'),ctx,{timeout:10000});
 return JSON.parse(vm.runInContext('JSON.stringify(BOOK)',ctx));
}
function buildProposal(book,old,save,source){
 const g=validateSave(save),before=old.guild;
 const diff=compareSaves(old,save),p=prepareCampaignUpdate(book,old,save,source);
 const b=p.campaign;
 const heroById=new Map(g.roster.map(h=>[h.id,h]));
 const positions={vanguard:'Vanguardia',secondWatch:'Segunda Guardia',thirdWatch:'Tercera Guardia',reserve:'Reserva'};
 for(const h of b.characters){
  const v=heroById.get(h.id);if(!v)continue;
  for(const k of ['age','level','experience','morale','condition','stress','fatigue','attributes','equipment','currentAbility','abilityStars','potentialStars','traitIds'])
   if(v[k]!==undefined)h[k]=v[k];
  h.traitsIds=v.traitIds||h.traitsIds||[];
  h.salary=v.oathWage;h.post=positions[v.post]||h.post;
  h.injury=v.injury||null;
  const onRoad=!!v.away?.jobId&&String(v.away.jobId).startsWith('road_');
  const awayKind=onRoad?'viaje de incorporación':v.away?.delve?'incursión':v.away?.loan?'cesión':'encargo';
  h.away=v.away?{jobId:v.away.jobId,returnsDay:Number.isInteger(v.away.returnsDay)?v.away.returnsDay+1:null,
   kind:awayKind,region:v.away.region||null}:null;
  if(!h.death)h.status=onRoad?'en camino':h.away?(v.away.delve?'en incursión':v.away.loan?'en cesión':'en encargo'):(h.injury?.daysLeft>0?'herido':'en la Casa');
  h.incursions=v.delves??h.incursions;
  if(v.record?.all)h.statistics={...h.statistics,level:v.level,incursions:v.delves,
    kills:v.record.all.kills||0,dealt:v.record.all.dealt||0,
    healed:v.record.all.healed||0,faced:v.record.all.faced||0,blocked:v.record.all.blocked||0,
    currentAbility:v.currentAbility,abilityStars:v.abilityStars,
    measuredAt:'Año '+b.meta.year+' · día '+(g.day+1)+' (valor de ingreso histórico conservado)'};
  h.source='Estado mecánico: '+source+'; biografía, retratos y memorias preservados.';
 }
 b.world.guildRosterAlive=g.roster.map(h=>h.id);
 const div=g.league.divisions?.find(d=>d.tier===g.league.playerTier);
 const ranks=div?[...div.guilds].sort((x,y)=>y.points-x.points||y.won-x.won):[];
 const own=ranks.find(x=>x.id==='player');
 requireThat(!!own,'No se encuentra la Corona en la clasificación');
 const rank=ranks.indexOf(own)+1;
 b.world.league={position:rank,of:ranks.length,points:own.points,played:own.played,won:own.won,
   drawn:own.drawn,lost:own.lost,leader:ranks[0].name,tiedOnPointsWith:ranks.filter(x=>x.id!=='player'&&x.points===own.points).map(x=>x.name)};
 Object.assign(b.stats,{leaguePoints:own.points,leaguePosition:rank,leagueSize:ranks.length,encounters:g.meetings.length,
  buildsActive:g.hall.builds?.length||0,
  salaryCycle:g.roster.reduce((n,h)=>n+(h.oathWage||0),0)+(g.staff||[]).reduce((n,h)=>n+(h.wage||0),0)});
 Object.assign(b.world,{
  sourcesCurrent:source,meetings:g.meetings.map(x=>({...x,day:x.day+1})),
  staff:(g.staff||[]).map(x=>({...x,arrivesOn:Number.isInteger(x.arrivesOn)?x.arrivesOn+1:null})),
  builds:(g.hall.builds||[]).map(x=>({...x,startDay:Number.isInteger(x.startDay)?x.startDay+1:null,completeDay:Number.isInteger(x.completeDay)?x.completeDay+1:null})),
  activeJobs:g.activeJobs.map(x=>({id:x.id,jobId:x.id,name:x.posting?.title||x.name||x.id,kind:x.posting?.kind,
    heroIds:x.heroIds||[],sentDay:Number.isInteger(x.sentDay)?x.sentDay+1:null,
    returnsDay:Number.isInteger(x.returnsDay)?x.returnsDay+1:null,region:x.posting?.region,details:x.posting?.blurb})),
  honours:g.honours||[],records:g.records||b.world.records,
  annualLedger:g.ledgerYears||b.world.annualLedger,
  townStanding:g.townStanding||b.world.townStanding,
  equippedTotal:g.roster.reduce((n,x)=>n+Object.keys(x.equipment||{}).length,0)
 });
 const away=g.roster.filter(x=>x.away?.delve);
 const jobIds=new Set(away.map(x=>x.away.jobId));
 requireThat(jobIds.size<=1,'Dos expediciones simultáneas: requiere revisión especial');
 b.world.activeExpedition=away.length?{id:[...jobIds][0],name:'Incursión en '+(away[0].away.region||'región no identificada'),
   heroIds:away.map(x=>x.id),sentDay:null,returnsDay:away[0].away.returnsDay+1,
   region:away[0].away.region,outcome:'pendiente',details:'Revisar resultado: estar de regreso no confirma victoria.'}:null;
 // Evitar duplicar eventos o atribuir resultados de trabajos que desaparecieron.
 const oldEvents=new Set((b.world.eventLog||[]).map(x=>x.id));
 for(const e of (g.news||[]).filter(e=>e.day>before.day)){
  if(!oldEvents.has(e.id)){b.world.eventLog.push({id:e.id,day:e.day+1,text:e.text,tone:e.tone||'neutral'});oldEvents.add(e.id)}
 }
 const oldBeats=new Set((b.world.storyBeats||[]).map(x=>x.id));
 for(const e of (g.yearBeats||[]).filter(e=>e.day>before.day)){
  if(!oldBeats.has(e.id)){b.world.storyBeats.push({id:e.id,day:e.day+1,text:e.text});oldBeats.add(e.id)}
 }
 // No se crean crónicas ni se reescribe su canon: el asistente completará las consecuencias.
 const aliveNames=g.roster.map(x=>x.name);
 const warnings=[...new Set([...p.review,...(diff.roster.added.length?['Nuevos personajes: crear y revisar ficha y arte antes de publicar']:[]),
   ...(diff.fallen.added.length?['Fallecidos: revisar causa y memorial antes de publicar']:[])])];
 return {campaign:b,projection:projectApprovedSave(save),diff,report:{
  fromDay:before.day+1,toDay:g.day+1,
  metrics:diff.summary.metrics,league:b.world.league,
  namedRoster:aliveNames,
  rosterChanges:diff.roster,noteChanges:diff.noteChanges,
  bondChanges:diff.bonds,meetingChanges:diff.meetings,fallenChanges:diff.fallen,
  sourceEvents:(g.news||[]).filter(x=>x.day>before.day).map(x=>({id:x.id,day:x.day+1,text:x.text})).slice(-120),
  sourceBeats:(g.yearBeats||[]).filter(x=>x.day>before.day).map(x=>({id:x.id,day:x.day+1,text:x.text})).slice(-70),
  warnings,requiresEditorialReview:true,
  instruction:'Borrador mecánico: completar nuevos vínculos, cronología, memorias, edición, Gaceta y cualquier herida/fallecimiento antes de publicar.'
 }};
}
try{
 const a=argumentsOf(process.argv.slice(2));
 const outside=p=>{const rel=path.relative(root,path.resolve(p));return rel==='..'||rel.startsWith('..'+path.sep)};
 requireThat(outside(a.save),'El guardado original debe permanecer fuera del repositorio');
 requireThat(outside(a.out),'Los borradores deben generarse fuera del repositorio');
 requireThat(fs.statSync(a.save).size<=25*1024*1024,'Guardado mayor que 25 MB');
 const save=JSON.parse(fs.readFileSync(a.save,'utf8'));
 const old=JSON.parse(read('data/approved-save-projection.json'));
 const base=JSON.parse(read('data/save-baseline.json'));
 const book=getBook();
 requireThat(old.sig===base.lastApprovedSaveSignature&&old.guild.day===base.lastApprovedInternalDay,
   'La proyección no coincide con el baseline actual');
 requireThat(book.meta.day===base.lastApprovedVisibleDay&&save.guild.name===book.meta.guild,
   'La campaña no coincide con el guardado');
 requireThat(save.guild.day>old.guild.day,'Se requiere un guardado posterior; si es del mismo día revisar manualmente');
 requireThat(!fs.existsSync(a.out),'No sobrescribir una propuesta existente: '+a.out);
 const source=path.basename(a.save);
 const draft=buildProposal(book,old,save,source);
 const nextBase={...base,gameVersion:save.version,lastApprovedVisibleDay:save.guild.day+1,
  lastApprovedInternalDay:save.guild.day,lastApprovedSaveSignature:save.sig,
  lastApprovedSource:source,note:'PROPUESTA no aprobada; completar edición y continuidad antes de publicar.'};
 fs.mkdirSync(path.join(a.out,'data'),{recursive:true});
 const write=(p,txt)=>fs.writeFileSync(path.join(a.out,p),txt,{flag:'wx'});
 write('data/campaign.js','/* BORRADOR MECÁNICO: completar revisión editorial */\nconst BOOK='+JSON.stringify(draft.campaign)+';\n');
 write('data/approved-save-projection.json',JSON.stringify(draft.projection,null,2)+'\n');
 write('data/save-baseline.json',JSON.stringify(nextBase,null,2)+'\n');
 write('resumen.json',JSON.stringify(draft.report,null,2)+'\n');
 console.log('Borrador generado en '+a.out+' · día '+(save.guild.day+1)+'. No se modificó ni publicó el repositorio.');
}catch(e){console.error('ERROR: '+e.message);process.exitCode=1}
