/* Consejo de patrullas: calculado en cada apertura desde el guardado publicado. */
(function(global){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const active=c=>!['caído','retirada','vendida'].includes(c.status)&&!c.aspirant;
const unavailable=c=>!!c.away||!!c.injury?.incapacitated||Number(c.injury?.daysLeft||0)>0||c.status==='en camino';
const ca=c=>Number(c.currentAbility)||0, rating=c=>c.gameRating==null?-1:Number(c.gameRating);
const gap=c=>c.currentAbility==null||c.potentialAbility==null?null:Math.max(0,Number(c.potentialAbility)-Number(c.currentAbility));
const order=(a,b)=>rating(b)-rating(a)||ca(b)-ca(a)||a.name.localeCompare(b.name,'es');
const roles={tank:'tanque',dps:'daño',healer:'sanador'},quota={tank:1,dps:2,healer:1};
const training={tank:[['armorUse','armadura'],['mitigation','mitigación'],['parry','parada'],['threat','amenaza']],dps:[['weaponSkill','armas'],['marksmanship','puntería'],['power','potencia'],['spellcraft','hechicería'],['criticalStrike','crítico'],['positioning','posición']],healer:[['healing','curación'],['support','apoyo'],['teamwork','trabajo en equipo'],['concentration','concentración']]};
const state=c=>c.away?'fuera hasta el día '+esc(c.away.returnsDay??'—'):c.injury?'lesión ('+esc(c.injury.daysLeft??'—')+' días)':c.status==='en camino'?'en camino':'en la Casa';
function focus(c){
 const p=(training[c.role]||[]).filter(([k])=>Number.isFinite(Number(c.attributes?.[k]))).sort((a,b)=>Number(c.attributes[b[0]])-Number(c.attributes[a[0]])).slice(0,2);
 return p.length?p.map(([k,v])=>v+' ('+Math.round(Number(c.attributes[k]))+')').join(' y '):'los atributos principales de su clase';
}
function affinity(people,rels,negative){
 const ids=new Set(people.map(c=>c.id)),byId=new Map(people.map(c=>[c.id,c]));
 return (rels||[]).filter(r=>ids.has(r.a)&&ids.has(r.b)).map(r=>({a:byId.get(r.a),b:byId.get(r.b),v:Number(r.rawValue??r.strength)}))
  .filter(r=>Number.isFinite(r.v)&&(negative?r.v<=-10:r.v>=10)).sort((a,b)=>negative?a.v-b.v:b.v-a.v)[0]||null;
}
function squad(name,roster,book){
 const list=roster.filter(c=>c.post===name),counts={tank:0,dps:0,healer:0};list.forEach(c=>{if(c.role in counts)counts[c.role]++});
 const available=list.filter(c=>!unavailable(c)),good=affinity(list,book.relationships,false),bad=affinity(list,book.relationships,true);
 const bench=roster.filter(c=>['Reserva','Sin asignar'].includes(c.post)&&!unavailable(c));
 const gaps=Object.keys(quota).filter(r=>counts[r]<quota[r]);
 const advice=gaps.length?gaps.map(r=>{const candidate=bench.filter(c=>c.role===r).sort(order)[0];return 'Falta '+roles[r]+(candidate?': valorar a '+esc(candidate.name)+' de la reserva.':': considerar un relevo o fichaje.');}).join(' '):'Equilibrio básico completo: 1 tanque, 2 de daño y 1 sanador.';
 const lead=[...list].sort(order)[0];
 const tags=Object.keys(quota).map(r=>'<span class="'+(counts[r]<quota[r]?'advisor-missing':'')+'">'+esc(roles[r])+' '+counts[r]+'/'+quota[r]+'</span>').join('');
 return '<article class="advisor-squad"><header><div class="eyebrow">FORMACIÓN ACTUAL</div><h3>'+esc(name)+'</h3><small>'+available.length+' de '+list.length+' presentes</small></header><div class="advisor-chips">'+tags+'</div><p>'+advice+'</p>'+
 (lead?'<p><b>Referente:</b> '+esc(lead.name)+' · CA '+Math.round(ca(lead))+(lead.gameRating==null?' · valoración no verificada':' · valoración histórica '+esc(lead.gameRating))+'.</p>':'')+
 (good?'<p><b>Afinidad destacada:</b> '+esc(good.a.name)+' y '+esc(good.b.name)+' (+'+esc(good.v.toFixed(1))+').</p>':'<p>Sin afinidad positiva destacada registrada en esta formación.</p>')+
 (bad?'<p class="advisor-warning"><b>Posible fricción:</b> '+esc(bad.a.name)+' y '+esc(bad.b.name)+' ('+esc(bad.v.toFixed(1))+'). Explorar rotaciones equivalentes.</p>':'')+
 (list.some(unavailable)?'<p class="advisor-warning"><b>Ausencias:</b> '+list.filter(unavailable).map(c=>esc(c.name)+' — '+state(c)).join('; ')+'</p>':'')+'</article>';
}
function build(book,members){
 const roster=(members||book.characters||[]).filter(active);
 const top=[...roster].filter(c=>c.gameRating!=null).sort(order);
 const topCA=[...roster].sort((a,b)=>ca(b)-ca(a));
 const growing=roster.filter(c=>gap(c)!=null&&gap(c)>=10).sort((a,b)=>gap(b)-gap(a)).slice(0,4);
 const count=r=>roster.filter(c=>c.role===r).length,nt=count('tank'),nd=count('dps'),nh=count('healer');
 const warnings=[];
 if(nt<3)warnings.push('<b>Prioridad de fichaje: un tercer tanque.</b> Hay '+nt+' para dos patrullas principales; falta un relevo de primera línea.');
 if(nd<4)warnings.push('<b>Fichar daño.</b> Solo hay '+nd+' combatientes para dos formaciones.');
 if(nh<2)warnings.push('<b>Fichar sanador.</b> Solo hay '+nh+' para dos formaciones.');
 if(!warnings.length)warnings.push('Los perfiles principales están cubiertos; evaluar calidad y descansos antes de fichar.');
 const notAssigned=roster.filter(c=>c.post==='Sin asignar');
 if(notAssigned.length)warnings.push('<b>Pendientes de asignar:</b> '+notAssigned.map(c=>esc(c.name)+' ('+esc(roles[c.role]||c.role)+', '+state(c)+')').join('; ')+'.');
 const holy=(book.world?.synergies||[]).find(x=>x.id==='holy-order');
 const pal=roster.find(c=>/palad[ií]n/i.test(c.classLabel||'')),cler=roster.find(c=>/cl[eé]rigo/i.test(c.classLabel||''));
 if(holy&&pal&&cler)warnings.push('<b>Combinación a probar:</b> '+esc(pal.name)+' y '+esc(cler.name)+' para «'+esc(holy.name)+'» ('+esc(holy.description||holy.effect||'sinergia descubierta')+'). Confirmar que se activa con ambos en la misma patrulla.');
 const item=c=>'<li><b>'+esc(c.name)+'</b><small>'+esc(c.classLabel||roles[c.role])+' · CA '+Math.round(ca(c))+(c.gameRating==null?'':' · valoración '+esc(c.gameRating))+(unavailable(c)?' · '+state(c):'')+'</small></li>';
 const injured=roster.filter(c=>!!c.injury||Number(c.condition??100)<70||Number(c.fatigue??0)>=40);
 return '<div class="advisor-head"><span class="eyebrow">CONSEJO TÁCTICO · AÑO '+esc(book.meta?.year??'—')+' · DÍA '+esc(book.meta?.day??book.stats?.day??'—')+'</span><button class="advisor-close" type="button" data-action="close-patrol-advisor" aria-label="Cerrar consejo">×</button></div>'+
 '<h2 id="patrolAdvisorTitle">El consejo de patrullas</h2><p class="advisor-intro">Diagnóstico del último guardado aprobado. Se recalcula automáticamente en cada nueva edición.</p>'+
 '<section class="advisor-block"><h3>✦ Los héroes más capaces</h3><div class="advisor-columns"><div><h4>Mejor valoración observada</h4><ol>'+top.slice(0,4).map(item).join('')+'</ol></div><div><h4>Mayor habilidad actual (CA)</h4><ol>'+topCA.slice(0,4).map(item).join('')+'</ol></div></div><p class="advisor-source">La valoración es la última captura del juego, no una cifra actual calculada. CA y PA proceden del guardado y no son la misma escala.</p></section>'+
 '<section class="advisor-block"><h3>⚔ Formaciones y afinidades</h3><div class="advisor-squads">'+['Vanguardia','Segunda Guardia'].map(n=>squad(n,roster,book)).join('')+'</div><p class="advisor-source">La afinidad registrada no garantiza un bonus de combate; confirmar las sinergias en el juego.</p></section>'+
 '<section class="advisor-block"><h3>⌘ Entrenamientos sugeridos</h3><ol class="advisor-training">'+(growing.length?growing.map(c=>'<li><b>'+esc(c.name)+'</b>: CA '+Math.round(ca(c))+' / PA '+Math.round(Number(c.potentialAbility))+' (margen +'+Math.round(gap(c))+'). Priorizar '+esc(focus(c))+'. '+(unavailable(c)?'Esperar a su regreso/recuperación.':'Valorar Train o Mentor si lo permite la partida.')+'</li>').join(''):'<li>Sin márgenes grandes hacia el techo CA actual; seguir la evolución de atributos.</li>')+'</ol><p class="advisor-source">Consejos orientativos, no predicciones de incremento garantizado.</p></section>'+
 '<section class="advisor-block"><h3>♜ Fichajes, sinergias y rotación</h3><ul>'+warnings.map(x=>'<li>'+x+'</li>').join('')+'</ul><p class="advisor-source">Plantilla: '+nt+' tanques, '+nd+' de daño, '+nh+' sanadores. Presentes '+roster.filter(c=>!unavailable(c)).length+' de '+roster.length+' integrantes.</p></section>'+
 '<section class="advisor-block"><h3>⚕ Antes de la próxima salida</h3><ul>'+(injured.length?injured.map(c=>'<li><b>'+esc(c.name)+'</b>: '+(c.injury?'lesión ('+esc(c.injury.daysLeft??'—')+' días), ':'')+'condición '+esc(c.condition??'—')+' %, fatiga '+esc(c.fatigue??'—')+'. Revisar recuperación.</li>').join(''):'<li>Sin lesiones ni alertas importantes de condición o fatiga según el guardado.</li>')+'</ul></section>'+
 '<p class="advisor-source advisor-bottom">Este informe no altera las patrullas ni las cifras económicas del archivo.</p>';
}
let opener=null;
function close(){const dialog=document.getElementById('patrolAdvisorDialog');if(dialog?.open)dialog.close();}
function open(book,members,button){
 opener=button||null;let dialog=document.getElementById('patrolAdvisorDialog');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='patrolAdvisorDialog';dialog.className='patrol-advisor-dialog';dialog.addEventListener('click',e=>{if(e.target===dialog)close()});dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus();opener=null});document.body.appendChild(dialog);}
 dialog.innerHTML=build(book,members);dialog.setAttribute('aria-labelledby','patrolAdvisorTitle');if(!dialog.open)dialog.showModal();
}
global.PatrolAdvisor={build,open,close};
})(window);
