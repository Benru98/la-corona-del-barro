#!/usr/bin/env node
/* Registra ilustraciones ya disponibles en el repositorio como borrador.
 * node scripts/register-art.mjs --id scene-... --src assets/scenes/....webp --kind scene
 * Opcional: --character-id adv_... --label 'Pensativo' --moods 'reflexivo,sereno' --edition v3
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..'),argv=process.argv.slice(2);
try{
 const args={};for(let i=0;i<argv.length;i+=2){if(!argv[i]?.startsWith('--')||!argv[i+1])throw Error('Opción inválida');args[argv[i].slice(2)]=argv[i+1];}
 const id=args.id,src=args.src,kind=args.kind;
 if(!id||!/^[a-z][a-z0-9-]{2,90}$/.test(id))throw Error('ID inválido');
 if(!['portrait','scene','cover','crest','dialogue','character-art','placeholder'].includes(kind))throw Error('Tipo artístico inválido');
 if(!src||!/^assets\/[a-zA-Z0-9/_-]+\.(webp|png|svg|jpg|jpeg)$/.test(src)||src.includes('..'))throw Error('Ruta inválida (usar assets/...)');
 const abs=path.resolve(root,src);
 if(!abs.startsWith(root+path.sep)||!fs.statSync(abs).isFile())throw Error('La imagen debe existir antes de registrarse');
 const catalogPath=path.join(root,'art/catalog.js'),content=fs.readFileSync(catalogPath,'utf8');
 const ctx=vm.createContext({});vm.runInContext(content,ctx);
 const catalog=JSON.parse(vm.runInContext('JSON.stringify(ART_CATALOG)',ctx));
 if(catalog.items.some(x=>x.id===id||x.src===src))throw Error('ID o ruta ya registrados');
 if(args['legacy-key']&&catalog.items.some(x=>x.legacyKey===args['legacy-key']))throw Error('La clave visual ya está ocupada. No sobrescribir imágenes aprobadas');
 if(args['character-id']){
  const bc=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'data/campaign.js'),'utf8'),bc);
  const book=JSON.parse(vm.runInContext('JSON.stringify(BOOK)',bc));
  if(!book.characters.some(c=>c.id===args['character-id']))throw Error('Personaje desconocido');
 }
 const label=args.label?.trim();
 if(label&&label.length>120)throw Error('Etiqueta demasiado larga');
 const moods=args.moods?.split(',').map(x=>x.trim()).filter(Boolean)||[];
 if(moods.length>5||moods.some(x=>!/^[a-z][a-z0-9_-]{1,30}$/.test(x)))throw Error('Emociones inválidas: usar palabras sencillas separadas por comas');
 const edition=args.edition?.trim();
 if(edition&&!/^v[0-9]{1,3}$/.test(edition))throw Error('Edición inválida (ejemplo: v3)');
 const entry={id,src,kind,status:'draft',
  ...(args['legacy-key']?{legacyKey:args['legacy-key']}:{ }),
  ...(args['character-id']?{characterId:args['character-id']}:{ }),
  ...(label?{label}:{ }),...(moods.length?{moods}:{ }),...(edition?{edition}:{ })};
 catalog.items.push(entry);
 fs.writeFileSync(catalogPath,'/* Catálogo canónico de arte aprobado y borradores; IDs estables. */\nconst ART_CATALOG='+JSON.stringify(catalog)+';\n');
 console.log('Ilustración registrada como borrador (no visible hasta aprobar): '+id);
}catch(e){console.error('ERROR:',e.message);process.exitCode=1;}
