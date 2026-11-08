/* Proyeccion de portada: siempre se calcula con el libro y el cierre anual vigentes. */
const HomeSummary=(function(){
'use strict';
const list=x=>Array.isArray(x)?x:[];
const numeric=x=>typeof x==='number'&&Number.isFinite(x);
const active=c=>!!c&&!c.death&&!['caído','vendida','retirada'].includes(c.status);
const priority={death:0,recruitment:1,transfer:2,departure:2,division_changed:3,league_win:4,league_loss:4,return:5,injury:6,delve_result:7,building_started:8};
function build(book,annuals){
 const m=book.meta||{},s=book.stats||{},w=book.world||{},people=list(book.characters);
 const living=people.filter(active),dead=people.filter(c=>c.status==='caído'||!!c.death);
 const edition=list(book.editions).at(-1),current=edition?.gameDay===m.day&&edition?.gameYear===m.year;
 const chapters=list(book.chapters),last=chapters.at(-1),league=w.league||{},sentences=[];
 if(w.division&&numeric(league.position)&&numeric(league.played)&&league.played>0)
  sentences.push('La Casa ocupa el '+league.position+'.º puesto de '+(league.of||s.leagueSize||'?')+' en '+w.division+', con '+league.points+' puntos tras '+league.played+' jornadas.');
 else if(w.division)sentences.push('La Casa continúa su temporada en '+w.division+'.');
 sentences.push('El gremio cuenta con '+living.length+' '+(living.length===1?'integrante':'integrantes')+' y '+dead.length+' '+(dead.length===1?'nombre en el memorial':'nombres en el memorial')+'.');
 const jobs=list(w.activeJobs);
 const incoming=jobs.filter(j=>j.kind==='viaje de incorporación').flatMap(j=>list(j.heroIds).map(id=>({c:people.find(x=>x.id===id),day:j.returnsDay}))).filter(x=>active(x.c)&&x.c.status==='en camino');
 if(incoming.length)sentences.push(incoming.map(x=>x.c.name).join(', ')+(incoming.length===1?' sigue':' siguen')+' de camino'+(incoming.length===1&&numeric(incoming[0].day)?'; llegada prevista para el día '+incoming[0].day:'')+'.');
 if(w.activeExpedition?.outcome==='pendiente')sentences.push('Hay una incursión en marcha'+(numeric(w.activeExpedition.returnsDay)?', con regreso previsto para el día '+w.activeExpedition.returnsDay:'')+'; su resultado aún no consta.');
 const jobsRemaining=jobs.filter(j=>j.kind!=='viaje de incorporación');
 if(jobsRemaining.length)sentences.push('Hay '+jobsRemaining.length+' '+(jobsRemaining.length===1?'encargo o cesión pendiente':'encargos o cesiones pendientes')+'.');
 const injured=living.filter(c=>c.injury?.daysLeft>0);
 if(injured.length)sentences.push(injured.length===1?injured[0].name+' se recupera de una lesión.':injured.length+' integrantes se recuperan de lesiones.');
 const events=list(w.systemEvents).filter(e=>e.day===m.day&&(e.year==null||e.year===m.year));
 const e=events.map((e,i)=>({e,i})).sort((a,b)=>(priority[a.e.kind]??20)-(priority[b.e.kind]??20)||a.i-b.i)[0]?.e;
 let title,text,kind,heroId=null;
 if(e){title=e.title||'Un apunte en el registro';text=e.description||'Un acontecimiento confirmado del guardado.';kind='game';const c=people.find(c=>c.id===e.subjectId);if(active(c))heroId=c.id;}
 else if(current&&list(edition.notes).length){title='En esta edición';text=edition.notes[0];kind='edition';}
 else if(last){title='Lo último en las crónicas';text=last.lead||last.title;kind='literary';}
 else{title='Las páginas de la Casa';text='El próximo acontecimiento aparecerá cuando quede registrado.';kind='empty';}
 const history=list(annuals?.years).filter(y=>numeric(y.year)&&y.year<=m.year).sort((a,b)=>b.year-a.year)[0];
 const primary=heroId?{type:'hero',id:heroId,label:'Conocer a '+(people.find(c=>c.id===heroId)?.name.split(' ')[0]||'este integrante')+' ↗'}:last?{type:'chapter',index:chapters.length-1,label:'Leer la última crónica ↗'}:{type:'nav',section:'heroes',label:'Ver aventureros ↗'};
 const action=heroId?{type:'hero',id:heroId,label:'Abrir su ficha ↗'}:{type:'nav',section:kind==='literary'?'saga':'archive',label:kind==='literary'?'Ir a las crónicas ↗':'Consultar el archivo ↗'};
 return {year:m.year,day:m.day,editionId:edition?.id||null,title:current?edition.title:'Un nuevo día para la Corona',
  intro:sentences.join(' '),primary,feature:{title,text,kind,heroId,action},
  annual:history?{year:history.year,title:history.title,description:history.subtitle||history.narrative||history.honor||'El año que quedó escrito.'}:null};
}
return Object.freeze({build});
})();
