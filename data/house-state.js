/* Corazón de la Casa: estado derivado y eventos sin dependencias del DOM.
 * La campaña es la única fuente mecánica; el canon narrativo no se reescribe.
 * Compatible con navegador y Node para comprobar exactamente las mismas reglas.
 */
(function(root){
 'use strict';
 const array=x=>Array.isArray(x)?x:[];
 const deathOf=(book,c)=>c?.death||array(book?.world?.fallen).find(d=>d.id===c?.id)||null;
 const isFallen=(book,c)=>!!c&&(c.status==='caído'||!!deathOf(book,c));
 const idOf=x=>x?.id||null;
 const toIds=x=>new Set(array(x).map(idOf).filter(Boolean));
 function create(book){
  if(!book||!Array.isArray(book.characters))throw new Error('Campaña sin personajes');
  const chars=book.characters,byId=new Map(chars.map(c=>[c.id,c]));
  const living=chars.filter(c=>!isFallen(book,c)),fallen=chars.filter(c=>isFallen(book,c))
    .sort((a,b)=>(deathOf(book,a)?.year||1)-(deathOf(book,b)?.year||1)||(deathOf(book,a)?.day||0)-(deathOf(book,b)?.day||0));
  const activeJobs=array(book.world?.activeJobs);
  const expedition=book.world?.activeExpedition;
  const awayIds=new Set([...activeJobs,...(expedition?[expedition]:[])].flatMap(j=>array(j.heroIds)));
  const available=living.filter(c=>!c.away&&!awayIds.has(c.id)&&c.status!=='en incursión'&&c.status!=='en cesión'&&c.status!=='herido'&&c.injury?.incapacitated!==true);
  const availableIds=new Set(available.map(c=>c.id));
  const historicRelations=array(book.literaryRelationships).map(r=>{
   const people=array(r.people).map(id=>byId.get(id)).filter(Boolean);
   const mourning=people.some(c=>isFallen(book,c));
   return {...r,members:people,lifeStatus:mourning?'memoria':'presente',mourning,
    needsEditorialReview:mourning&&r.status!=='memoria'&&r.status!=='duelo'};
  });
  const featured=[...historicRelations].filter(r=>r.members.length>=2&&r.status!=='semilla')
   .sort((a,b)=>Number(b.intensity||0)-Number(a.intensity||0)||
    Number(b.since?.day||0)-Number(a.since?.day||0)||String(a.id).localeCompare(String(b.id)))
   .slice(0,3);
  const prospects=[...available].sort((a,b)=>Number(b.rating||0)-Number(a.rating||0)||a.name.localeCompare(b.name,'es')).slice(0,3);
  return {byId,living,fallen,available,availableIds,awayIds,activeJobs,expedition,
   relations:historicRelations,featured,prospects,
   counts:{living:living.length,fallen:fallen.length,total:chars.length,available:available.length},
   deathOf:c=>deathOf(book,c),isFallen:c=>isFallen(book,c),
   isAvailable:c=>!!c&&availableIds.has(c.id)};
 }
 function eventsFromDiff(diff){
  const events=[],add=(kind,subjectId,details={},review=false)=>events.push({kind,subjectId,details,requiresEditorialReview:review});
  for(const x of array(diff?.fallen?.added))add('death',x.id,{name:x.name},true);
  const deadIds=new Set(array(diff?.fallen?.added).map(x=>x.id));
  for(const x of array(diff?.roster?.added))if(!deadIds.has(x.id))add('recruitment',x.id,{name:x.name},true);
  for(const x of array(diff?.roster?.changed)){
   const fields=array(x.fields),field=k=>fields.find(f=>f.field===k);
   if(field('level')&&Number(field('level').after)>Number(field('level').before))
    add('promotion',x.id,{name:x.name,from:field('level').before,to:field('level').after});
   if(field('injury'))add('injury',x.id,{name:x.name,before:field('injury').before,after:field('injury').after},true);
   const away=field('away');
   if(away){
    if(!away.before&&away.after)add('departure',x.id,{name:x.name,away:away.after},true);
    if(away.before&&!away.after)add('return',x.id,{name:x.name},true);
    if(away.before&&away.after&&JSON.stringify(away.before)!==JSON.stringify(away.after))add('assignment_changed',x.id,{name:x.name},true);
   }
   if(field('post'))add('post_changed',x.id,{name:x.name,before:field('post').before,after:field('post').after});
  }
  for(const x of array(diff?.bonds))add('bond_changed',x.pair,{before:x.before,after:x.after,delta:x.delta,status:x.status},x.status!=='changed');
  for(const [name,value] of Object.entries(diff?.facilities||{}))add('building_changed',name,value);
  const oldTier=diff?.summary?.before?.leagueTier,newTier=diff?.summary?.after?.leagueTier;
  if(oldTier!==newTier)add('division_changed',null,{before:oldTier,after:newTier},true);
  for(const x of array(diff?.jobs?.added))add('job_started',String(x.id||x.name||x.posting?.id||''),{},false);
  for(const x of array(diff?.jobs?.removed))add('job_ended',String(x.id||x.name||x.posting?.id||''),{},true);
  return events;
 }
 function audit(book){
  const issues=[],report=(code,message)=>issues.push({code,message});
  const s=create(book),chars=book.characters,ids=toIds(chars);
  if(ids.size!==chars.length)report('duplicate-character','IDs de personaje duplicados');
  if(Number(book.stats?.members)!==s.counts.living)report('members-mismatch','El contador de vivos difiere del reparto');
  if(Number(book.stats?.dead)!==s.counts.fallen)report('dead-mismatch','El contador de bajas difiere del reparto');
  for(const c of s.fallen){
   if(!s.deathOf(c))report('missing-death','Caído sin registro de fallecimiento: '+c.id);
   if(c.away)report('dead-away','Caído todavía marcado como ausente: '+c.id);
   if(s.availableIds.has(c.id))report('dead-available','Caído disponible: '+c.id);
  }
  for(const job of [...s.activeJobs,...(s.expedition?[s.expedition]:[])]){
   for(const id of array(job.heroIds)){
    if(!ids.has(id))report('unknown-job-hero','Salida con aventurero desconocido: '+id);
    else if(s.isFallen(s.byId.get(id)))report('dead-in-job','Salida activa con aventurero fallecido: '+id);
   }
  }
  const deadRecords=toIds(book.world?.fallen);
  for(const c of s.fallen)if(!deadRecords.has(c.id))report('missing-fallen-registry','Caído sin entrada world.fallen: '+c.id);
  for(const id of deadRecords)if(!ids.has(id))report('unknown-fallen','Fallecido sin ficha histórica: '+id);
  for(const r of array(book.relationships))if(!ids.has(r.a)||!ids.has(r.b))report('unknown-mechanical-bond','Vínculo mecánico con ID desconocido');
  for(const r of array(book.literaryRelationships))for(const id of array(r.people))if(!ids.has(id))report('unknown-literary-bond','Vínculo literario con ID desconocido: '+id);
  const roster=new Set(array(book.world?.guildRosterAlive));
  if(roster.size)for(const id of roster)if(!ids.has(id)||s.isFallen(s.byId.get(id)))report('invalid-roster','Roster vivo incluye ID inválido o caído: '+id);
  return issues;
 }
 const api={create,eventsFromDiff,audit,deathOf,isFallen};
 root.HouseEngine=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
