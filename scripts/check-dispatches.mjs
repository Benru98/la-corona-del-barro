#!/usr/bin/env node
/* Comprueba el formato mínimo del número de la Gaceta sin abrir navegador. */
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({});
const load=path=>vm.runInContext(readFileSync(path,'utf8'),ctx,{filename:path,timeout:5000});
const unique=items=>new Set(items).size===items.length;
const error=why=>{throw Error('Gaceta inválida: '+why)};
try{
 load('data/campaign.js');
 load('home/dispatches.js');
 const {book,bulletin}=JSON.parse(vm.runInContext('JSON.stringify({book:BOOK,bulletin:HOUSE_DISPATCHES})',ctx));
 if(bulletin.bookId!==book.bookId||bulletin.schemaVersion!==1)error('formato o libro incorrecto');
 if(!Array.isArray(bulletin.issues)||!bulletin.issues.length)error('no hay ediciones');
 const latest=bulletin.issues[0],edition=book.editions.at(-1).id;
 if(bulletin.latestDay!==book.meta.day||latest.day!==book.meta.day)error('día no coincide con la campaña');
 if(bulletin.latestEdition!==edition||latest.edition!==edition)error('edición no coincide con la campaña');
 if(!unique(bulletin.issues.map(x=>x.id)))error('ediciones duplicadas');
 let newsCount=0,eyeCount=0;
 for(const [i,issue] of bulletin.issues.entries()){
  if(i&&issue.day>bulletin.issues[i-1].day)error('ediciones no ordenadas');
  if(!Array.isArray(issue.news)||!issue.news.length||!Array.isArray(issue.eye))error('falta Gaceta u Ojo');
  if(!unique(issue.news.map(x=>x.id))||!unique(issue.eye.map(x=>x.id)))error('entradas duplicadas');
  for(const entry of issue.eye){
   if(entry.kind!=='game'||typeof entry.title!=='string'||!entry.fact||!entry.source||typeof entry.interpretation!=='string')
    error('Ojo sin dato mecánico y procedencia');
   eyeCount++;
  }
  for(const n of issue.news){
   if(!['game','fiction','literary'].includes(n.sourceType)||!n.title||!n.body||!n.source||!n.editorialNote)
    error('noticia sin contenido, capa de verdad o procedencia');
   newsCount++;
  }
 }
 console.log('✓ Boletín válido: '+bulletin.issues.length+' ediciones, '+eyeCount+' pistas, '+newsCount+' noticias.');
}catch(e){console.error('✗ '+e.message);process.exitCode=1}
