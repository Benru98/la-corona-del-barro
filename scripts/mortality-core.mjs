/*
 * La Corona de Barro · protocolo persistente de bajas
 * Único lugar de reconciliación para fallen[] del juego; NO elimina personajes.
 * La crónica y la descripción imaginada de una muerte quedan en la capa editorial.
 */
export const fallenId=entry=>entry?.adventurer?.id??entry?.id??null;
export const fallenName=entry=>entry?.adventurer?.name??entry?.name??null;
const visibleDay=internal=>Number.isInteger(internal)?internal+1:null;

export function reconcileCasualties(book,guild){
 if(!Array.isArray(guild?.roster)||!Array.isArray(guild?.fallen)||!Array.isArray(book?.characters))
  throw new Error('Faltan los datos de la Casa para reconciliar bajas');
 const rosterIds=new Set(guild.roster.map(h=>h.id));
 const fallenIds=new Set();const byId=new Map(book.characters.map(c=>[c.id,c]));
 const existing=new Map((book.world?.fallen||[]).map(d=>[d.id,d]));
 const oldDeaths=[];const newDeaths=[];
 for(const entry of guild.fallen){
  const id=fallenId(entry),raw=entry.adventurer||entry;
  if(!id||fallenIds.has(id)||rosterIds.has(id))throw new Error('Caído duplicado o también activo: '+id);
  fallenIds.add(id);
  const c=byId.get(id);
  if(!c)throw new Error('Caído desconocido: crear y revisar su ficha antes de publicar '+id);
  const old=existing.get(id)||{};
  const first=!c.death;
  const year=old.year||c.death?.year||book.meta?.year||1;
  const day=c.death?.day??old.day??visibleDay(entry.day);
  const place=c.death?.place||old.place||entry.dungeon||'Lugar no registrado';
  const epitaph=c.death?.epitaph||old.epitaph||entry.epitaph||'Su nombre permanece en el Juramento del Barro.';
  c.status='caído';
  c.away=null; // No es seleccionable ni figura en salidas activas.
  c.death={...(c.death||{}),year,day,place,epitaph,cause:c.death?.cause||'Caído en servicio'};
  c.memories??=[];
  if(first){
    const title='Día '+(day??'—')+' · La Casa guarda su nombre';
    if(!c.memories.some(m=>m.title===title))
      c.memories.push({year,title,text:'Caído en '+place+'. '+epitaph});
    newDeaths.push({id,name:c.name,year,day,place});
  }else oldDeaths.push(id);
  c.memorial??={
    feat:(c.statistics?.incursions||c.incursions||0)+' incursiones al servicio de La Corona de Barro.',
    quote:'La Casa recuerda a quienes no regresaron.',
    attribution:'El Libro de la Casa · homenaje literario'
  };
  existing.set(id,{...old,id,name:c.name,year,day,place,epitaph});
 }
 for(const h of guild.roster){
  const c=byId.get(h.id);
  if(c?.death || c?.status==='caído')throw new Error('Regreso de un caído no confirmado; requiere revisión editorial: '+h.id);
  if(c)c.status=h.away?(h.away.loan?'en cesión':'en incursión'):'en la Casa';
 }
 if(!book.world)book.world={};
 book.world.fallen=[...existing.values()].sort((a,b)=>(a.day||0)-(b.day||0));
 book.world.guildRosterAlive=[...rosterIds];
 if(!book.stats)book.stats={};
 book.stats.members=rosterIds.size;
 book.stats.dead=fallenIds.size;
 // Todos los personajes del libro son históricos, independientemente del turno actual.
 return {newDeaths,previousDeaths:oldDeaths,active:rosterIds.size,fallen:fallenIds.size};
}
