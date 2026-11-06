#!/usr/bin/env node
/* Proyección mínima para comparación futura sin publicar un guardado completo.
 * node scripts/project-save.mjs --input private-save.json --out data/approved-save-projection.json
 * Guardar el JSON fuente FUERA del repositorio. NO publicar automáticamente.
 */
import fs from 'node:fs';
import path from 'node:path';
import {validateSave} from './save-core.mjs';

const heroFields=['id','name','level','experience','morale','condition','stress','fatigue','oathWage','post',
  'away','injury','attributes','traitIds','stakes','delves','record','currentAbility','potentialAbility',
  'abilityStars','potentialStars','equipment','origin','aspirant'];

export function projectApprovedSave(save) {
 const g=validateSave(save);
 const pick=(o,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(o,k)).map(k=>[k,o[k]]));
 const active=g.league.divisions?.find(d=>d.tier===g.league.playerTier);
 const player=active?.guilds?.find(x=>x.id==='player');
 if(!player)throw Error('Falta el gremio del jugador en la clasificación');
 return {
  format:'corona-approved-save-projection/v1',
  projectionNote:'SOLO CAMPOS DE DIFERENCIA APROBADOS. Guardado original no incluido; no contiene atributos ocultos ni todos los historiales.',
  version:save.version,sig:save.sig,
  guild:{
   name:g.name,day:g.day,gold:g.gold,renown:g.renown,
   roster:g.roster.map(h=>pick(h,heroFields)),
   fallen:g.fallen.map(h=>pick(h,['id','name'])),
   bonds:g.bonds,
   hall:{level:g.hall.level,facilities:g.hall.facilities},
   league:{playerTier:g.league.playerTier,round:g.league.round,playerForm:g.league.playerForm,
     playerStanding:[pick(player,['points','won','lost','drawn','played'])]},
   tally:g.tally,
   activeJobs:g.activeJobs.map(j=>({id:j.id,
     posting:pick(j.posting||{},['id','title','kind']),
     sentDay:j.sentDay,returnsDay:j.returnsDay,heroIds:j.heroIds,loan:j.loan})),
   meetings:g.meetings.map(x=>pick(x,['day','oppId','oppName','result','kind'])),
   questLog:(g.questLog||[]).map(x=>pick(x,['id','day','title','kind','region','outcome','heroNames','gold','renown'])),
   goldLog:(g.goldLog||[]).map(x=>pick(x,['day','kind','delta','gold'])),
   honours:g.honours,discoveredSynergies:g.discoveredSynergies,
   yearBeats:(g.yearBeats||[]).filter(x=>x.day>=Math.max(0,g.day-15)).map(x=>pick(x,['id','day','text'])),
   hallBuilds:g.hall.builds,
   mascot:g.mascot
  }
 };
}
function args(argv){
 const out={};for(let i=0;i<argv.length;i+=2){if(!argv[i]?.startsWith('--')||!argv[i+1])throw Error('Uso: --input guardado.json --out proyeccion.json');out[argv[i].slice(2)]=argv[i+1]}
 return out;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 try{
  const a=args(process.argv.slice(2));if(!a.input||!a.out)throw Error('Falta --input o --out');
  if(fs.statSync(a.input).size>25*1024*1024)throw Error('Archivo demasiado grande');
  const raw=JSON.parse(fs.readFileSync(a.input,'utf8'));
  const data=projectApprovedSave(raw);
  fs.writeFileSync(a.out,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
  console.log('Proyección lista para revisión: '+a.out+' (día visible '+(data.guild.day+1)+')');
 }catch(err){console.error('ERROR: '+err.message);process.exitCode=1}
}
