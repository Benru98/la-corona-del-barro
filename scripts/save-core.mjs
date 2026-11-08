import {createHash} from 'node:crypto';
import {fallenId,fallenName,reconcileCasualties} from './mortality-core.mjs';
import HouseEngine from '../data/house-state.js';

/*
 * Adapter para guardados REALES de Dungeons & Dynasties v26.
 * Nunca modifica el guardado original ni publica JSON crudos.
 */
export const SAVE_VERSION = 26;
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const assert = (ok,message) => {if(!ok) throw new Error(message);};
const unique = items => new Set(items).size === items.length;
const num = (v,name) => {assert(typeof v === 'number' && Number.isFinite(v), name + ': número inválido');return v;};
const normBondKey = key => key.split('|').sort().join('|');
const byId = arr => new Map(arr.map(x=>[x.id,x]));
const sorted = arr => [...arr].sort((a,b)=>a.localeCompare(b,'es'));
const sum = v => JSON.stringify(v);
export const fingerprint = data => createHash('sha256').update(typeof data==='string'?data:JSON.stringify(data)).digest('hex');
export function validateSave(save) {
  assert(isObj(save) && save.version === SAVE_VERSION, 'Formato de guardado desconocido (se espera versión 26)');
  const g = save.guild;
  assert(isObj(g) && typeof g.name === 'string' && g.name.length>0,'Falta guild.name');
  assert(Number.isInteger(g.day) && g.day>=0,'guild.day inválido');
  assert(Array.isArray(g.roster) && Array.isArray(g.fallen),'Faltan roster/fallen');
  assert(isObj(g.bonds) && isObj(g.hall) && isObj(g.league),'Faltan estructuras clave');
  assert(isObj(g.tally) && Array.isArray(g.activeJobs) && Array.isArray(g.meetings),'Estructura incompleta');
  assert(unique(g.roster.map(h=>h.id)) && g.roster.every(h=>typeof h.id==='string' && typeof h.name==='string'),'IDs de personajes inválidos o duplicados');
  assert(g.roster.length<1000,'Número de héroes inesperado');
  assert(unique(g.fallen.map(fallenId))&&g.fallen.every(f=>typeof fallenId(f)==='string'),'IDs de caídos inválidos o duplicados');
  assert(g.fallen.every(f=>!g.roster.some(h=>h.id===fallenId(f))),'Una persona no puede estar viva y caída simultáneamente');
  num(g.gold,'gold');num(g.renown,'renown');
  return g;
}
function relationValues(g) {
  const result = new Map();
  for(const [pair,bond] of Object.entries(g.bonds)){
    assert(pair.split('|').length===2 && isObj(bond),'Vínculo inválido: '+pair);
    const key=normBondKey(pair);
    assert(!result.has(key),'Vínculo duplicado invertido: '+pair);
    result.set(key,num(bond.value,'bond '+pair));
  }
  return result;
}
function indexList(items,identity) {
  const m=new Map();
  for(const item of items){
    const key=identity(item);
    assert(!m.has(key),'Registro repetido: '+key);
    m.set(key,item);
  }
  return m;
}
const jobKey = j => String(j.id??j.posting?.id??'');
const meetingKey = m => [m.day,m.oppId??m.oppName??'',m.kind??''].join('|');
const questKey = q => String(q.id??[q.day,q.title,q.kind].join('|'));
function stats(g) {
  return {day:g.day+1,gold:g.gold,renown:g.renown,members:g.roster.length,dead:g.fallen.length,
    delves:g.tally.delves??0,cleared:g.tally.cleared??0,
    leagueTier:g.league.playerTier,meetings:g.meetings.length,quests:(g.questLog??[]).length,bonds:Object.keys(g.bonds).length,
    activeJobs:g.activeJobs.length};
}
const equal = (a,b)=>JSON.stringify(a)===JSON.stringify(b);
function listDiff(oldItems,newItems,identify){
  const a=indexList(oldItems,identify),b=indexList(newItems,identify);
  return {added:[...b.keys()].filter(k=>!a.has(k)).map(k=>b.get(k)),
    removed:[...a.keys()].filter(k=>!b.has(k)).map(k=>a.get(k))};
}
export function compareSaves(previous,next) {
  const a=validateSave(previous),b=validateSave(next);
  assert(a.name===b.name,'Los guardados pertenecen a gremios distintos');
  assert(b.day>=a.day,'Guardado anterior al de referencia: operación rechazada');
  const before=stats(a),after=stats(b);
  const metricChanges=Object.keys(after).filter(key=>!equal(before[key],after[key])).map(key=>({field:key,before:before[key],after:after[key],delta:typeof after[key]==='number'?after[key]-before[key]:null}));
  const heroesA=byId(a.roster),heroesB=byId(b.roster);
  const roster=listDiff(a.roster,b.roster,x=>x.id);
  const characterChanges=[];
  const tracked=['name','level','experience','morale','condition','stress','fatigue','oathWage','post','away','injury','attributes','traitIds','stakes'];
  for(const [id,now] of heroesB) {
    const old=heroesA.get(id);if(!old)continue;
    const fields=tracked.filter(k=>!equal(old[k],now[k])).map(k=>({field:k,before:old[k]??null,after:now[k]??null}));
    if(fields.length)characterChanges.push({id,name:now.name,fields});
  }
  const notesA=a.heroNotes||{},notesB=b.heroNotes||{};
  const noteChanges=[...new Set([...Object.keys(notesA),...Object.keys(notesB)])].filter(id=>notesA[id]!==notesB[id]).map(id=>({id,before:notesA[id]||null,after:notesB[id]||null}));
  const bondsA=relationValues(a),bondsB=relationValues(b);
  const bonds=[];
  for(const k of sorted(new Set([...bondsA.keys(),...bondsB.keys()]))) {
    const beforeValue=bondsA.get(k),afterValue=bondsB.get(k);
    if(beforeValue!==afterValue)bonds.push({pair:k,before:beforeValue??null,after:afterValue??null,delta:beforeValue!==undefined&&afterValue!==undefined?afterValue-beforeValue:null,status:beforeValue===undefined?'new':afterValue===undefined?'removed':'changed'});
  }
  const jobs=listDiff(a.activeJobs,b.activeJobs,jobKey);
  const meetings=listDiff(a.meetings,b.meetings,meetingKey);
  const quests=listDiff(a.questLog??[],b.questLog??[],questKey);
  const fallen=listDiff(a.fallen,b.fallen,fallenId);
  const facilities={};
  for(const k of sorted(new Set([...Object.keys(a.hall.facilities??{}),...Object.keys(b.hall.facilities??{})]))) {
    if(a.hall.facilities?.[k]!==b.hall.facilities?.[k]) facilities[k]={before:a.hall.facilities?.[k]??null,after:b.hall.facilities?.[k]??null};
  }
  const review=[];
  if(roster.added.length)review.push('Altas: crear fichas, retratos y biografías antes de publicar');
  if(roster.removed.length||fallen.added.length)review.push('Bajas o fallecimientos: revisar el canon y la continuidad');
  if(bonds.some(x=>x.status!=='changed'))review.push('Vínculos nuevos/desaparecidos: asignar categoría y contexto manualmente');
  if(jobs.removed.length)review.push('Encargos terminados/desaparecidos: el cambio no prueba su resultado');
  if(meetings.added.length||quests.added.length)review.push('Nuevos encuentros o misiones: validar sus resultados antes de narrarlos');
  if(before.leagueTier!==after.leagueTier)review.push('Cambio de división: revisar nombre, ascenso y clasificación');
  if(b.day===a.day && !equal(a,b))review.push('Dos guardados del mismo día: revisar orden cronológico');
  return {format:'corona-save-diff/v1',guild:b.name,gameVersion:SAVE_VERSION,fromDay:before.day,toDay:after.day,
    summary:{before,after,metrics:metricChanges},
    roster:{added:roster.added.map(x=>({id:x.id,name:x.name})),removed:roster.removed.map(x=>({id:x.id,name:x.name})),changed:characterChanges},
    noteChanges,bonds,jobs:{added:jobs.added,removed:jobs.removed},meetings,quests,fallen:{added:fallen.added.map(x=>({id:fallenId(x),name:fallenName(x)})),removed:fallen.removed.map(x=>({id:fallenId(x),name:fallenName(x)}))},
    facilities,review,requiresEditorialReview:review.length>0,events:HouseEngine.eventsFromDiff({fallen:{added:fallen.added.map(x=>({id:fallenId(x),name:fallenName(x)}))},roster:{added:roster.added,changed:characterChanges},bonds,jobs,facilities,summary:{before,after}})};
}
const scalarCharacterFields={level:'level',experience:'experience',morale:'morale',condition:'condition',stress:'stress',fatigue:'fatigue',oathWage:'salary'};
function safeNumField(v,name){return num(v,name);}
function bondMap(book){const out=new Map();for(const r of book.relationships??[])out.set(normBondKey(r.a+'|'+r.b),r);return out;}
export function prepareCampaignUpdate(book, previous, next, sourceName='guardado.json') {
  const diff=compareSaves(previous,next);
  const g=next.guild,base=previous.guild;
  assert(isObj(book)&&book.bookId==='la-corona-de-barro','El documento no es el libro esperado');
  assert(book.meta?.guild===g.name,'El nombre de la Casa no coincide');
  assert(book.meta.day===base.day+1,'El libro publicado no coincide con el guardado anterior (día)');
  const bookIds=new Set((book.characters??[]).map(x=>x.id));
  const oldIds=new Set([...base.roster,...base.fallen].map(x=>x.id));
  // El libro conserva vendidos y retirados que ya no figuran en el guardado activo.
  const missing=[...oldIds].filter(id=>!bookIds.has(id));
  assert(!missing.length,
    'Faltan identidades del guardado anterior en el libro (revisión manual): '+missing.join(', '));
  const result=structuredClone(book);
  const changes=[];
  function replace(obj,key,value,path) {
    if(!equal(obj[key],value)){changes.push({path,before:obj[key]??null,after:value});obj[key]=value;}
  }
  replace(result.meta,'day',g.day+1,'meta.day');
  const mapping={gold:g.gold,renown:g.renown,members:g.roster.length,dead:g.fallen.length,delves:g.tally.delves,
    clearRate:g.tally.delves?Math.round(100*g.tally.cleared/g.tally.delves):0,day:g.day+1,bonds:Object.keys(g.bonds).length};
  for(const [key,value] of Object.entries(mapping))replace(result.stats,key,safeNumField(value,key),'stats.'+key);
  for(const hero of result.characters) {
    const fresh=g.roster.find(x=>x.id===hero.id);
    if(!fresh)continue; // removals are manually reviewed; never delete a historical character
    for(const [raw,dest] of Object.entries(scalarCharacterFields))
      if(typeof fresh[raw]==='number')replace(hero,dest,safeNumField(fresh[raw],raw),'characters.'+hero.id+'.'+dest);
    if(isObj(fresh.attributes))replace(hero,'attributes',structuredClone(fresh.attributes),'characters.'+hero.id+'.attributes');
  }
  for(const hero of result.characters){
    if(Object.hasOwn(g.heroNotes||{},hero.id))replace(hero,'founderNote',g.heroNotes[hero.id],'characters.'+hero.id+'.founderNote');
  }
  // Bajas automáticas: mantener fichas y memorias, pero excluir de los activos.
  // El relato de los últimos instantes no se infiere desde el juego.
  const mortality=reconcileCasualties(result,g);
  if(mortality.newDeaths.length)changes.push({path:'world.fallen',before:book.world?.fallen||[],after:result.world.fallen});
  const existing=bondMap(result);
  for(const [key,v] of relationValues(g)){
    const item=existing.get(key);if(!item)continue; // new bonds need editorial classification
    replace(item,'rawValue',v,'relationships.'+key+'.rawValue');
    replace(item,'strength',v,'relationships.'+key+'.strength');
    if(item.before!==undefined) replace(item,'change',v-item.before,'relationships.'+key+'.change');
  }
  if(isObj(g.hall.facilities)) replace(result.world,'buildings',structuredClone(g.hall.facilities),'world.buildings');
  if(typeof g.hall.level==='number')replace(result.world,'hallLevel',g.hall.level,'world.hallLevel');
  const projectedJobs=g.activeJobs.map(j=>({
    name:j.posting?.title??j.name??'Encargo sin título',
    heroIds:Array.isArray(j.heroIds)?[...j.heroIds]:[],
    startDay:typeof j.sentDay==='number'?j.sentDay+1:null,
    returnsDay:typeof j.returnsDay==='number'?j.returnsDay+1:null
  }));
  replace(result.world,'activeJobs',projectedJobs,'world.activeJobs');
  // El juego registra incursiones en roster[].away aun cuando activeJobs está vacío.
  const out=g.roster.filter(hero=>hero.away?.delve);
  const jobIds=new Set(out.map(hero=>hero.away.jobId));
  if(jobIds.size>1)throw Error('Varias expediciones simultáneas: es necesaria revisión');
  const expedition=out.length?{
    name:'Incursión en '+(out[0].away.region||'región no identificada'),
    jobId:out[0].away.jobId,
    heroIds:out.map(hero=>hero.id),
    startDay:g.day+1,
    returnsDay:Number.isInteger(out[0].away.returnsDay)?out[0].away.returnsDay+1:null,
    region:out[0].away.region
  }:null;
  replace(result.world,'activeExpedition',expedition,'world.activeExpedition');
  for(const hero of result.characters){
    const raw=g.roster.find(x=>x.id===hero.id);
    if(!raw)continue;
    const away=raw.away?{...raw.away,returnsDay:Number.isInteger(raw.away.returnsDay)?raw.away.returnsDay+1:null,kind:raw.away.loan?'cesión':raw.away.delve?'incursión':'encargo'}:null;
    replace(hero,'away',away,'characters.'+hero.id+'.away');
  }
  replace(result.world,'guildRosterAlive',g.roster.map(h=>h.id),'world.guildRosterAlive');
  if(g.league?.divisions){
    const d=g.league.divisions.find(x=>x.tier===g.league.playerTier);
    const player=d?.guilds?.find(x=>x.id==='player');
    if(d&&player){
      const position=[...d.guilds].sort((a,b)=>(b.points||0)-(a.points||0)||(b.won||0)-(a.won||0)).findIndex(x=>x.id==='player')+1;
      const league={position,of:d.guilds.length,points:player.points,played:player.played,won:player.won,drawn:player.drawn,lost:player.lost,
        leader:d.guilds.reduce((a,b)=>a.points>=b.points?a:b).name,tiedOnPointsWith:d.guilds.filter(x=>x.id!=='player'&&x.points===player.points).map(x=>x.name)};
      replace(result.world,'league',league,'world.league');
      for(const [key,value] of Object.entries({leaguePoints:player.points,leaguePosition:position,leagueSize:d.guilds.length,encounters:player.played}))
        replace(result.stats,key,value,'stats.'+key);
    }
  }
  if(Array.isArray(g.discoveredSynergies))replace(result.stats,'synergies',g.discoveredSynergies.length,'stats.synergies');
  if(g.bonds)replace(result.stats,'bonds',Object.keys(g.bonds).length,'stats.bonds');
  if(g.day>base.day) {
    const snapshot={year:result.meta.year,day:g.day+1,renown:result.stats.renown,gold:result.stats.gold,
      members:result.stats.members,delves:result.stats.delves,dead:result.stats.dead,
      titles:result.stats.titles,promotion:result.stats.promotion,relegation:result.stats.relegation,
      championships:result.stats.championships,league:result.world.division,
      leaguePoints:result.stats.leaguePoints,leaguePosition:result.stats.leaguePosition,bonds:result.stats.bonds};
    if(!result.snapshots.some(s=>s.year===snapshot.year && s.day===snapshot.day))result.snapshots.push(snapshot);
  }
  // El registro técnico de acontecimientos es distinto de los capítulos y de la cronología literaria.
  // Nunca atribuir éxitos ni motivaciones que no constan en el guardado.
  const titleFor={death:'Fallecimiento registrado',recruitment:'Nueva incorporación',promotion:'Ascenso de nivel',departure:'Salida de la Casa',return:'Regreso a la Casa',injury:'Cambio de lesión',division_changed:'Cambio de división',building_changed:'Instalaciones actualizadas',bond_changed:'Vínculo actualizado',job_started:'Nuevo encargo',job_ended:'Encargo cerrado o desaparecido',post_changed:'Cambio de puesto',assignment_changed:'Cambio de destino'};
  const previousEvents=Array.isArray(result.world.systemEvents)?result.world.systemEvents:[];
  const generated=diff.events.map((e,i)=>({
    id:[result.meta.year,g.day+1,e.kind,e.subjectId||'casa',i].join(':'),
    year:result.meta.year,day:g.day+1,kind:e.kind,subjectId:e.subjectId,
    title:titleFor[e.kind]||'Cambio en la Casa',
    description:(e.details?.name?e.details.name+' · ':'')+(e.requiresEditorialReview?'Pendiente de interpretación editorial.':'Cambio registrado en el guardado.'),
    needsEditorialReview:e.requiresEditorialReview,
    details:e.details
  }));
  replace(result.world,'systemEvents',[...previousEvents,...generated],'world.systemEvents');
  // Nunca sobrescribir textos, memorias, escenas ni el atlas literario desde un JSON mecánico.
  for(const key of ['chapters','literaryRelationships','literaryTagCatalog','editions','timeline','marginalia'])
    assert(equal(result[key],book[key]),'Cambio no autorizado en canon: '+key);
  const audit=HouseEngine.audit(result);
  const blocking=diff.review.length>0||audit.length>0;
  if(diff.noteChanges?.length)changes.push({path:'founderNotes',before:null,after:diff.noteChanges.map(x=>x.id)});
  const warnings=[
    'Borrador no publicado: revisar y aprobar antes de sustituir data/campaign.js.',
    'Cálculos de clasificación, hazañas, encuentros, biografías y cronología requieren revisión editorial.',
    ...diff.review,
    ...audit.map(issue=>'Auditoría ['+issue.code+']: '+issue.message)
  ];
  return {format:'corona-campaign-proposal/v1',source:sourceName,gameVersion:SAVE_VERSION,fromDay:base.day+1,toDay:g.day+1,
    updatedPaths:changes.map(x=>x.path),changes,blocking,review:warnings,events:diff.events,campaign:result,audit};
}
export function reportMarkdown(diff,proposal) {
  const lines=['# Informe de guardados — '+diff.guild,'','**Día visible:** '+diff.fromDay+' → '+diff.toDay,
    '**Versión del juego:** '+diff.gameVersion,'','## Indicadores'];
  for(const m of diff.summary.metrics)lines.push('- '+m.field+': '+m.before+' → '+m.after);
  lines.push('','## Aventureros','- Altas: '+diff.roster.added.map(x=>x.name).join(', '),
    '- Salidas: '+diff.roster.removed.map(x=>x.name).join(', '),
    '- Fichas modificadas: '+diff.roster.changed.length,'- Notas personales cambiadas: '+(diff.noteChanges||[]).length,'','## Vínculos',
    '- Cambios: '+diff.bonds.length,'','## Actividad',
    '- Nuevos encuentros: '+diff.meetings.added.length,
    '- Nuevos registros de misión: '+diff.quests.added.length,
    '- Encargos abiertos: '+diff.jobs.added.length,
    '- Encargos desaparecidos: '+diff.jobs.removed.length,
    '','## Revisión obligatoria');
  for(const s of (proposal?.review??diff.review))lines.push('- '+s);
  if(proposal)lines.push('','## Propuesta de actualización','- Campos mecánicos propuestos: '+proposal.changes.length,
    '- Publicación automática: NO. Es necesaria revisión.');
  return lines.join('\n')+'\n';
}
