#!/usr/bin/env node
/* Registra UN nuevo capítulo editorial ya revisado. No publica ni modifica capítulos previos.
 * node scripts/add-chapter.mjs --file borrador.json
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
const argv=process.argv.slice(2);
function fail(message){throw Error(message);}
const parseArgs=()=>{
 const args={dryRun:false};for(let i=0;i<argv.length;i++){if(argv[i]==='--dry-run'){args.dryRun=true;continue;}if(argv[i]==='--file'&&argv[i+1]&&!argv[i+1].startsWith('--')){args.file=argv[++i];continue;}fail('Uso: --file borrador.json [--dry-run]');}
 return args;
};
try{
 const args=parseArgs();
 if(!args.file)fail('Falta --file');
 const raw=fs.readFileSync(args.file,'utf8');
 if(raw.length>250000)fail('Capítulo demasiado grande');
 const c=JSON.parse(raw);
 if(!c||typeof c!=='object'||Array.isArray(c))fail('Capítulo inválido');
 if(typeof c.id!=='string'||!/^[a-z][a-z0-9-]{2,90}$/.test(c.id))fail('ID de capítulo inválido');
 if(!c.title||typeof c.title!=='string'||!Array.isArray(c.paragraphs)||!c.paragraphs.length||!c.paragraphs.every(p=>typeof p==='string'&&p.trim()))fail('Faltan título o párrafos');
 for(const field of ['chapter','years','lead','source'])if(typeof c[field]!=='string'||!c[field].trim())fail('Falta '+field);
 if(!Array.isArray(c.facts)||!c.facts.every(x=>typeof x==='string'))fail('Faltan hechos verificables');
 if(c.speakers!==undefined&&(!c.speakers||typeof c.speakers!=='object'||Array.isArray(c.speakers)))fail('Mapa de diálogos inválido');
 if(!Array.isArray(c.characterIds))fail('Debe aportar characterIds');
 const script=path.join(root,'novel','chapters',c.id+'.js');
 if(fs.existsSync(script))fail('El capítulo ya existe y no puede sobrescribirse');
 const htmlPath=path.join(root,'index.html'),html=fs.readFileSync(htmlPath,'utf8');
 const anchor='<script src="novel/relationships.js"></script>';
 if(!html.includes(anchor))fail('No se reconoce el punto de inserción de capítulos');
 const ctx=vm.createContext({});
 vm.runInContext(fs.readFileSync(path.join(root,'data/campaign.js'),'utf8'),ctx);
 const book=JSON.parse(vm.runInContext('JSON.stringify(BOOK)',ctx));
 const names=new Set(book.characters.map(h=>h.name)),ids=new Set(book.characters.map(h=>h.id));
 for(const id of c.characterIds)if(!ids.has(id)&&!names.has(id))fail('Personaje desconocido: '+id);
 const secondaryIds=new Set((c.literaryCharacters||[]).map(x=>x.id));
 for(const [index,speaker] of Object.entries(c.speakers||{})){
  const i=Number(index);
  if(!Number.isInteger(i)||i<0||i>=c.paragraphs.length||!c.paragraphs[i].trim().startsWith('—'))fail('Speaker fuera de diálogo: '+index);
  if(!ids.has(speaker)&&speaker!=='guildmaster'&&!secondaryIds.has(speaker))fail('Speaker desconocido: '+speaker);
 }
 for(let i=0;i<c.paragraphs.length;i++)if(c.paragraphs[i].trim().startsWith('—')&&!c.speakers?.[String(i)])fail('Falta speaker en diálogo '+i);
 if(c.id.includes('..'))fail('Ruta no permitida');
 const nextScript='<script src="novel/chapters/'+c.id+'.js"></script>\n';
 if(html.includes('novel/chapters/'+c.id+'.js'))fail('Capítulo ya registrado en index.html');
 const nextHtml=html.replace(anchor,nextScript+anchor);
 const chapterText='/* Capítulo editorial aprobado: '+c.id+' */\nBOOK.chapters.push('+JSON.stringify(c)+');\n';
 if(args.dryRun){
  console.log('Vista previa validada: '+c.id+' ('+c.paragraphs.length+' párrafos); no se cambiaron archivos.');
 }else{
  fs.writeFileSync(script,chapterText,{flag:'wx'});
  try{fs.writeFileSync(htmlPath,nextHtml)}catch(e){fs.unlinkSync(script);throw e;}
  console.log('Capítulo añadido a rama de trabajo: '+c.id+'. Revisar diff antes de publicar.');
 }
}catch(e){console.error('ERROR:',e.message);process.exitCode=1;}
