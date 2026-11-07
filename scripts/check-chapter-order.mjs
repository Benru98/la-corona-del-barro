#!/usr/bin/env node
/* Verificación rápida del orden de carga. No utiliza navegador ni dependencias. */
import fs from 'node:fs';
import vm from 'node:vm';
const read=f=>fs.readFileSync(f,'utf8');
try{
 const html=read('index.html');
 const sources=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(x=>x[1].split('?')[0]);
 if(sources.length!==new Set(sources).size)throw Error('Hay scripts duplicados');
 if(sources[0]!=='data/campaign.js'||sources[1]!=='novel/chapters/index.js')throw Error('Inicialización incorrecta');
 for(const file of sources)if(!fs.existsSync(file))throw Error('No existe el script '+file);
 const chapters=sources.filter(f=>f.startsWith('novel/chapters/')&&f!=='novel/chapters/index.js');
 const rel=sources.indexOf('novel/relationships.js');
 if(!chapters.length||rel<=sources.indexOf(chapters.at(-1)))throw Error('Orden narrativo incorrecto');
 for(const file of fs.readdirSync('novel/chapters').filter(x=>x.endsWith('.js')&&x!=='index.js')){
  if(!chapters.includes('novel/chapters/'+file))throw Error('Capítulo sin registrar: '+file);
 }
 const ctx=vm.createContext({});
 for(const file of sources.filter(f=>f==='data/campaign.js'||f.startsWith('novel/chapters/')))
  vm.runInContext(read(file),ctx,{filename:file,timeout:5000});
 const ids=JSON.parse(vm.runInContext('JSON.stringify(BOOK.chapters.map(c=>c.id))',ctx));
 if(!ids.length||new Set(ids).size!==ids.length)throw Error('IDs de capítulos duplicados o vacíos');
 console.log('✓ Índice y '+ids.length+' capítulos válidos. No se ejecutó navegador.');
}catch(e){console.error('ERROR: '+e.message);process.exitCode=1;}
