#!/usr/bin/env node
/* Uso: node scripts/compare-saves.mjs --previous OLD.json --next NEW.json --out salida
 * Para preparar campaña: añadir --campaign data/campaign.js --baseline data/save-baseline.json
 * Genera un BORRADOR de revisión; nunca publica ni reescribe los datos vigentes.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {compareSaves,prepareCampaignUpdate,reportMarkdown,validateSave} from './save-core.mjs';
function argsOf(argv) {
  const args={};for(let i=0;i<argv.length;i++){const k=argv[i];if(!k.startsWith('--'))throw Error('Opción inválida: '+k);if(!argv[i+1]||argv[i+1].startsWith('--'))throw Error('Falta el valor para '+k);args[k.slice(2)]=argv[++i];}return args;
}
const required=(args,key)=>{if(!args[key])throw Error('Falta --'+key);return args[key];};
function openSave(file) {
  const size=fs.statSync(file).size;
  if(size>25*1024*1024)throw Error('Guardado superior a 25MB');
  const data=JSON.parse(fs.readFileSync(file,'utf8'));validateSave(data);return data;
}
function getBook(file) {
  const context=vm.createContext({});
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file,timeout:10000});
  const str=vm.runInContext('JSON.stringify(BOOK)',context,{timeout:5000});
  return JSON.parse(str);
}
const write=(dir,name,contents)=>fs.writeFileSync(path.join(dir,name),contents,{flag:'wx'});
try {
  const args=argsOf(process.argv.slice(2));
  const previousFile=required(args,'previous'),nextFile=required(args,'next'),output=required(args,'out');
  if(args.campaign && !args.baseline)throw Error('Para preparar una publicación necesitas --baseline');
  if(args.baseline && !args.campaign)throw Error('Falta --campaign');
  if(fs.existsSync(output))throw Error('La carpeta de salida ya existe: '+output+' (se evita sobreescribir informes)');
  const previous=openSave(previousFile),next=openSave(nextFile);
  const diff=compareSaves(previous,next);
  let proposal=null;
  if(args.campaign){
    const baseline=JSON.parse(fs.readFileSync(args.baseline,'utf8'));
    if(previous.guild.name!==baseline.guild || previous.guild.day!==baseline.lastApprovedInternalDay
        || previous.sig!==baseline.lastApprovedSaveSignature)
      throw Error('El guardado anterior NO coincide con la línea base aprobada. Se cancela la propuesta.');
    const book=getBook(args.campaign);
    proposal=prepareCampaignUpdate(book,previous,next,path.basename(nextFile));
  }
  // No se incluyen datos del guardado sin procesar en las salidas publicables.
  fs.mkdirSync(output,{recursive:false});
  write(output,'report.md',reportMarkdown(diff,proposal));
  write(output,'diff.json',JSON.stringify(diff,null,2)+'\n');
  if(proposal){
    write(output,'campaign.proposed.js','/* PROPUESTA NO PUBLICADA: revisar antes de sustituir data/campaign.js */\nconst BOOK='+JSON.stringify(proposal.campaign)+';\n');
    write(output,'changes.json',JSON.stringify({format:proposal.format,source:proposal.source,
      updatedPaths:proposal.updatedPaths,changes:proposal.changes,review:proposal.review,
      blocking:proposal.blocking,fromDay:proposal.fromDay,toDay:proposal.toDay},null,2)+'\n');
    write(output,'baseline.proposed.json',JSON.stringify({
      format:'corona-save-baseline/v1',game:'Dungeons & Dynasties',guild:next.guild.name,
      gameVersion:next.version,lastApprovedVisibleDay:next.guild.day+1,lastApprovedInternalDay:next.guild.day,
      lastApprovedSaveSignature:next.sig,lastApprovedSource:path.basename(nextFile),
      note:'BORRADOR: sustituir data/save-baseline.json solamente tras revisión y publicación aprobada.'
    },null,2)+'\n');
  }
  console.log('Comparación creada en '+output+' ('+diff.fromDay+' → '+diff.toDay+').');
  console.log('Cambios de ficha: '+diff.roster.changed.length+'; vínculos: '+diff.bonds.length+'; revisiones: '+diff.review.length);
  if(proposal)console.log('Propuesta NO PUBLICADA: '+proposal.changes.length+' cambios mecánicos; requiere revisión.');
} catch(err){console.error('ERROR: '+err.message);process.exitCode=1;}
