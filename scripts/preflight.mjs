#!/usr/bin/env node
/* Preflight unico para cambios locales y GitHub Actions.
 * --changed a.js,b.js : validar rutas propuestas antes del commit
 * --staged         : validar archivos preparados en git
 * --base SHA       : validar archivos cambiados desde SHA hasta HEAD
 * --all            : comprobar la estructura vigente entera
 * No ejecuta navegador ni publica. Abortara ante errores.
 */
import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
const args=process.argv.slice(2);
const fail=message=>{console.error('✗ '+message);process.exit(1)};
const run=(cmd,params)=>{
 console.log('→ '+cmd+' '+params.join(' '));
 const r=spawnSync(cmd,params,{stdio:'inherit'});
 if(r.error||r.status!==0)fail((r.error?.message||cmd+' fallo')+' (exit '+r.status+')');
};
let paths=[];
if(args[0]==='--changed'&&args.length===2)paths=args[1].split(',').map(x=>x.trim()).filter(Boolean);
else if(args[0]==='--base'&&args.length===2){
 try{paths=execFileSync('git',['diff','--name-only','--diff-filter=ACMRT',args[1],'HEAD'],{encoding:'utf8'}).split(/\r?\n/).filter(Boolean)}
 catch(e){fail('No se pudo comparar con '+args[1]+': '+e.message)}
}
else if(args[0]==='--staged'&&args.length===1){
 try{paths=execFileSync('git',['diff','--cached','--name-only','--diff-filter=ACMRT'],{encoding:'utf8'}).split(/\r?\n/).filter(Boolean)}
 catch(e){fail('No se pudo leer el indice: '+e.message)}
}
else if(args[0]==='--all'&&args.length===1){
 paths=['data/campaign.js','home/dispatches.js','data/house-state.js','index.html','novel/chapters/index.js','novel/relationships.js','data/save-baseline.json','data/approved-save-projection.json','tests/current-campaign.test.mjs'];
}
else fail('Uso: node scripts/preflight.mjs --changed "a.js,b.js" | --staged | --base SHA | --all');
paths=[...new Set(paths.map(x=>x.replace(/^\.\//,'')))];
const unsafe=paths.filter(x=>x.startsWith('/')||x.includes('..')||x.startsWith('-'));
if(unsafe.length)fail('Rutas no permitidas: '+unsafe.join(','));
const changed=new Set(paths);
console.log('Preflight: '+(paths.length?paths.join(', '):'sin archivos relevantes'));
if(changed.has('data/campaign.js')&&!changed.has('home/dispatches.js'))fail('Una actualizacion de campana requiere home/dispatches.js en el mismo commit');
for(const file of paths){
 if(!existsSync(file))continue; // archivos eliminados ya quedan fuera con --diff-filter=ACMRT
 if(/\.(?:js|mjs)$/.test(file))run('node',['--check',file]);
 if(/\.json$/.test(file)){
  try{JSON.parse(readFileSync(file,'utf8'))}catch(e){fail('JSON invalido en '+file+': '+e.message)}
 }
}
const includes=fn=>paths.some(fn);
if(includes(p=>p==='index.html'||/^novel\/chapters\/.*\.js$/.test(p)))run('node',['scripts/check-chapter-order.mjs']);
if(includes(p=>p==='data/campaign.js'||p==='data/house-state.js'||p==='novel/relationships.js'))run('node',['scripts/audit-house.mjs']);
if(changed.has('data/campaign.js')||changed.has('home/dispatches.js'))run('node',['scripts/check-dispatches.mjs']);
if(includes(p=>/^(data\/campaign\.js|data\/save-baseline\.json|data\/approved-save-projection\.json|home\/dispatches\.js|data\/house-state\.js|tests\/current-campaign\.test\.mjs)$/.test(p))){
 run('node',['--test','tests/current-campaign.test.mjs']);
}
console.log('✓ Preflight completado. No hay nada que publicar automaticamente.');
