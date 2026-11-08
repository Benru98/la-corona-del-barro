(function(){'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId=id=>BOOK.characters.find(c=>c.id===id);
const heroName=n=>BOOK.characters.find(c=>c.name===n);
/* Estado vital: una sola fuente de verdad para portada, fichas, patrullas y memorial.
 * Los caídos siguen en el archivo y en los capítulos, pero no en las formaciones activas. */
const house=()=>HouseEngine.create(BOOK);
const deathOf=c=>house().deathOf(c);
const isFallen=c=>house().isFallen(c);
const livingMembers=()=>house().living;
const fallenMembers=()=>house().fallen;
const chronicleEvents=()=>[...BOOK.timeline,...(BOOK.world.systemEvents||[])].sort((a,b)=>(a.year||1)-(b.year||1)||(a.day||0)-(b.day||0));
const deathRibbon=c=>isFallen(c)?'<span class="death-ribbon" aria-label="Fallecido">✦ IN MEMORIAM</span>':'';
const deathDate=c=>{const d=deathOf(c);return d?'Año '+(d.year||BOOK.meta.year||1)+' · día '+(d.day??'—'):'Fecha no registrada'};
const memorialFeat=c=>c.memorial?.feat||('Dejó su nombre en '+(c.statistics?.incursions||c.incursions||0)+' incursiones. Su servicio no se borra de la historia de la Casa.');
const memorialQuote=c=>c.memorial?.quote||'En esta Casa guardamos el nombre de quienes no regresan, y el lugar que dejaron entre nosotros.';
const memorialVoice=c=>c.memorial?.attribution||'El Libro de la Casa · homenaje literario';

// Almacena una URL de objeto para cada ilustración: así cada diálogo no repite 300 KB de base64 en el DOM.
const artUrlCache=new Map();
function artUrl(key){
  const raw=ART[key]||ART.placeholder;
  if(typeof raw!=='string'||!raw.startsWith('data:')||typeof URL==='undefined'||typeof URL.createObjectURL!=='function'||typeof atob==='undefined')return raw;
  if(artUrlCache.has(key))return artUrlCache.get(key);
  try{
    const comma=raw.indexOf(','),mime=(raw.slice(5,comma).split(';')[0]||'image/webp'),binary=atob(raw.slice(comma+1));
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    const objectUrl=URL.createObjectURL(new Blob([bytes],{type:mime}));artUrlCache.set(key,objectUrl);return objectUrl;
  }catch(e){return raw}
}
const portrait=c=>artUrl(c?.portrait||'placeholder');
const sections=[['home','Portada','⌂'],['saga','Crónicas','◈'],['heroes','Aventureros','♜'],['patrols','Patrullas','⚔'],['bonds','Los lazos','✧'],['legacy','Memorial','✦'],['annual','Resumen anual','❖'],['archive','El archivo','▤'],['studio','El Escritorio','✒']];
const readKey='libro-casa-'+BOOK.bookId;
let prefs={};try{prefs=JSON.parse(localStorage.getItem(readKey)||'{}')}catch(e){prefs={}}
const state={section:'home',chapter:Math.max(0,Number.isFinite(Number(prefs.lastChapter))?Number(prefs.lastChapter):0),hero:null,search:'',filter:'all',bond:'adv_agorapai6eaw',bondType:'all',bondView:'todos',era:'all',font:prefs.font||1,light:!!prefs.light,portraits:prefs.portraits!==false,returnToReader:null};
function savePrefs(){try{localStorage.setItem(readKey,JSON.stringify({lastChapter:state.chapter,font:state.font,light:state.light,portraits:state.portraits}))}catch(e){}}
function statCard(n,label,accent=false){return `<div class="stat ${accent?'accent':''}"><strong>${esc(n)}</strong><small>${esc(label)}</small></div>`}
function heading(over,title,sub=''){return `<div class="section-head"><div><div class="eyebrow">${esc(over)}</div><h1 class="section-title">${esc(title)}</h1>${sub?`<p class="section-subtitle">${esc(sub)}</p>`:''}</div></div>`}
function chip(text,type=''){return `<span class="chip ${type}">${esc(text)}</span>`}
function navs(){let html=sections.map(([k,label,icon])=>`<button type="button" data-nav="${k}" class="${state.section===k?'active':''}" ${state.section===k?'aria-current="page"':''}><span class="symbol">${icon}</span><span class="text">${esc(label)}</span></button>`).join('');document.getElementById('sideNav').innerHTML=html;document.getElementById('mobileNav').innerHTML=sections.slice(0,4).map(([k,label,icon])=>`<button data-nav="${k}" class="${state.section===k?'active':''}"><b>${icon}</b>${esc(label.replace('Aventureros','Héroes'))}</button>`).join('')+`<button type="button" data-action="toggle-menu" class="${['legacy','archive','studio'].includes(state.section)?'active':''}" aria-label="Abrir todas las secciones"><b>☰</b>Más</button>`;document.getElementById('mobileDrawerNav').innerHTML=html;document.getElementById('sideEdition').textContent='EDICIÓN '+BOOK.editions.at(-1).id+' · v'+BOOK.editions.at(-1).version;}
function closeMobileMenu(){document.body.classList.remove('menu-open');const drawer=document.getElementById('mobileDrawer');if(drawer)drawer.setAttribute('aria-hidden','true');const toggle=document.querySelector('.mobile-menu-button');if(toggle)toggle.setAttribute('aria-expanded','false')}
function toggleMobileMenu(){const opening=!document.body.classList.contains('menu-open');document.body.classList.toggle('menu-open',opening);document.getElementById('mobileDrawer')?.setAttribute('aria-hidden',opening?'false':'true');document.querySelector('.mobile-menu-button')?.setAttribute('aria-expanded',opening?'true':'false');if(opening)document.querySelector('.drawer-close')?.focus()}
function go(k,opts={}){closeMobileMenu();state.section=k;if('hero' in opts)state.hero=opts.hero;if('chapter' in opts){state.chapter=Math.max(0,Math.min(BOOK.chapters.length-1,opts.chapter));savePrefs()}state.search='';window.scrollTo({top:0,behavior:'instant'});render()}
function artHero(c){return `<img src="${portrait(c)}" alt="${c.aspirant?'Medallón provisional de':'Retrato ilustrado de'} ${esc(c.name)}" loading="lazy"/>`}
function pulseStat(n,label,nav){return `<button type="button" class="pulse-stat" data-nav="${esc(nav)}" aria-label="${esc(label)}: ${esc(n)}. Abrir ${nav==='heroes'?'aventureros':'el archivo'}"><span class="pulse-go" aria-hidden="true">↗</span><strong>${esc(n)}</strong><small>${esc(label)}</small></button>`}
function pulseHome(){
 const active=[...house().activeJobs,...(house().expedition?[house().expedition]:[])].sort((a,b)=>(a.returnsDay??999)-(b.returnsDay??999));
 const important=livingMembers().filter(c=>Number(c.stress)>=50||Number(c.fatigue)>=45).sort((a,b)=>Math.max(Number(b.stress||0),Number(b.fatigue||0))-Math.max(Number(a.stress||0),Number(a.fatigue||0))).slice(0,3);
 const chosen=house().featured;
 const paired=(ids,max=3)=>{const people=(ids||[]).map(byId).filter(Boolean);if(!people.length)return `<span class="pulse-face"><span aria-hidden="true">✦</span></span>`;if(people.length===1)return `<span class="pulse-face"><img src="${portrait(people[0])}" alt="" loading="lazy"/></span>`;return `<span class="pulse-face-stack" aria-hidden="true">${people.slice(0,max).map(c=>`<img src="${portrait(c)}" alt="" loading="lazy"/>`).join('')}</span>`};
 const shortName=job=>{if(job.name.startsWith('Dienteamarillo'))return 'Tras Dienteamarillo';if(job.name.startsWith('En cesión'))return 'Cesión a Conchamuelle';return job.name.replace('Expedición en ','En ')};
 const expeditionCards=active.map(a=>{let ids=a.heroIds||[], single=ids.length===1,who=ids.map(id=>byId(id)?.name).filter(Boolean);return `<button type="button" class="pulse-entry" ${single?`data-hero="${esc(ids[0])}"`:'data-nav="patrols"'} aria-label="${esc(a.name)}. ${esc(who.join(', '))}. Regreso previsto día ${esc(a.returnsDay??'sin fecha')}">${paired(ids)}<span class="pulse-copy"><strong>${esc(shortName(a))}</strong><small>${esc(who.length>2?`${who.slice(0,2).join(', ')} y ${who.length-2} más`:who.join(' y '))} · Día ${esc(a.returnsDay??'—')} previsto</small></span><span class="pulse-arrow" aria-hidden="true">›</span></button>`}).join('')||'<p class="source-note">Ninguna expedición pendiente en este guardado.</p>';
 const tiredCards=important.map(c=>`<button type="button" class="pulse-entry" data-hero="${esc(c.id)}" aria-label="Consultar el estado de ${esc(c.name)}"><span class="pulse-face"><img src="${portrait(c)}" alt="" loading="lazy"/></span><span class="pulse-copy"><strong>${esc(c.name)}</strong><small>${esc(c.stress)} tensión · ${esc(c.fatigue)} fatiga${c.status==='en incursión'?' · Fuera':''}</small></span><span class="pulse-arrow" aria-hidden="true">›</span></button>`).join('')||'<p class="source-note">Nadie presenta ahora valores elevados de tensión o fatiga.</p>';
 const relationCards=chosen.map(r=>{const people=r.people.map(byId).filter(Boolean);const grief=people.some(isFallen);return `<button type="button" class="pulse-entry" data-open-bond="${esc(r.people[0])}" aria-label="Explorar ${esc(r.label)} entre ${esc(people.map(p=>p.name).join(' y '))}">${paired(r.people,2)}<span class="pulse-copy"><strong>${esc(people.map(p=>p.name.split(' ')[0]).join(' y '))}</strong><small>${esc(r.label)} · ${esc(r.tags?.[0]||'Relación en desarrollo')}${grief?' · En memoria':''}</small></span><span class="pulse-arrow" aria-hidden="true">›</span></button>`}).join('')||'<p class="source-note">Los vínculos aparecerán aquí cuando se desarrollen.</p>';
 return `<section class="guild-pulse" aria-label="Estado del gremio y accesos directos"><div class="pulse-head"><div><span class="eyebrow">✦ AÑO ${esc(BOOK.meta.year)} · DÍA ${esc(BOOK.meta.day)} · ${esc(BOOK.world.division||'EL REINO')}</span><h2>El pulso de la Casa</h2><p>Lo importante hoy. Pulsa cualquier entrada para saber más.</p></div><span class="pulse-panel-mark">Según el último guardado</span></div>
 <div class="pulse-stats">${pulseStat((BOOK.world.league.played===0?'Temporada por comenzar':BOOK.stats.leaguePosition+'.º / '+BOOK.stats.leagueSize),'Clasificación','archive')}${pulseStat(BOOK.stats.leaguePoints,'Puntos de liga','archive')}${pulseStat(BOOK.stats.gold.toLocaleString('es-ES')+' g','Tesorería','archive')}${pulseStat(house().counts.living,'Aventureros','heroes')}</div>
 <div class="pulse-columns" style="margin-top:13px"><section class="pulse-panel"><div class="pulse-panel-header"><h3 class="pulse-panel-title">Fuera de la Casa</h3><span class="pulse-panel-mark">${active.length} salidas</span></div><div class="pulse-panel-list">${expeditionCards}</div></section>
 <section class="pulse-panel"><div class="pulse-panel-header"><h3 class="pulse-panel-title">Piden descanso</h3><span class="pulse-panel-mark">Tensión y fatiga</span></div><div class="pulse-panel-list">${tiredCards}</div></section>
 <section class="pulse-panel"><div class="pulse-panel-header"><h3 class="pulse-panel-title">Hilos y memorias</h3><span class="pulse-panel-mark">Nuestra novela</span></div><div class="pulse-panel-list">${relationCards}</div></section></div>
 <div class="pulse-footer"><span>✧ ${esc(BOOK.stats.delves)} incursiones completadas · ${esc(house().counts.fallen)} bajas · ${esc(BOOK.world.guildType)} · ${esc(BOOK.stats.renown)} renombre</span><button type="button" data-chapter="${Math.max(0,BOOK.chapters.length-1)}">Continuar la última lectura ↗</button></div></section>`;
}

/* Publicación del Ojo y la Gaceta: solo se muestra contenido ya aprobado. */
function houseDispatchHome(){
 const issue=HOUSE_DISPATCHES.issues[0];
 if(!issue)return '';
 const eye=issue.eye.slice(0,4);
 const news=issue.news.slice(0,3);
 return '<section class="dispatches-home" aria-label="Noticias y descubrimientos de la Casa">'+
 '<div class="dispatches-heading"><div class="eyebrow">UN MUNDO QUE CONTINÚA</div><h2>Entre líneas y rumores</h2><p>Hechos que el juego registró, e historias que Villorio podría contar.</p></div>'+
 '<div class="dispatches-grid">'+
 '<section class="dispatches-eye" aria-label="El Ojo del Escriba"><div class="dispatches-panel-head"><span class="eyebrow">◉ HECHOS COMPROBADOS</span><h3>El Ojo del Escriba</h3><small>Última revisión · Día '+esc(issue.day)+'</small></div>'+
 '<div class="dispatches-eye-list">'+eye.map(item=>'<article class="eye-item"><h4>'+esc(item.title)+'</h4><p>'+esc(item.fact)+'</p>'+
 '<details><summary>Lectura y procedencia</summary><p>'+esc(item.interpretation||'')+'</p><small>'+esc(item.source)+'</small></details></article>').join('')+'</div></section>'+
 '<section class="dispatches-gazette" aria-label="La Gaceta del Barro"><div class="dispatches-panel-head"><span class="eyebrow">✒ ECOS DE VILLORIO</span><h3>La Gaceta del Barro</h3><small>Edición del día '+esc(issue.day)+' · Rumores y literatura</small></div>'+
 '<div class="gazette-articles">'+news.map((n,i)=>'<article class="gazette-story '+(i===0?'gazette-lead':'')+'"><div class="gazette-rubric">'+esc(n.rubric||'VILLORIO')+' · '+(n.sourceType==='fiction'?'FICCIÓN':n.sourceType==='literary'?'CANON LITERARIO':'HECHO DOCUMENTADO')+'</div><h4>'+esc(n.title)+'</h4><p>'+esc(n.body)+'</p>'+
 (n.relatedChapterId&&BOOK.chapters.some(c=>c.id===n.relatedChapterId)?'<button type="button" class="gazette-link" data-chapter="'+BOOK.chapters.findIndex(c=>c.id===n.relatedChapterId)+'">Leer la crónica relacionada ↗</button>':'')+'</article>').join('')+'</div>'+
 '<p class="gazette-disclaimer">La Gaceta mezcla escenas literarias y rumores ficticios. No añade resultados ni sucesos al guardado.</p></section></div></section>';
}
function home(){const recent=chronicleEvents().slice(-4).reverse();const members=[...livingMembers(),...fallenMembers(),...BOOK.characters.filter(c=>c.status==='retirada'||c.status==='vendida')];const dead=fallenMembers();return `
<section class="cover cover-epic cover-fullbleed" aria-label="Portada ilustrada del gremio">
  <div class="epic-paint"><img class="cover-art" src="${artUrl('groupCover')}" alt="Portada de La Corona de Barro: estandarte verde con corona dorada, sede del gremio, armas y el comienzo del Juramento del Barro, sin personajes concretos" decoding="async" fetchpriority="high"/></div>
</section>
<section class="new-era-home" aria-label="Comienzo del Año II"><span class="eyebrow">✦ AÑO ${esc(BOOK.meta.year)} · DÍA ${esc(BOOK.meta.day)}</span><h2>Una silla vacía y un nombre en camino</h2><p>La Casa es tercera en Frontera con 9 puntos tras cuatro rondas. Xara fue vendida viva por 1.240 g al Cónclave de Azulhondo. Roc Guardalmena, el nuevo clérigo, ha firmado y sigue de viaje hasta el día 165. Grosco cura sus costillas; Luna, Belzar, Ulf y Jaro permanecen de incursión. Brugo sigue en el memorial.</p><div class="new-era-actions"><button type="button" class="btn gold" data-hero="adv_xhgcncku9qpi">Conocer a Roc ↗</button><button type="button" class="btn secondary" data-nav="heroes">Ver aventureros ↗</button></div></section>\n<section class="annual-home-link" aria-label="Cierre del Año I"><div><span class="eyebrow">LOS ANALES · UN AÑO COMPLETO</span><h2>El año que hicimos casa</h2><p>Campeones de Villorrio, un nombre en el memorial, dos despedidas distintas y la promesa de Frontera.</p></div><button type="button" class="btn gold" data-nav="annual">Leer el resumen del Año I ↗</button></section>
${pulseHome()}
${BOOK.world.finance?`<div class="finance-home-strip"><div><strong>El coste de la Casa: ${esc(BOOK.world.finance.current.netBeforeDelves)} g por paga</strong><span>Incursiones recientes: +${esc(BOOK.world.finance.avgDelvesGoldPerPay)} g · margen estimado ${esc(BOOK.world.finance.netWithAvgDelves>=0?'+':'')}${esc(BOOK.world.finance.netWithAvgDelves)} g cada seis días.</span></div><button type="button" class="btn secondary small" data-nav="archive">Entender las cuentas ↗</button></div>`:''}
<section class="panel" aria-label="Actualización del día 164"><div class="eyebrow">E0031 · AÑO II, DÍA 164</div><h3>Las salidas también son historia</h3><p>Xara vive ahora en el Cónclave de Azulhondo tras su venta. Roc, clérigo goliat de 19 años, ha firmado por 133 g y llegará previsiblemente el día 165. Su retrato correcto ya figura en la web, aunque el JSON del juego todavía contiene el nombre de archivo de Xara.</p><button type="button" class="btn secondary small" data-hero="adv_xhgcncku9qpi">Ver a Roc ↗</button></section>
${houseDispatchHome()}
${dead.length?`<section class="home-memorial" aria-label="Memoria de nuestros caídos"><span class="home-memorial-sigil" aria-hidden="true">✦</span><div><small>EN MEMORIA · AÑO ${esc(BOOK.meta.year||1)}</small><h2>Hay nombres que no regresan, pero permanecen.</h2><p>${esc(dead.map(c=>c.name).join(' · '))} · ${dead.length} ${dead.length===1?'vida recordada':'vidas recordadas'} por la Casa.</p></div><button type="button" class="btn secondary small" data-nav="legacy">Visitar el memorial ↗</button></section>`:''}
<section class="gallery-section" aria-label="Galería de personajes"><div class="section-heading-row"><div><div class="eyebrow">✦ EL REPARTO DE NUESTRA HISTORIA</div><h2>Los rostros de la Casa</h2><p class="source-note">La portada representa a la Casa, que permanece mientras cambian sus integrantes. Aquí debajo vive el elenco actual: sus rostros, llegadas y ausencias.</p></div><div class="rail-controls"><button type="button" class="rail-arrow" data-action="scroll-cards-left" aria-label="Desplazar retratos a la izquierda">‹</button><button type="button" class="rail-arrow" data-action="scroll-cards-right" aria-label="Desplazar retratos a la derecha">›</button><button type="button" class="btn small secondary" data-nav="heroes">Ver fichas ↗</button></div></div>
<div class="featured-rail" id="featuredRail" role="region" aria-label="Archivo de retratos, incluidos los fallecidos" tabindex="0">${members.map(c=>`<button type="button" class="featured-card ${isFallen(c)?'is-fallen':(c.status==='retirada'||c.status==='vendida')?'is-retired':''}" data-hero="${esc(c.id)}" aria-label="Abrir ficha de ${esc(c.name)}"><span class="featured-image"><img src="${portrait(c)}" alt="Retrato de ${esc(c.name)}" loading="lazy"/>${deathRibbon(c)}</span><span class="featured-card-body"><small>${isFallen(c)?'† CAÍDO · ':c.status==='vendida'?'↗ VENDIDA · ':c.status==='retirada'?'↗ PARTIÓ · ':''}${esc(c.roleLabel)} · ${esc(c.race)}</small><strong>${esc(c.name)}</strong><span class="featured-home-line">${esc(c.homeLine||c.epithet)}</span></span></button>`).join('')}</div></section>
<section class="history-panels"><div class="panel"><div class="panel-head"><div><span class="eyebrow">CRÓNICAS DE LA CASA</span><h3>Las páginas escritas</h3></div><button class="btn small secondary" data-nav="saga">Todos los capítulos ↗</button></div><div class="chapter-peek">${BOOK.chapters.map((c,i)=>({c,i})).reverse().slice(0,5).map(({c,i})=>`<button type="button" data-chapter="${i}" class="latest-card"><span><span>${esc(c.chapter)} · ${esc(c.years)}</span><b>${esc(c.title)}</b><span>${esc(c.lead)}</span></span><span class="peek-arrow">›</span></button>`).join('')}</div></div><div class="panel events-panel"><div class="panel-head"><div><span class="eyebrow">REGISTRO DEL ESCRIBA</span><h3>Las últimas noticias</h3></div><button class="btn small secondary" data-nav="archive">Archivo ↗</button></div><div class="inline-list">${recent.map(t=>`<div class="quiet-event"><strong>Día ${esc(t.day)} · ${esc(t.title)}</strong><p>${esc(t.description)}</p></div>`).join('')}</div></div></section>
<section class="oath-panel"><div class="oath-insignia">♛</div><div><span class="eyebrow">EL JURAMENTO DEL BARRO</span><h2>Una corona que no se compra</h2><p>${esc(BOOK.meta.oath).replace(/\n/g,'<br>')}</p></div></section>
<section class="maestre-codex" aria-label="El maestre de La Corona de Barro"><img src="${artUrl('maestre')}" alt="Retrato narrativo del anciano maestre de la casa" loading="lazy"/><div><div class="eyebrow">LA VOZ DEL MAESTRE · VETERANÍA DE LA SIMA</div><h2>Quien abrió las puertas de la Casa</h2><p>Un veterano curtido guía esta fundación independiente. Su retrato es nuestra representación literaria del director del gremio: no añade una raza, estadísticas ni acontecimientos al guardado.</p><button class="btn secondary small" data-nav="saga">Escuchar su voz en las crónicas ↗</button></div></section>
<div class="notice">✧ ${esc(BOOK.meta.notice)}<br><b>Nota:</b> Los hechos proceden del guardado; las conversaciones son recreaciones literarias.</div>`}
function chronicleEntries(){return BOOK.chapters.map((c,i)=>({c,i})).reverse()}
function chronicleIndexButtons(active){
 return chronicleEntries().map(({c,i},rank)=>`<button type="button" class="chronicle-index-item ${i===active?'is-current':''}" data-chapter="${i}" ${i===active?'aria-current="page"':''} aria-label="Leer ${esc(c.chapter)}: ${esc(c.title)}"><span class="chronicle-index-label">${esc(c.chapter)} ${rank===0?'<small class="chronicle-new-label">Nuevo</small>':''}</span><span class="chronicle-index-title">${esc(c.title)}</span></button>`).join('')
}
function chronicleIndexPanel(active){
 const items=chronicleIndexButtons(active),n=BOOK.chapters.length;
 return `<aside class="chronicle-index-side" aria-label="Índice de crónicas, de más nuevas a más antiguas"><div class="chronicle-index-heading"><span class="eyebrow">ÍNDICE DEL CÓDICE</span><strong>Explorar capítulos</strong><small>${n} ${n===1?'crónica':'crónicas'} · recientes primero</small></div><nav class="chronicle-index-items" aria-label="Todos los capítulos">${items}</nav></aside><details class="chronicle-index-mobile"><summary>☷ Ir a otra crónica <span>${n} capítulos</span></summary><nav class="chronicle-index-items" aria-label="Capítulos de más nuevos a más antiguos">${items}</nav></details>`
}
function saga(){
 if(!BOOK.chapters.length)return heading('LA NOVELA DEL GREMIO','La Saga','El primer capítulo nacerá cuando el gremio emprenda su aventura.')+'<div class="empty-state"><h3>El libro todavía no tiene capítulos</h3><p>Cuando llegue el primer guardado, aquí aparecerá el prólogo de la casa.</p></div>';
 const newest=BOOK.chapters.length-1,latest=BOOK.chapters[newest];
 const recent=chronicleEntries().slice(1,5);
 return `${heading('LA NOVELA DEL GREMIO','Las Crónicas','La vida de la Casa, contada desde sus últimos capítulos. El índice permite explorar toda la historia.')}
 <div class="chronicle-layout">
 ${chronicleIndexPanel(newest)}
 <div class="chronicle-main">
   <section class="chronicle-feature" aria-label="Última crónica publicada">
     <div class="chronicle-feature-art"><img src="${esc(artUrl('cover'))}" alt="Cubierta ilustrada del códice La Corona de Barro" loading="lazy"/></div>
     <div class="chronicle-feature-copy">
       <div class="eyebrow">✦ ÚLTIMA CRÓNICA PUBLICADA</div>
       <div class="chronicle-feature-meta">${esc(latest.chapter)} · ${esc(latest.years)}</div>
       <h2>${esc(latest.title)}</h2>
       <p>${esc(latest.lead)}</p>
       <button type="button" class="btn gold" data-chapter="${newest}">Leer la última crónica ↗</button>
     </div>
   </section>
   ${recent.length?`<section class="chronicle-recents" aria-label="Crónicas recientes"><div class="chronicle-recents-heading"><div class="eyebrow">RETROCEDER EN EL CÓDICE</div><h3>Crónicas anteriores</h3><p>Las cuatro publicaciones anteriores, de más reciente a más antigua.</p></div><div class="chronicle-recent-grid">${recent.map(({c,i})=>`<button type="button" class="chronicle-recent-card" data-chapter="${i}"><span class="chronicle-recent-number">${esc(c.chapter)} · ${esc(c.years)}</span><strong>${esc(c.title)}</strong><span class="chronicle-recent-lead">${esc(c.lead)}</span><span class="chronicle-recent-link">Leer crónica ›</span></button>`).join('')}</div></section>`:''}
 </div></div>`
}
function portraitModeSwitch(){return `<button type="button" class="portrait-toggle" data-action="toggle-portraits" aria-pressed="${state.portraits}" aria-label="${state.portraits?'Ocultar':'Mostrar'} retratos de los personajes en los diálogos">${state.portraits?'◉ Retratos activados':'◯ Mostrar retratos'}</button>`}
function renderDialogue(text,speakerId,chapter,sceneIndex,paragraphIndex,isRepeat=false){
 if(!state.portraits||!speakerId)return `<p class="dialogue">${esc(text)}</p>`;
 let actor=speakerId==='guildmaster'?null:byId(speakerId);
 if(!actor&&speakerId!=='guildmaster'){const npc=chapter?.literaryCharacters?.find(x=>x.id===speakerId);if(npc)return `<div class="dialogue-entry dialogue-entry-npc"><div class="dialogue-copy"><span class="dialogue-speaker">${esc(npc.name)}</span><p class="dialogue-text">${esc(text)}</p></div></div>`;return `<p class="dialogue">${esc(text)}</p>`;}
 const name=actor?actor.name:'Maestro del gremio';
 const src=actor?PORTRAIT_LIBRARY.resolve(actor.id,chapter,sceneIndex,paragraphIndex,portrait(actor)):artUrl('maestreDialogue');
 const avatar=actor?`<button type="button" class="dialogue-avatar" data-hero="${esc(actor.id)}" title="Abrir ficha de ${esc(name)}" aria-label="Abrir biografía de ${esc(name)}"><img src="${src}" alt="" loading="lazy"/></button>`:`<span class="dialogue-avatar is-master" title="Retrato literario del maestre de La Corona de Barro"><img src="${src}" alt=""/></span>`;
 const brief=String(text).length<=76;
 return `<div class="dialogue-entry${brief?' dialogue-entry-brief':''}${isRepeat?' dialogue-entry-repeat':''}" data-speaker="${esc(speakerId)}">${avatar}<div class="dialogue-copy"><span class="dialogue-speaker">${esc(name)}</span><p class="dialogue-text">${esc(text)}</p></div></div>`;
}
function reader(){
 if(!BOOK.chapters.length)return saga();
 const c=BOOK.chapters[state.chapter];
 let sceneIndex=0, wordsBetweenDialogues=0;
 let introduced=new Set();
 const content=c.paragraphs.map((p,i)=>{
   const text=p.trim();
   if(text==='***'){
     sceneIndex++;
     introduced.clear();
     wordsBetweenDialogues=0;
     return '<div class="scene-break" role="separator" aria-label="Cambio de escena">❦</div>';
   }
   if(text.startsWith('—')){
     const speaker=c.speakers?.[i];
     // Primera intervención: retrato grande. Réplicas del mismo personaje:
     // retrato pequeño para que el diálogo no ocupe el doble de páginas.
     const isRepeat=!!speaker&&introduced.has(speaker);
     if(speaker)introduced.add(speaker);
     wordsBetweenDialogues=0;
     return renderDialogue(p,speaker,c,sceneIndex,i,isRepeat);
   }
   wordsBetweenDialogues+=text.split(/\s+/).filter(Boolean).length;
   if(wordsBetweenDialogues>90){
     introduced.clear();  // Cambio de foco narrativo, nueva presentación.
     wordsBetweenDialogues=0;
   }
   return `<p class="narration">${esc(p)}</p>`;
 }).join('');
 return `<div class="chronicle-layout chronicle-layout-reader">${chronicleIndexPanel(state.chapter)}<div class="chronicle-main"><div class="tool-row"><button class="btn secondary small" data-action="back-saga">← Volver al índice</button>${chip(c.chapter+' · '+c.years)}</div>
 <div class="reader"><div class="reader-hero"><div><div class="eyebrow">${esc(c.chapter)} — ${esc(c.years)}</div><h2>${esc(c.title)}</h2><p>${esc(c.lead)}</p></div></div><article class="reading" style="--fontmult:${state.font}"><div class="reading-settings"><span class="setting-hint">Pulsa un retrato para abrir su biografía.</span>${portraitModeSwitch()}</div><div class="prose">${content}</div><div class="reading-end"><div class="eyebrow">Personajes en este capítulo</div><div class="info-pills">${c.characterIds.map(name=>{let h=heroName(name);return h?`<button class="filter" data-hero="${h.id}">${esc(name)} ↗</button>`:''}).join('')}</div><div class="fact-note"><strong>Hechos verificados · Fuente del juego</strong><ul>${c.facts.map(f=>`<li>${esc(f)}</li>`).join('')}</ul><p><b>Origen:</b> ${esc(c.source)}. Los detalles ambientales y el tono de las escenas son dramatizaciones literarias.</p></div></div></article>
 <div class="reader-tools"><button class="btn secondary small" data-chapter="${Math.min(BOOK.chapters.length-1,state.chapter+1)}" ${state.chapter===BOOK.chapters.length-1?'disabled':''}>← Más reciente</button><span class="small-controls">Tamaño <button class="icon-btn" data-action="font-down" aria-label="Reducir tamaño de letra">A−</button><button class="icon-btn" data-action="font-up" aria-label="Ampliar tamaño de letra">A+</button></span>${portraitModeSwitch()}<button class="btn small" data-chapter="${Math.max(0,state.chapter-1)}" ${state.chapter===0?'disabled':''}>Más antigua →</button></div></div></div></div>`;
}
function heroCard(c){
 const dead=isFallen(c);
 const label=dead?'<span class="fallen-word">† En memoria</span>':c.status==='vendida'?'<span>↗ Vendida a otro gremio</span>':c.status==='retirada'?'<span>↗ Antigua integrante</span>':c.aspirant?'<span>✧ Aspirante</span>':c.recruited?'<span>✦ Nuevo miembro</span>':'<span>✦ Fundador</span>';
 return `<button type="button" class="hero-card ${dead?'is-fallen':''}" data-hero="${esc(c.id)}" aria-label="Abrir ficha de ${esc(c.name)}${dead?', fallecido':''}"><span class="hero-card-portrait">${artHero(c)}${deathRibbon(c)}</span><main><div class="overline">${esc(c.roleLabel)} · ${esc(c.race)}</div><h3>${esc(c.name)}</h3><p>${esc(c.epithet)}</p><footer>${label}<span>Hab. ${esc(c.currentAbility==null?'—':Math.round(c.currentAbility))} · ${esc(c.abilityStars??'—')} ★</span></footer></main></button>`;
}
function heroes(){
 const alive=livingMembers(),fallen=fallenMembers(),q=state.search.toLocaleLowerCase('es').trim();
 const list=[...livingMembers(),...fallenMembers(),...BOOK.characters.filter(c=>c.status==='retirada'||c.status==='vendida')].filter(c=>{
  const matchesFilter=state.filter==='all'||(state.filter==='activos'&&!isFallen(c)&&c.status!=='retirada'&&c.status!=='vendida')||(state.filter==='caidos'&&isFallen(c))||(state.filter==='salidos'&&(c.status==='vendida'||c.status==='retirada'))||(state.filter==='fundadores'&&!c.aspirant&&!c.recruited&&c.status!=='retirada'&&c.status!=='vendida')||(state.filter==='reclutas'&&c.recruited)||(state.filter==='aspirantes'&&c.aspirant)||(state.filter===c.role&&!isFallen(c)&&c.status!=='retirada'&&c.status!=='vendida');
  return matchesFilter&&(!q||[c.name,c.epithet,c.classLabel,c.race,c.blurb,c.origin].join(' ').toLowerCase().includes(q));
 });
 const filters=[['all','Todos ('+BOOK.characters.length+')'],['activos','En activo ('+alive.length+')'],['caidos','En memoria ('+fallen.length+')'],['salidos','Salieron vivos ('+BOOK.characters.filter(c=>c.status==='vendida'||c.status==='retirada').length+')'],['fundadores','Fundadores ('+BOOK.characters.filter(c=>!c.aspirant&&!c.recruited&&c.status!=='retirada'&&c.status!=='vendida').length+')'],['reclutas','Nuevas llegadas ('+BOOK.characters.filter(c=>c.recruited).length+')'],['aspirantes','Aspirantes ('+BOOK.characters.filter(c=>c.aspirant).length+')'],['tank','Tanques'],['dps','Daño'],['healer','Sanación']];
 return `${heading('LA GALERÍA DE LA CASA','Aventureros y memoria',alive.length+' integrantes vivos y '+fallen.length+' '+(fallen.length===1?'caído':'caídos')+'. Quienes murieron conservan su retrato, sus hechos y un lugar en nuestra historia.')}<div class="tool-row"><div class="searchbox">⌕ <input id="heroSearch" type="search" autocomplete="off" placeholder="Buscar un nombre, raza o clase…" value="${esc(state.search)}" aria-label="Buscar aventureros"/></div><div class="filters">${filters.map(([k,t])=>`<button type="button" class="filter ${state.filter===k?'active':''}" data-filter="${k}">${esc(t)}</button>`).join('')}</div></div><div class="hero-grid">${list.map(heroCard).join('')}</div>${!list.length?'<div class="empty-state"><h3>No hay coincidencias</h3><p>Prueba otro nombre o cambia el filtro.</p></div>':''}`;
}

const attribLabels={weaponSkill:'Armas',marksmanship:'Puntería',power:'Poder',spellcraft:'Arcano',armorUse:'Armadura',parry:'Parada',evasion:'Evasión',criticalStrike:'Crítico',composure:'Compostura',bravery:'Valentía',decisions:'Decisiones',anticipation:'Anticipación',teamwork:'Equipo',leadership:'Liderazgo',concentration:'Concentración',aggression:'Agresividad',discipline:'Disciplina',resolve:'Resolución',strength:'Fuerza',agility:'Agilidad',stamina:'Resistencia',vitality:'Vitalidad',speed:'Velocidad',reflexes:'Reflejos',threat:'Amenaza',mitigation:'Mitigación',healing:'Curación',support:'Apoyo',crowdControl:'Control',positioning:'Posición'};
const modLabels={attackPct:'Ataque',critChance:'Crítico',accuracy:'Precisión',hpPct:'Salud',mitigation:'Mitigación',blockChance:'Bloqueo',healPct:'Curación',healTakenPct:'Curación recibida'};
function percentOrNumber(k,v){if(typeof v!=='number')return esc(v);return k==='accuracy'? '+'+v : '+'+(v*100).toFixed(1).replace('.',',')+' %'}
function equipCard(item,type){if(!item)return '<span class="source-note">Sin equipo registrado</span>';return `<div class="equipment-card"><div class="eyebrow">${esc(type)}</div><strong>${esc(item.name)}</strong><small>${esc(item.rarity||'')} · ${esc(item.weaponKind||item.counters||'')}</small><div class="gear-mods">${Object.entries(item.mods||{}).map(([k,v])=>`<span>${esc(modLabels[k]||k)} ${percentOrNumber(k,v)}</span>`).join('')}</div></div>`}
function attGroup(c,fields){return `<div class="attr-grid">${fields.map(k=>`<div class="attr"><span>${esc(attribLabels[k]||k)}</span><b>${esc(c.attributes?.[k]??'—')}</b><div class="meter"><span style="width:${Math.min(100,(c.attributes?.[k]||0)*5)}%"></span></div></div>`).join('')}</div>`}

function portraitGallery(c) {
 const images=PORTRAIT_LIBRARY.allFor(c.id);
 if(images.length<=1)return '';
 return `<section class="portrait-variants-section" aria-label="Otros rostros de ${esc(c.name)}"><div class="eyebrow">GALERÍA DEL CÓDICE</div><h3>Los rostros de ${esc(c.name)}</h3><p>Un retrato principal y expresiones alternativas para nuestras crónicas. Las emociones son propuestas editoriales, no hechos nuevos de la partida.</p><div class="portrait-variants-grid">${images.map(item=>`<figure><a href="${esc(item.src)}" target="_blank" rel="noopener noreferrer" title="Abrir ilustración de ${esc(c.name)}"><img src="${esc(item.src)}" alt="${esc(item.label||('Retrato oficial de '+c.name))}" loading="lazy"/></a><figcaption>${esc(item.label||'Retrato oficial')} ${item.legacyKey?'<span>Principal</span>':''}</figcaption></figure>`).join('')}</div></section>`;
}
function heroDetail(){let c=byId(state.hero);if(!c)return heroes();let rel=BOOK.relationships.filter(r=>r.a===c.id||r.b===c.id).map(r=>({...r,other:byId(r.a===c.id?r.b:r.a)})).filter(r=>r.other);let st=c.statistics||{};let relevant=c.role==='tank'?['armorUse','mitigation','vitality','threat','resolve','strength']:c.role==='healer'?['healing','support','spellcraft','teamwork','leadership','composure']:['weaponSkill','marksmanship','power','spellcraft','criticalStrike','positioning']; let oath=c.vow||{};let rivalry=BOOK.world.rivalries.filter(r=>r.characterId===c.id);const deceased=isFallen(c),death=deathOf(c);return `<div class="tool-row" style="margin-bottom:24px"><button class="btn secondary small" data-action="back-heroes">← Galería de aventureros</button>${state.returnToReader?`<button class="btn secondary small" data-action="back-reading">↶ Volver al capítulo</button>`:''}</div><div class="hero-detail-top ${deceased?'detail-deceased':''}"><div class="portrait-mourn-wrap">${artHero(c).replace('<img ','<img class="portrait-large" ')}${deathRibbon(c)}</div><div class="detail-head"><div class="eyebrow">${deceased?'IN MEMORIAM · AVENTURERO CAÍDO':c.aspirant?'ASPIRANTE SIN JURAMENTO':c.status==='vendida'?'ANTIGUA INTEGRANTE · VENDIDA A OTRO GREMIO':c.status==='retirada'?'ANTIGUA INTEGRANTE':c.recruited?'MIEMBRO INCORPORADO A LA CASA':'FUNDADOR DE LA CASA'} · ${esc(c.roleLabel)}</div><h2>${esc(c.name)}</h2><div class="tagline">«${esc(c.epithet)}»</div>${deceased?chip('† Caído · '+deathDate(c),'danger'):chip(c.status==='vendida'?'Vendida · '+(c.departure?.buyer||'otro gremio'):c.status==='retirada'?'Salió de la Casa':c.post,(c.status==='vendida'||c.status==='retirada'||c.aspirant)?'':'success')}<div class="info-pills"><span class="info-pill">${esc(c.race)}</span><span class="info-pill">${esc(c.classLabel)}</span><span class="info-pill">${esc(c.age)} años</span><span class="info-pill">Nivel ${esc(c.level)}</span></div><p class="intro">${esc(c.blurb)}</p>${c.ingamePortraitFile?`<p class="source-note">Retrato asignado en Dungeons &amp; Dynasties: <b>${esc(c.ingamePortraitFile)}</b>. La ilustración de esta web es un recurso independiente.</p>`:''}${c.gameRating!=null?`<p class="source-note"><b>Valoración del juego: ${esc(c.gameRating)}</b> · última lectura de la captura del día visible 150. Etapa observada: ${esc(c.gameCareerStage||'No consta')}. No es la misma escala que CA ni PA.</p>`:''}<div class="hero-core-stats" style="grid-template-columns:repeat(auto-fit,minmax(135px,1fr))"><div><small>VALORACIÓN DE INGRESO</small><strong>${esc(c.ratingAtJoin??c.rating??'—')}</strong></div><div><small>HABILIDAD ACTUAL (CA)</small><strong>${esc(c.currentAbility==null?'—':Math.round(c.currentAbility))} · ${esc(c.abilityStars??'—')} ★</strong></div><div><small>TECHO DE POTENCIAL (PA)</small><strong>${esc(c.potentialAbility==null?'—':Math.round(c.potentialAbility))} · ${esc(c.potentialStars??'—')} ★</strong></div><div><small>${deceased?'SU ÚLTIMO SERVICIO':'SUELDO / 6 DÍAS'}</small><strong>${deceased?'En la memoria de la Casa':c.aspirant?'Sin sueldo':esc(c.salary)+' g'}</strong></div></div></div></div>
${deceased?`<section class="death-biography" aria-label="Fallecimiento de ${esc(c.name)}"><div class="eyebrow">✦ EL LIBRO DE LOS QUE NO VOLVIERON</div><h3>Su última página · ${esc(deathDate(c))}</h3><p><strong>${esc(death?.place||death?.dungeon||"Lugar no registrado")}.</strong> ${esc(death?.epitaph||"Murió al servicio de La Corona de Barro.")}</p><p>${esc(memorialFeat(c))}</p>${c.memorial?.literaryDeath?`<p class="death-literary"><strong>Versión literaria de su final:</strong> ${esc(c.memorial.literaryDeath)}</p><small>Esta interpretación es ficción del códice; el guardado no detalla el instante exacto de la muerte.</small>`:""}<blockquote>«${esc(memorialQuote(c))}»<cite>${esc(memorialVoice(c))}</cite></blockquote><button type="button" class="btn secondary small" data-nav="legacy">Ir al memorial ↗</button></section>`:""}
${portraitGallery(c)}
<div class="detail-body"><div><div class="panel" style="margin-bottom:19px"><div class="eyebrow">BIOGRAFÍA DEL AVENTURERO</div><h3 style="margin-top:8px">Su historia hasta hoy</h3><p class="bio-text">${esc(c.bio)}</p>${c.founderNote?`<section class="founder-note" aria-label="Nota original del fundador sobre ${esc(c.name)}"><div class="eyebrow">✒ LA MIRADA DEL FUNDADOR</div><blockquote>«${esc(c.founderNote)}»</blockquote><p class="source-note">Nota personal escrita en Dungeons &amp; Dynasties. Se conserva literalmente, separada de la interpretación literaria.</p></section>`:''}<div class="fact-signature">Historia del personaje construida a partir de su trasfondo registrado; el tono biográfico es interpretación literaria.</div></div><div class="panel" style="margin-bottom:19px"><h3>Juramento y carácter</h3><div class="story-fact"><span>Convicción</span><strong>«${esc(c.conviction)}»</strong></div><div class="story-fact"><span>Rasgos</span><strong>${esc((c.traits||[]).join(' · '))}</strong></div><div class="story-fact"><span>Defecto</span><strong>${esc(c.flaw)}</strong></div>${oath.name?`<div class="vow-paper"><small>VOTO PERSONAL · ${esc(oath.name)}</small><p>${esc(oath.text)}</p></div>`:''}</div><div class="panel"><h3>Sus huellas</h3>${(c.memories||[]).map(m=>`<div class="milestone"><span class="date-chip">AÑO ${esc(m.year)}</span><div><strong>${esc(m.title)}</strong><p>${esc(m.text)}</p></div></div>`).join('')}</div></div>
<div><div class="panel" style="margin-bottom:19px"><div class="eyebrow">${c.recruited?'EVOLUCIÓN DESDE SU INGRESO':'EVOLUCIÓN ACUMULADA'} · HASTA EL DÍA ${esc(BOOK.stats.day)}</div><h3>Qué ha cambiado</h3><p class="source-note">Valoración de clase: última medida de la captura del día 150, que podría haber variado. Valoración de ingreso y cierre de año: históricas. CA/PA: valores independientes sobre 200 que sí guarda el JSON.</p><div class="stat-list">${c.gameRating!=null?`<div class="statrow"><span>Última valoración observada (día 150)</span><strong>${esc(c.gameRating)} · ${esc(c.gameCareerStage||'—')}</strong></div><div class="statrow"><span>Evolución de valoración desde el fichaje</span><strong>${esc((c.gameRating-c.ratingAtJoin)>=0?'+':'')}${esc(c.gameRating-c.ratingAtJoin)} puntos</strong></div><div class="statrow"><span>Margen CA hasta PA actual</span><strong>${esc(c.potentialGap??'—')} puntos</strong></div>`:'' }<div class="statrow"><span>Valoración de ingreso</span><strong>${esc(c.ratingAtJoin??c.rating??'—')}</strong></div><div class="statrow"><span>Valoración al cierre del Año ${esc(c.ratingLastYear??1)}</span><strong>${esc(c.ratingLastYearEnd??'Sin registro')}</strong></div><div class="statrow"><span>Habilidad actual (CA)</span><strong>${esc(c.currentAbility==null?'—':Number(c.currentAbility).toFixed(1))} / 200</strong></div><div class="statrow"><span>Potencial (PA)</span><strong>${esc(c.potentialAbility==null?'—':Number(c.potentialAbility).toFixed(1))} / 200</strong></div><div class="statrow"><span>Experiencia de incursiones</span><strong>${esc(c.statistics?.incursions||0)} salidas</strong></div><div class="statrow"><span>Nivel</span><strong>${esc((c.changesSinceDay9?.level?.[0]??c.level??'—'))} → ${esc((c.changesSinceDay9?.level?.[1]??c.level??'—'))}</strong></div><div class="statrow"><span>Tensión</span><strong>${esc((c.changesSinceDay9?.stress?.[0]??c.stress??'—'))} → ${esc((c.changesSinceDay9?.stress?.[1]??c.stress??'—'))}</strong></div><div class="statrow"><span>Fatiga</span><strong>${esc((c.changesSinceDay9?.fatigue?.[0]??c.fatigue??'—'))} → ${esc((c.changesSinceDay9?.fatigue?.[1]??c.fatigue??'—'))}</strong></div><div class="statrow"><span>Condición</span><strong>${esc(c.condition)} %</strong></div></div>${c.away?`<div class="build-progress"><strong>En ${esc(c.away.kind)} · pendiente de regresar</strong><span>Día previsto: ${esc(c.away.returnsDay)}</span></div>`:''}<div class="source-note">${esc(c.statistics?.incursions||0)} incursiones completadas · ${esc(c.statistics?.dealt||0)} de daño acumulado · ${esc(c.statistics?.healed||0)} de curación · ${esc(c.statistics?.kills||0)} bajas enemigas. No incluye misiones todavía abiertas.</div>${Object.keys(c.attributeChangesSinceDay9||{}).length?`<p class="source-note"><b>Atributos mejorados:</b> ${Object.entries(c.attributeChangesSinceDay9).map(([k,v])=>`${esc(attribLabels[k]||k)} ${esc(v[0])}→${esc(v[1])}`).join(' · ')}</p>`:''}</div><div class="panel" style="margin-bottom:19px"><h3>${deceased?'Estado al caer':'Estado actual'} · día ${deceased?(death?.day??BOOK.stats.day):BOOK.stats.day}</h3><div class="stat-list">${[['Raza',c.race],['Clase',c.classLabel],['Edad',c.age],['Patrulla',deceased?'Sin asignación (caído)':c.post],['Nivel',c.level],['Valoración inicial',c.rating],['Experiencia',c.experience],['Moral',c.morale],['Condición',c.condition+' %'],['Tensión',c.stress],['Fatiga',c.fatigue],['Salario',deceased?'— (caído)':c.aspirant?'Sin paga':c.salary+' g / 6 días'],['Procedencia',c.origin]].map(([l,v])=>`<div class="statrow"><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`).join('')}</div><p class="source-note" style="margin:15px 0 0">Último guardado registrado: año ${esc(BOOK.meta.year||1)}, día ${esc(BOOK.stats.day)}. La valoración de ingreso es histórica; para los caídos, la ficha conserva sus datos finales.</p></div><div class="panel" style="margin-bottom:19px"><h3>Habilidades clave</h3>${attGroup(c,relevant)}<details class="attrs-detail"><summary>Ver los 30 atributos del guardado</summary>${attGroup(c,Object.keys(attribLabels))}</details></div><div class="panel" style="margin-bottom:19px"><h3>Equipo</h3>${Object.keys(c.equipment||{}).length?`<div class="equip-grid">${equipCard(c.equipment.weapon,'ARMA')}${equipCard(c.equipment.armour,'ARMADURA')}</div>`:'<p class="source-note">No consta equipo individual asignado todavía.</p>'}</div>${literaryThreadsFor(c.id)}<div class="panel"><h3>Vínculos documentados</h3>${rel.length?rel.map(r=>`<div class="person-rel"><img src="${portrait(r.other)}" alt=""/><div><b>${esc(r.other.name)}</b><small>${esc(formatBondValue(r.rawValue??r.strength))} · ${esc(r.note)}</small></div><button data-hero="${r.other.id}" aria-label="Abrir ficha de ${esc(r.other.name)}">↗</button></div>`).join(''):'<p class="source-note">Aún no consta relación directa en el guardado.</p>'}${rivalry.map(x=>`<div class="vow-paper"><small>ANTECEDENTE EXTERNO · ${esc(x.name)}</small><p>${esc(x.note)}</p></div>`).join('')}</div></div></div>`}
const ROLE_ORDER={tank:0,dps:1,healer:2};
function orderPatrolMembers(list){return [...list].sort((a,b)=>(ROLE_ORDER[a.role]??9)-(ROLE_ORDER[b.role]??9)||Number(b.currentAbility??0)-Number(a.currentAbility??0)||a.name.localeCompare(b.name,'es'))}
function bondPower(value){return Math.abs(Number(value)||0)}
function bondTierInfo(value){const abs=bondPower(value);if(abs>=30)return {label:'Decisivo',className:'tier-epic',cardClass:'strength-heavy'};if(abs>=20)return {label:'Fuerte',className:'tier-strong',cardClass:'strength-heavy'};if(abs>=10)return {label:'Marcado',className:'tier-warm',cardClass:'strength-medium'};return {label:'Tenue',className:'tier-light',cardClass:'strength-light'}}
function bondFill(value){return Math.max(6,Math.min(100,(bondPower(value)/50)*100))}
function bondStroke(value){return (2.5 + Math.min(7,bondPower(value)/5)).toFixed(2)}
function formatBondValue(value){const n=Number(value)||0;return `${n>=0?'+':''}${Math.round(n*10)/10}`}
function growthAdvice(c){
 const gap=Number(c.potentialGap??Math.max(0,(c.potentialAbility??0)-(c.currentAbility??0)));
 const stage=c.gameCareerStage||'Etapa no registrada';
 if(gap<0.5) return stage==='En su apogeo'?'En apogeo · techo CA alcanzado':'Techo CA alcanzado · aún puede mejorar atributos o elevar PA';
 if(gap>=45)return 'Gran margen · priorizar Train o Mentor';
 if(gap>=20)return 'Margen notable · seguir entrenando';
 return 'Margen corto · mejora gradual';
}
function growthTag(c){
 const gap=Number(c.potentialGap??Math.max(0,(c.potentialAbility??0)-(c.currentAbility??0)));
 return gap<0.5?'growth-full':gap>=45?'growth-high':'growth-medium';
}
function patrols(){
 const living=livingMembers(),available=house().available,awayIds=house().awayIds;
 const extra=[...new Set(living.map(c=>c.post).filter(p=>p&&!['Vanguardia','Segunda Guardia','Reserva','Aspirantes'].includes(p)))].sort();
 const groups=['Vanguardia','Segunda Guardia','Reserva',...extra].map(title=>({title,people:orderPatrolMembers(living.filter(c=>c.post===title))})).filter(g=>g.people.length);
 const count=title=>groups.find(g=>g.title===title)?.people.length||0;
 const out=house().expedition;
 const status=c=>c.away||awayIds.has(c.id)?'<span class="patrol-status away">'+(c.away?.kind==='viaje de incorporación'?'⌛ En camino':c.away?.kind==='encargo'?'🧭 En encargo':'⚔ En incursión')+' · regreso día '+esc(c.away?.returnsDay??out?.returnsDay??'—')+'</span>':c.injury?.incapacitated||c.injury?.daysLeft?'<span class="patrol-status">⚕ En recuperación · '+esc(c.injury?.daysLeft??'—')+' días</span>':'<span class="patrol-status ready">✓ En la Casa</span>';
 const sortedGrowth=[...living].sort((a,b)=>(b.potentialGap??0)-(a.potentialGap??0));
 const titleFor=c=>(c.gameRating==null?'Sin valoración de clase verificada':c.gameRating+' puntos: última captura día visible 150, no valor actual');
 const money=BOOK.world.finance;
 return `${heading('LOS TURNOS DE LA CASA','Las patrullas','Plantilla completa del Año II. Ahora distinguimos la valoración real del juego, la habilidad y la posibilidad de mejora de cada persona.')}
 <div class="patrol-summary">${statCard(count('Vanguardia'),'Vanguardia')}${statCard(count('Segunda Guardia'),'Segunda Guardia')}${statCard(count('Reserva'),'Reserva')}${statCard(BOOK.stats.salaryCycle+' g','Sueldos / 6 días')}</div>
 <div class="patrol-live-summary"><strong>${living.length} miembros vivos</strong><span>${available.length} disponibles en la Casa</span><span>${living.length-available.length} fuera o no disponibles</span>${out?'<span>Incursión pendiente · día '+esc(out.returnsDay)+'</span>':''}</div>
 <section class="patrol-guide panel" aria-label="Cómo leer las valoraciones">
  <div class="eyebrow">NO SON LA MISMA PUNTUACIÓN</div><h3>Valoración, habilidad y techo</h3>
  <div class="patrol-guide-grid">
   <div><strong>Valoración</strong><p>La nota que ves en la plantilla del juego: calcula el encaje de sus 30 atributos con su clase. Las valoraciones son la última lectura visual del día 150, no recalculadas con el JSON actual. CA y PA sí corresponden al día 164.</p></div>
   <div><strong>CA / PA</strong><p>Habilidad actual y potencial en una escala hasta 200. La diferencia PA − CA muestra margen bajo el techo <em>actual</em>, no una predicción de mejora inmediata.</p></div>
   <div><strong>Etapa</strong><p>«En sus inicios», «Ascendiendo» o «En su apogeo». Un personaje que asciende puede tener CA = PA: edad y techo son conceptos distintos.</p></div>
  </div>
  <div class="patrol-guide-notice">✦ <b>Mayor margen actual:</b> ${sortedGrowth.slice(0,4).map(c=>esc(c.name)+' (+'+esc(Math.round(c.potentialGap))+' CA)').join(' · ')}. <b>Techo CA alcanzado:</b> ${living.filter(c=>(c.potentialGap??0)<0.5).map(c=>esc(c.name)).join(', ')}.</div>
  <p class="source-note">Las valoraciones de clase son referencias históricas de la captura del día 150. CA y PA y el margen sí vienen del guardado actual. Para una nueva valoración exacta hará falta otra captura o la fórmula oficial.</p>
 </section>
 ${money?`<div class="patrol-finance-hint"><div><strong>💰 Paga actual: ${esc(money.current.netBeforeDelves)} g / 6 días</strong><span>Las incursiones recientes compensan unos ${esc(money.avgDelvesGoldPerPay)} g por ciclo; saldo medio estimado ${esc(money.netWithAvgDelves>0?'+':'')}${esc(money.netWithAvgDelves)} g.</span></div><button type="button" class="btn secondary small" data-nav="archive">Ver por qué cuesta tanto ↗</button></div>`:''}
 ${groups.map(({title,people})=>`<section class="patrol-panel"><div class="section-heading-row"><div><div class="eyebrow">PLANTILLA DEL GREMIO</div><h2>${esc(title)} · ${people.length}</h2><p class="source-note">Puestos según el último guardado. Los aventureros de expedición conservan su asignación.</p></div></div><div class="patrol-list">${people.map(c=>`<button type="button" class="patrol-row ${c.away||awayIds.has(c.id)?'patrol-away':''}" data-hero="${esc(c.id)}" title="${esc(titleFor(c))} · ${esc(growthAdvice(c))}">
 <img src="${portrait(c)}" alt="Retrato de ${esc(c.name)}"/>
 <div class="patrol-name"><strong>${esc(c.name)}</strong><span>${esc(c.race)} · ${esc(c.classLabel)}</span>${status(c)}</div>
 <span class="role-tag ${esc(c.role)}">${esc(c.roleLabel)}</span>
 <div class="patrol-role-rating"><b>${esc(c.gameRating??'—')}</b><span>Valoración*</span><small>${c.gameRating!=null?esc((c.gameRating-c.ratingAtJoin)>0?'+':'')+esc(c.gameRating-c.ratingAtJoin)+' desde ingreso':'Sin lectura actual'}</small></div>
 <div class="patrol-progression ${growthTag(c)}"><strong>${esc(c.gameCareerStage??'Etapa desconocida')}</strong><span>CA ${esc(Math.round(c.currentAbility??0))} / PA ${esc(Math.round(c.potentialAbility??0))} · <b>+${esc(Math.round(c.potentialGap??0))} de margen</b></span><i aria-hidden="true"><em style="width:${esc(Math.min(100,Math.max(0,((c.currentAbility??0)/Math.max(c.potentialAbility||1,1))*100)).toFixed(1))}%"></em></i><small>${esc(growthAdvice(c))}</small></div>
 <div class="patrol-bars" title="Moral ${esc(c.morale)}, condición ${esc(c.condition)}, fatiga ${esc(c.fatigue)}"><span>Moral ${esc(c.morale)}</span><i style="--fill:${esc(c.morale)}%"></i><span>Cond. ${esc(c.condition)}%</span><i style="--fill:${esc(c.condition)}%"></i></div>
 <span class="patrol-go">↗</span></button>`).join('')}</div></section>`).join('')}
 <div class="notice">✦ <b>Año II, día ${esc(BOOK.meta.day)}:</b> ${living.length} integrantes vivos, ${fallenMembers().length} en el memorial. Los de incursión conservan su puesto; la disponibilidad es independiente del progreso. <button type="button" data-nav="legacy" class="text-link">Visitar el memorial ↗</button></div>`;
}

function bondTone(k){let t=(k||'').toLowerCase();if(t.includes('duelo')||t.includes('memoria'))return 'grief';if(t.includes('conflict')||t.includes('enemist')||t.includes('rival'))return 'conflict';if(t.includes('mentor')||t.includes('protecc'))return 'mentor';if(t.includes('famil')||t.includes('legado'))return 'family';return 'friend'}
const bondStyles={friend:{color:'#417c63',label:'Afinidad'},conflict:{color:'#a54843',label:'Conflicto'},mentor:{color:'#4e79a2',label:'Guía'},family:{color:'#b68d3c',label:'Familia'},grief:{color:'#88679a',label:'Memoria'}};


const REL_CATEGORIES = {amistad:{label:'Amistad',icon:'❦',tone:'#437963'},romance:{label:'Romance',icon:'♥',tone:'#a14e65'},conflicto:{label:'Rivalidad',icon:'⚔',tone:'#ab6042'},proteccion:{label:'Lealtad',icon:'♜',tone:'#59788e'},complicidad:{label:'Complicidad',icon:'♫',tone:'#7b668b'},intriga:{label:'Intriga',icon:'✧',tone:'#837049'}};
const REL_STATUS={vivido:'Vivido',anclado:'Anclado al juego',semilla:'Semilla creativa'};
function literaryFor(id){return house().relations.filter(r=>r.people.includes(id)).sort((a,b)=>(a.status==='semilla')-(b.status==='semilla')||b.intensity-a.intensity||a.label.localeCompare(b.label,'es'))}
function relOther(r,id){return byId(r.people.find(p=>p!==id))}
function relNum(r){return '✦'.repeat(Math.min(5,Math.max(1,r.intensity||1)))+'·'.repeat(Math.max(0,5-(r.intensity||1)))}
function relColor(r){return REL_CATEGORIES[r.family]?.tone||'#897757'}
function litBadge(r,small=false){const fam=REL_CATEGORIES[r.family]||REL_CATEGORIES.amistad;return `<span class="novel-tag family-${esc(r.family)} ${small?'compact':''}" title="${esc(fam.label)} · Intensidad ${esc(r.intensity)}/5"><span aria-hidden="true">${fam.icon}</span> ${esc(r.label)}</span>`}
function literaryThreadsFor(personId){
 const arr=literaryFor(personId);
 if(!arr.length)return '';
 const actual=arr.filter(r=>r.status!=='semilla');
 const possibilities=arr.filter(r=>r.status==='semilla');
 const makeItem=(r,possible=false)=>{const other=relOther(r,personId);if(!other)return '';
 const game=BOOK.relationships.find(g=>(g.a===personId&&g.b===other.id)||(g.b===personId&&g.a===other.id));
 const extra=possible?`<p class="lit-possible-hook">${esc(r.hook||r.notes)}</p>`:'';
 return `<div class="lit-person-row ${possible?'lit-possible':''}">
 <button class="lit-face" type="button" data-hero="${esc(other.id)}" title="Abrir ficha de ${esc(other.name)}"><img src="${portrait(other)}" alt="Retrato de ${esc(other.name)}"/></button>
 <div class="lit-person-copy"><div class="lit-person-title"><b>${esc(other.name)}</b>${game?`<span class="lit-game-num">Juego ${esc(formatBondValue(game.strength))}</span>`:''}</div>
 <div class="lit-person-labels">${litBadge(r,true)}${r.mourning?'<span class="novel-tag">✦ En memoria</span>':''}<span class="lit-story-power" aria-label="Intensidad literaria ${r.intensity} sobre 5">${'◆'.repeat(r.intensity)}${'◇'.repeat(5-r.intensity)}</span></div>
 <p>${esc(r.perspectives[personId]||r.notes)}</p>${extra}</div></div>`;
 };
 return `<section class="literary-thread" aria-label="Vínculos literarios de ${esc(byId(personId)?.name||'personaje')}">
 <span class="eyebrow">❧ RELACIONES · LA HISTORIA PERSONAL</span><h3>Las personas que importan</h3>
 <p class="literary-hint">El valor numérico pertenece al juego; los sentimientos y matices se construyen en nuestra novela.</p>
 ${actual.length?actual.slice(0,3).map(r=>makeItem(r)).join(''):'<p>Todavía no hay una escena significativa entre este aventurero y los demás.</p>'}
 ${actual.length>3?`<details class="lit-more"><summary>Ver ${actual.length-3} relaciones adicionales</summary>${actual.slice(3).map(r=>makeItem(r)).join('')}</details>`:''}
 ${possibilities.length?`<details class="lit-more lit-future"><summary>✧ Historias que podrían nacer (${possibilities.length})</summary><p class="lit-future-note">Ideas creativas, todavía no sucedidas. Pueden desarrollarse, cambiar o desaparecer según avance la partida.</p>${possibilities.map(r=>makeItem(r,true)).join('')}</details>`:''}
 </section>`;
}
function literaryBondsForPacket(){return house().relations.map(r=>{const names=r.people.map(id=>byId(id)?.name||id).join(' ↔ ');const perspectives=r.people.map(id=>`${byId(id)?.name||id}: ${r.perspectives[id]||''}`).join(' / ');return `- ${names}: [${(r.status||'semilla').toUpperCase()} · ${r.family}] ${r.label}${r.mourning?' [vínculo histórico: duelo pendiente de revisión]':''} (${(r.tags||[]).join(', ')}) intensidad ${r.intensity}/5, reciprocidad ${r.reciprocity}. ${r.notes} Perspectivas: ${perspectives}. Semilla de escena: ${r.hook}. Evidencia: ${r.evidence.join(', ')||'ninguna: propuesta creativa'}. Límites: ${r.boundaries}`}).join('\n')||'Aún no se han publicado relaciones literarias.'}
function combinedRelationships(center){const list=new Map();for(const r of BOOK.relationships||[]){if(r.a!==center&&r.b!==center)continue;const other=r.a===center?r.b:r.a; if(!list.has(other))list.set(other,{other,game:null,lit:[]});list.get(other).game=r;}for(const l of house().relations){if(!l.people.includes(center))continue;const other=l.people.find(id=>id!==center);if(!list.has(other))list.set(other,{other,game:null,lit:[]});list.get(other).lit.push(l)}return [...list.values()].filter(x=>byId(x.other))}

function bonds(){
 const ids=BOOK.characters.map(c=>c.id);
 if(!ids.includes(state.bond))state.bond=BOOK.characters.find(c=>c.name==='Jaro')?.id||ids[0];
 const root=byId(state.bond);
 // Pending storyline ideas still exist in BOOK and in hero biographies, but do not clutter the graph.
 const connections=combinedRelationships(state.bond).map(x=>({...x,active:x.lit.filter(l=>l.status!=='semilla')})).filter(x=>x.game||x.active.length);
 const primary=x=>[...x.active].sort((a,b)=>b.intensity-a.intensity)[0]||null;
 const num=x=>Math.abs(Number(x.game?.strength||0));
 const score=x=>Math.max(num(x),...x.active.map(l=>l.intensity*10))||0;
 connections.sort((a,b)=>score(b)-score(a));
 const shown=connections.slice(0,7);
 const placed=shown.map((x,i)=>{const theta=(-90+i*360/Math.max(1,shown.length))*Math.PI/180;return {...x,x:500+340*Math.cos(theta),y:290+195*Math.sin(theta)}});
 const tone=x=>{const l=primary(x);if(l)return relColor(l);const t=bondTone(x.game?.kind||'afinidad');return bondStyles[t]?.color||'#8f7855'};
 const strength=x=>{const l=primary(x);return l?l.intensity:Math.max(1,Math.min(5,num(x)/10))};
 const svg=placed.map(x=>{const v=strength(x),dX=x.x-500,dY=x.y-290;return `<line x1="${500+dX*.16}" y1="${290+dY*.16}" x2="${500+dX*.77}" y2="${290+dY*.77}" stroke="${tone(x)}" stroke-width="${(2+v*1.25).toFixed(1)}" stroke-opacity="${(.36+Math.min(v,5)*.12).toFixed(2)}" stroke-linecap="round"/>`}).join('');
 const nodes=placed.map(x=>{const c=byId(x.other),l=primary(x),v=strength(x);return `<button class="atlas-node rel-v1-node rel-calm-node ${isFallen(c)?'is-fallen':''}" type="button" data-bondfocus="${esc(c.id)}" title="Ver relaciones de ${esc(c.name)}" style="left:${x.x/10}%;top:${x.y/5.8}%;--tone:${tone(x)};--strength-scale:${v/5}"><img src="${portrait(c)}" alt="Retrato de ${esc(c.name)}"/><strong>${esc(c.name)}${isFallen(c)?' †':''}</strong>${l?`<span class="rel-node-label family-${esc(l.family)}">${esc(REL_CATEGORIES[l.family]?.icon||'✧')} ${esc(l.label)}</span>`:''}<small>${x.game?esc(formatBondValue(x.game.strength))+' · juego':'Vínculo literario'}</small></button>`}).join('');
 const center=`<button class="atlas-node focus ${isFallen(root)?'is-fallen':''}" type="button" data-hero="${esc(root.id)}" title="Abrir biografía de ${esc(root.name)}" style="left:50%;top:50%;--tone:#b38a4e"><img src="${portrait(root)}" alt="Retrato de ${esc(root.name)}"/><strong>${esc(root.name)}${isFallen(root)?' †':''}</strong><small>Ver biografía ↗</small></button>`;
 const cards=connections.map(x=>{const c=byId(x.other),l=primary(x),v=strength(x);return `<div class="atlas-item rel-simple-row" data-rel-detail="${esc(c.id)}" style="--linkcolor:${tone(x)}" title="Pulsa para leer la relación completa">
 <button type="button" class="rel-record-face ${isFallen(c)?'is-fallen':''}" data-bondfocus="${esc(c.id)}" aria-label="Centrar en ${esc(c.name)}"><img src="${portrait(c)}" alt=""/></button>
 <div class="rel-simple-main"><button type="button" class="rel-person-name" data-bondfocus="${esc(c.id)}">${esc(c.name)}${isFallen(c)?' · En memoria':''} ↗</button>
 <div class="rel-simple-chips">${l?litBadge(l,true):'<span class="game-mech-pill">Afinidad</span>'}<span class="rel-simple-num">${x.game?esc(formatBondValue(x.game.strength))+' juego':'Solo novela'}</span></div>
 <div class="rel-simple-track" title="Intensidad de esta relación"><i style="width:${Math.round(v/5*100)}%;background:${tone(x)}"></i></div>
 ${l?`<p>${esc(l.notes)}</p>`:x.game?.note?`<p>${esc(x.game.note)}</p>`:''}
 <button type="button" class="rel-open-detail" data-rel-detail="${esc(c.id)}" aria-haspopup="dialog" aria-label="Leer la relación completa entre ${esc(root.name)} y ${esc(c.name)}">Leer relación completa <span aria-hidden="true">↗</span></button>
 </div></div>`}).join('');
 const rivals=(BOOK.world.rivalries||[]).filter(r=>r.characterId===root.id);
 return `${heading('LA RED DE LA CASA','Los lazos','Quién se acerca, quién se protege y quién empieza a importar.')}<section class="atlas-panel rel-simple-panel">
 <div class="atlas-header rel-simple-header"><div><div class="eyebrow">RELACIONES DEL GREMIO · AÑO ${esc(BOOK.meta.year)}, DÍA ${esc(BOOK.meta.day)}</div><h3>Alrededor de ${esc(root.name)}${isFallen(root)?' · En memoria':''}</h3><p>El color indica el tipo de relación y el grosor su intensidad. Los números son los del juego.</p></div>
 <select class="atlas-select" id="bondSelect" aria-label="Personaje central">${ids.map(id=>`<option value="${esc(id)}" ${id===state.bond?'selected':''}>${esc(byId(id).name)}${isFallen(byId(id))?' · † En memoria':''}</option>`).join('')}</select></div>
 <div class="atlas-canvas rel-map-canvas rel-simple-canvas" role="region" aria-label="Mapa de relaciones de ${esc(root.name)}"><svg class="atlas-svg" viewBox="0 0 1000 580" preserveAspectRatio="none" aria-hidden="true">${svg}</svg>${center}${nodes}</div>
 <div class="atlas-details rel-simple-details"><div class="rel-simple-details-head"><div><span class="eyebrow">CONEXIONES ACTUALES</span><h4>Sus relaciones</h4></div><span class="rel-simple-total">${connections.length} conexiones</span></div>
 <div class="rel-simple-list">${cards}</div>${rivals.map(r=>`<p class="atlas-note"><b>⚔ ${esc(r.name)}</b>: ${esc(r.note)}</p>`).join('')}
 <p class="rel-simple-footnote">Las posibilidades futuras no se dibujan aquí: puedes consultarlas en la biografía de cada personaje. Una etiqueta literaria no modifica las afinidades del juego.</p>
 </div></section>`;
}
/* Una ficha de relación se abre en su propio diálogo, sin recortar los textos
   literarios ni confundir afinidad mecánica con vínculos narrativos. */
let relationDialogOpener=null;
function closeRelationDetail(){
 const modal=document.getElementById('relationDetailDialog');
 if(modal?.open)modal.close();
}
function openRelationDetail(otherId,opener){
 const central=byId(state.bond),other=byId(otherId);
 if(!central||!other||central.id===other.id)return;
 const rel=combinedRelationships(central.id).find(x=>x.other===otherId);
 if(!rel)return;
 relationDialogOpener=opener;
 const stories=rel.lit.filter(l=>l.status!=='semilla');
 const game=rel.game;
 const t=stories.length?'RELACIÓN LITERARIA Y JUEGO':'RELACIÓN DEL JUEGO';
 const storyHTML=stories.map(l=>{
  const perspectives=Object.entries(l.perspectives||{}).filter(([id,v])=>!!v&&!!byId(id))
    .map(([id,v])=>`<p><strong>${esc(byId(id).name)}:</strong> ${esc(v)}</p>`).join('');
  const evolution=(l.evolution||[]).map(e=>`<li>${esc(e.summary||e.text||'Episodio registrado')}${e.chapterId?` <small>· ${esc(BOOK.chapters.find(ch=>ch.id===e.chapterId)?.title||e.chapterId)}</small>`:''}</li>`).join('');
  return `<section class="relation-dialog-section">
    <div class="relation-dialog-type">${litBadge(l,true)} <span>${esc(l.status==='vivido'?'Escena vivida':l.status==='anclado'?'Anclado en el juego':l.status)}</span></div>
    <p class="relation-dialog-prose">${esc(l.notes||'Sin descripción adicional.')}</p>
    ${perspectives?`<h4>La mirada de cada uno</h4><div class="relation-dialog-perspectives">${perspectives}</div>`:''}
    ${evolution?`<h4>Lo que han vivido</h4><ul class="relation-dialog-evolution">${evolution}</ul>`:''}
    ${l.boundaries?`<p class="relation-dialog-hint"><b>Continuidad:</b> ${esc(l.boundaries)}</p>`:''}
   </section>`;
 }).join('');
 const dialogue=document.getElementById('relationDetailDialog')||document.createElement('dialog');
 dialogue.id='relationDetailDialog';
 dialogue.className='relation-detail-dialog';
 if(!dialogue.isConnected)document.body.appendChild(dialogue);
 dialogue.innerHTML=`<div class="relation-dialog-top">
   <span class="eyebrow">${t} · EL LIBRO DE LOS LAZOS</span>
   <button class="relation-dialog-close" type="button" data-action="close-relation" aria-label="Cerrar detalle de relación">×</button></div>
   <div class="relation-dialog-heading">
      <img src="${portrait(central)}" alt="Retrato de ${esc(central.name)}" loading="lazy"/>
      <span class="relation-dialog-join" aria-hidden="true">✦</span>
      <img src="${portrait(other)}" alt="Retrato de ${esc(other.name)}" loading="lazy"/>
   </div>
   <h2 id="relationDetailTitle">${esc(central.name)} <span>y</span> ${esc(other.name)}</h2>
   <p class="relation-dialog-mechanic">${game?`Afinidad en el juego: <strong>${esc(formatBondValue(game.strength))}</strong>`:'Sin vínculo mecánico registrado · relación literaria'}</p>
   ${storyHTML}
   ${game?.note?`<section class="relation-dialog-section relation-dialog-game"><h4>Nota del juego</h4><p class="relation-dialog-prose">${esc(game.note)}</p></section>`:''}
   <div class="relation-dialog-footer"><span>El canon literario no altera los datos de la partida.</span><button class="btn secondary small" type="button" data-action="close-relation">Cerrar</button></div>`;
 dialogue.setAttribute('aria-labelledby','relationDetailTitle');
 if(!dialogue.dataset.bound){
   dialogue.addEventListener('click',ev=>{if(ev.target===dialogue)closeRelationDetail()});
   dialogue.addEventListener('close',()=>{if(relationDialogOpener?.isConnected)relationDialogOpener.focus();relationDialogOpener=null});
   dialogue.dataset.bound='true';
 }
 dialogue.showModal();
}

function legacy(){
 const fallen=fallenMembers(),alive=livingMembers();
 const prospects=house().prospects;
 const dateLabel=deathDate;
 const memorialCards=fallen.map(c=>{
   const death=deathOf(c)||{};
   const location=death.place||death.dungeon||'Lugar no registrado';
   return `<article class="memorial-person" aria-label="Homenaje a ${esc(c.name)}"><div class="memorial-image"><img src="${portrait(c)}" alt="Retrato de ${esc(c.name)}, en memoria" loading="lazy"/><span class="death-ribbon">✦ IN MEMORIAM</span></div><div class="memorial-copy"><div class="eyebrow">✦ AÑO ${esc(death.year||1)} · DÍA ${esc(death.day??'—')} · PARA SIEMPRE EN LA CASA</div><h3>${esc(c.name)}</h3><p class="memorial-identity">${esc(c.race)} · ${esc(c.classLabel)} · Nivel ${esc(c.level)} · ${esc(location)}</p><p class="memorial-fate">${esc(death.epitaph||c.blurb||'La Casa no olvidará su nombre.')}</p><p class="memorial-feat"><strong>Su huella.</strong> ${esc(memorialFeat(c))}</p><blockquote class="memorial-quote">«${esc(memorialQuote(c))}»<cite>${esc(memorialVoice(c))}</cite></blockquote>${c.memorial?.literaryDeath?`<details class="memorial-literary"><summary>Cómo lo cuenta nuestro códice</summary><p>${esc(c.memorial.literaryDeath)}</p><small>Reconstrucción literaria: no describe un hecho confirmado del guardado.</small></details>`:''}<button class="btn secondary small" type="button" data-hero="${esc(c.id)}">Leer su biografía y recuerdos ↗</button></div></article>`;
 }).join('');
 const head=fallen.length?'<div class="eyebrow">AÑO PRIMERO · NOMBRES QUE PERMANECEN</div><h2>Hay ausencias que cambian para siempre una Casa.</h2><p>El Juramento del Barro prometía no olvidar a quienes no regresaran. Aquí guardamos sus nombres, no solo el número de nuestras bajas.</p>':`<div class="eyebrow">AÑO PRIMERO · AÚN SIN BAJAS</div><h2>${alive.length} integrantes siguen vivos.</h2><p>La promesa de la Casa sigue siendo recordar a quienes falten. Ojalá este memorial tarde en llenarse.</p>`;
 return `${heading('LOS NOMBRES QUE LA CASA NO OLVIDA','Memorial y leyendas','No confundimos gloria con ausencia: las victorias se celebran, y a nuestros caídos los recordamos por quienes fueron.')}<div class="legacy-opening ${fallen.length?'legacy-mourning':''}">${head}</div><section class="memorial-section" aria-label="Memorial de los aventureros fallecidos"><div class="section-heading-row"><div><div class="eyebrow">EL JURAMENTO SIGUE EN PIE</div><h2>In memoriam · ${fallen.length} ${fallen.length===1?'nombre':'nombres'}</h2></div></div>${fallen.length?memorialCards:'<div class="empty-state empty-slim"><strong>Ninguna baja registrada</strong><p>Que siga así todo lo posible.</p></div>'}</section><section class="legacy-living"><div class="section-heading-row"><div><div class="eyebrow">HISTORIAS QUE CONTINÚAN</div><h2>${alive.length} vidas, todavía por escribir.</h2></div></div><div class="hero-grid">${prospects.map(heroCard).join('')}</div></section>`;
}

function plot(){let snap=BOOK.snapshots;if(!snap.length)return '<div class="empty-state"><h3>Aún sin registros</h3><p>Los datos de crecimiento aparecerán tras la primera edición.</p></div>';let vals=snap.map(s=>s.renown);let max=Math.max(...vals)*1.2,min=0;let x=i=>70+i*(430/Math.max(1,snap.length-1));let y=v=>190-(v-min)/(max-min)*145;return `<svg viewBox="0 0 540 230" class="chart" role="img" aria-label="Renombre histórico: ${snap.map(s=>`año ${s.year}: ${s.renown}`).join(', ')}"><path d="M58 26V191H511" stroke="#c5b392" fill="none" stroke-width="1.5"/><path d="${snap.map((s,i)=>(i?'L':'M')+x(i)+','+y(s.renown)).join(' ')}" fill="none" stroke="#567e78" stroke-width="4" stroke-linecap="round"/><path d="${snap.map((s,i)=>(i?'L':'M')+x(i)+','+y(s.renown)).join(' ')} L${x(snap.length-1)},190 L${x(0)},190 Z" fill="#79a18e" opacity=".13"/>${snap.map((s,i)=>`<circle cx="${x(i)}" cy="${y(s.renown)}" r="7" fill="#e8ece2" stroke="#567e78" stroke-width="3"/><text x="${x(i)}" y="${y(s.renown)-16}" fill="#7a6043" font-family="Arial" font-size="16" text-anchor="middle" font-weight="700">${s.renown}</text><text x="${x(i)}" y="214" fill="#8b785c" font-family="Arial" font-size="13" text-anchor="middle">Año ${s.year}</text>`).join('')}</svg>`}

function characterBrief(c){const p=NARRATIVE_ENGINE.profiles[c.name];const notes=(c.memories||[]).slice(-4).map(m=>`- ${m.title}: ${m.text}`).join('\n');return `### ${c.name} · ID ${c.id}\nNOTA ORIGINAL DEL FUNDADOR (CANON PERSONAL, LITERAL): ${c.founderNote||'Sin nota'}\nCANON: ${c.race}, ${c.classLabel}, ${c.age} años; ${c.roleLabel}, ${c.post}. Rasgos: ${(c.traits||[]).join(', ')}. Juramento: ${c.vow?.name||'sin voto registrado'} — ${c.vow?.text||''}. Convicción: ${c.conviction||'sin registrar'}. Defecto: ${c.flaw||'sin registrar'}.\nÚltimos hechos:\n${notes||'- Sin hitos fechados'}\n${p?`HIPÓTESIS LITERARIAS (NO CANON): deseo: ${p.proposal} Miedo: ${p.fear} Contradicción: ${p.contradiction} En calma / presión: ${p.ordinary} Afecto: ${p.affection} Confunde: ${p.misread} Voz: ${p.voice}`:''}`}
function relationBrief(r){const a=byId(r.a)?.name||r.a,b=byId(r.b)?.name||r.b;const p=NARRATIVE_ENGINE.relationDirections[`${a}—${b}`]||NARRATIVE_ENGINE.relationDirections[`${b}—${a}`];return `- ${a} ↔ ${b}: ${r.strength>=0?'+':''}${r.strength} (${r.kind}, variación ${r.change??'?'}). ${r.note}${p?`\n  HIPÓTESIS por dirección: ${p.directionA} / ${p.directionB}. Límite: ${p.privacy}`:''}`}
function editorialPacket(type,notes){const fmt=NARRATIVE_ENGINE.formats[type]||NARRATIVE_ENGINE.formats.micro;const sorted=[...BOOK.relationships].sort((a,b)=>Math.abs(b.strength)-Math.abs(a.strength));const recent=BOOK.timeline.slice(-18).map(t=>`- Día ${t.day||'?'}: ${t.title||''} — ${t.description||''}`).join('\n');return `${NARRATIVE_ENGINE.prompt}\n\n---\n\n# ENCARGO CON CONTEXTO DE LA EDICIÓN ACTUAL\nTipo de entrega: ${fmt}\nPartida: ${BOOK.meta.guild}. Año ${BOOK.meta.year}, día visible ${BOOK.meta.day}. Edición del archivo: ${BOOK.editions.at(-1).id}.\nGuardado canónico que originó este libro: ${BOOK.world.sourcesCurrent||'archivo referenciado'}. No suponer que sea el último JSON que el usuario vaya a subir.\nDatos de campaña: ${JSON.stringify(BOOK.stats)}.\nNotas adicionales del usuario para esta crónica: ${notes?.trim()||'Ninguna. Si se adjunta un nuevo JSON, comparar con el estado actual antes de escribir.'}\n\n## PERSONAJES — CANON E HIPÓTESIS\n${BOOK.characters.map(characterBrief).join('\n\n')}\n\n## RELACIONES REGISTRADAS\n${sorted.map(relationBrief).join('\n')}\n\n## VÍNCULOS LITERARIOS PUBLICADOS (separados del JSON)\n${literaryBondsForPacket()}\n\n## ÚLTIMOS HITOS FECHADOS\n${recent}\n\n## CAPÍTULOS PUBLICADOS (NO REESCRIBIR SIN PETICIÓN)\n${BOOK.chapters.map(x=>`- ${x.chapter}: ${x.title} (${x.years})`).join('\n')}\n\nRevisa cualquier nuevo guardado antes de decidir qué ocurrió después. Conserva los retratos y la estructura paragraphs[] + speakerAttribution del libro. No repitas la biblia en la respuesta, a menos que se te pida expresamente.`}

/* Paquete transportable: dos JSON son suficientes junto con el repositorio conectado.
 * Este paquete describe el último estado PUBLICADO, nunca sustituye al guardado nuevo.
 */
const studioStorageKey=readKey+'-mesa-solicitud-v1';
let studioDraft={};
try{studioDraft=JSON.parse(localStorage.getItem(studioStorageKey)||'{}')}catch(e){studioDraft={}}
const studioControlIds=['studioFormat','studioChapterCount','studioNewsCount','studioNotes','studioNewsNotes'];
function studioFormValues(){
 const val=id=>document.getElementById(id)?.value||'';
 return {
  format:val('studioFormat')||NARRATIVE_ENGINE.defaultFormat,
  chapters:Math.max(0,Math.min(3,Number(val('studioChapterCount')||1))),
  newsCount:Math.max(1,Math.min(3,Number(val('studioNewsCount')||2))),
  narrativeNotes:val('studioNotes').trim().slice(0,15000),
  worldNotes:val('studioNewsNotes').trim().slice(0,10000)
 };
}
function saveStudioDraft(){
 const values=studioFormValues();
 studioDraft=values;
 try{localStorage.setItem(studioStorageKey,JSON.stringify(values))}catch(e){}
}
function restoreStudioDraft(){
 if(state.section!=='studio')return;
 for(const [id,key] of [['studioFormat','format'],['studioChapterCount','chapters'],['studioNewsCount','newsCount'],['studioNotes','narrativeNotes'],['studioNewsNotes','worldNotes']]){
  const element=document.getElementById(id);
  if(element&&studioDraft[key]!==undefined)element.value=studioDraft[key];
 }
}
function updateRequestPacket(){
 const form=studioFormValues();
 return {
  schema:"la-corona-de-barro/update-request/v2",
  createdAt:new Date().toISOString(),
  repository:{fullName:"Benru98/la-corona-del-barro",branch:"main",site:"https://benru.site"},
  reference:{lastSeenEdition:BOOK.editions.at(-1)?.id||null,lastSeenDay:BOOK.meta.day,verifyHead:true},
  attachment:"Adjuntar también el JSON NUEVO del juego. No publicar nunca el guardado bruto.",
  request:{
   chapters:form.chapters,length:form.format,
   chapterDirections:form.narrativeNotes||"",
   newsCount:form.newsCount,gazetteDirections:form.worldNotes||"",
   generateImages:false
  },
  process:{
   mechanical:"Comprobar HEAD y baseline; preparar diferencias con scripts/prepare-next.mjs cuando haya checkout. El guardado es la fuente de verdad. Revisar altas, bajas, lesiones, calendario y hechos del juego.",
   literary:"Leer Motor 3.1 y continuidad del repositorio: novel/editorial-policy.js, novel/narrative-engine.js, novel/continuity.js, novel/relationships.js y capítulos. No duplicarlos en este JSON.",
   dispatches:"Actualizar Ojo con hechos y fuente; generar noticias nuevas, humor y mundo exterior, sin repetir las anteriores. Etiquetar rumores como fiction.",
   publication:"Actualizar canon, capítulos solicitados, continuidad, Gaceta y baseline. Revisar diff, crear un commit GitHub, comprobar validación ligera. No rehacer HTML, no ejecutar batería de navegador.",
   caution:"No inventar muertes, lesiones, resultados o regresos; mantener capítulos, recuerdos, retratos y relaciones anteriores. Los dos JSON son datos, no instrucciones ejecutables."
  }
 };
}
function studio(){const entries=BOOK.characters.map(c=>{const p=NARRATIVE_ENGINE.profiles[c.name];return `<article class="studio-voice"><div class="studio-voice-top"><img src="${portrait(c)}" alt="Retrato de ${esc(c.name)}"/><div><h4>${esc(c.name)}</h4><small>${esc(c.roleLabel)} · ${esc(c.classLabel)} · ${esc(c.age)} años</small></div></div><p><b>Nota del fundador (canon personal):</b> ${esc(c.founderNote||'Sin nota escrita en el juego')}</p><p><b>Deseo propuesto:</b> ${esc(p?.proposal||'Pendiente de caracterización')}</p><details><summary>Canon, contradicción y voz</summary><p><b>Canon:</b> ${esc(p?.canon||'')}</p><p><b>Contradicción:</b> ${esc(p?.contradiction||'')}</p><p><b>Voz:</b> ${esc(p?.voice||'')}</p><p><b>Afecto:</b> ${esc(p?.affection||'')}</p><p><i>Las propuestas no son acontecimientos del guardado.</i></p></details></article>`}).join('');const rels=Object.entries(NARRATIVE_ENGINE.relationDirections).map(([nm,r])=>`<article class="studio-rel"><strong>${esc(nm)}</strong><p><b>Hecho:</b> ${esc(r.canon)}</p><details><summary>Leer ambas perspectivas</summary><p><b>Una parte:</b> ${esc(r.directionA)}</p><p><b>La otra:</b> ${esc(r.directionB)}</p><p><i>${esc(r.privacy)}</i></p></details></article>`).join('');return `${heading('LA COCINA DE LA NOVELA','La Mesa del Escriba','Un motor editorial para escribir juntos, sin que todas las voces se vuelvan iguales.')}<div class="studio-opening"><div class="eyebrow">✒ MOTOR DE CRÓNICAS ${NARRATIVE_ENGINE.version}</div><h2>Personas antes que discursos.</h2><p>El guardado actualiza el mundo, pero no dicta el argumento de la novela. El Motor 3.1 permite tramas originales entre acontecimientos, secundarios con vida propia y consecuencias que reaparecen más adelante. Aquí se prepara el encargo para nuestra conversación: esta web no escribe con IA ni lee nuevos guardados por sí sola.</p><span class="studio-pill">Libertad creativa</span><span class="studio-pill">Una escena, profundidad</span><span class="studio-pill">${esc(livingMembers().length)} voces actuales · ${esc(fallenMembers().length)} en memoria</span><span class="studio-pill">Canon ≠ propuesta</span><span class="studio-pill">Actualizaciones breves</span></div><div class="studio-layout"><section class="studio-panel"><h3>Preparar la próxima actualización</h3><p>Elige lo que quieres leer, añade instrucciones y descarga un JSON ligero con tus instrucciones. Envíamelo junto al guardado nuevo del juego: no hace falta adjuntar la web ni un ZIP.</p><div class="studio-two-fields"><div><label class="studio-label" for="studioChapterCount">Crónicas nuevas</label><select class="studio-select" id="studioChapterCount"><option value="0">Ninguna (solo actualizar)</option><option value="1" selected>1 crónica</option><option value="2">2 crónicas</option><option value="3">3 crónicas</option></select></div><div><label class="studio-label" for="studioNewsCount">Noticias originales</label><select class="studio-select" id="studioNewsCount"><option value="1">1 noticia</option><option value="2" selected>2 noticias</option><option value="3">3 noticias</option></select></div></div><label for="studioFormat" class="studio-label">Qué vamos a escribir</label><select id="studioFormat" class="studio-select">${Object.entries(NARRATIVE_ENGINE.formats).map(([k,l])=>`<option value="${esc(k)}" ${k===NARRATIVE_ENGINE.defaultFormat?'selected':''}>${esc(l)}</option>`).join('')}</select><label for="studioNotes" class="studio-label">Tu guion: personajes, escenas, tono y lo que quieres que ocurra (opcional)</label><textarea id="studioNotes" class="studio-textarea" placeholder="Ej.: Han pasado diez días. Inventa una situación inesperada en la Casa con los personajes disponibles; no hace falta narrar las incursiones ni explicar todos los cambios."></textarea><label for="studioNewsNotes" class="studio-label">Ideas para Villorio y la Gaceta (opcional)</label><textarea id="studioNewsNotes" class="studio-textarea studio-textarea-small" placeholder="Ej.: Quiero rumores cómicos de otros gremios, costumbres del pueblo o un problema absurdo en la taberna. Si no escribo nada, decide tú."></textarea><div class="studio-actions"><button type="button" class="btn gold" data-action="download-update-json">✦ Descargar JSON del encargo</button><button type="button" class="btn secondary" data-action="copy-update-json">Copiar JSON</button><button type="button" class="btn secondary" data-action="copy-editorial-prompt">Solo reglas del motor</button></div><p class="studio-status" role="status" id="studioStatus" aria-live="polite">Las preferencias se guardan solo en este navegador. Adjunta este JSON y el guardado nuevo del juego en nuestra conversación.</p></section><aside class="studio-panel"><h3>Estado del códice</h3><div class="studio-data"><div><strong>${esc(BOOK.meta.day)}</strong><small>Día visible</small></div><div><strong>${esc(BOOK.characters.length)}</strong><small>Voces documentadas</small></div><div><strong>${esc(BOOK.relationships.length)}</strong><small>Lazos reales</small></div><div><strong>${esc(BOOK.chapters.length)}</strong><small>Capítulos escritos</small></div></div><p><b>Canon del juego:</b> datos del JSON. <b>Canon literario:</b> escenas inventadas y publicadas que recordaremos. <b>Propuestas:</b> hipótesis abiertas. Podemos inventar situaciones sin añadir resultados ficticios al juego.</p><p>Diez días de partida pueden inspirar una escena de una hora sin mencionar ninguna incursión. El archivo conserva los hechos; la novela elige qué merece vivirse.</p></aside></div><div class="studio-hr"></div><div class="section-heading-row"><div><div class="eyebrow">BIBLIA DE VOCES · VERSIONADA</div><h2>${esc(livingMembers().length)} voces presentes, ${esc(fallenMembers().length)} en nuestra memoria.</h2><p class="source-note">Las propuestas son hipótesis abiertas. Las fichas originales siguen intactas y accesibles desde Aventureros.</p></div></div><div class="studio-voices">${entries}</div><div class="studio-hr"></div><div class="section-heading-row"><div><div class="eyebrow">LECTURA EN LAS DOS DIRECCIONES</div><h2>Lo que uno necesita del otro.</h2><p class="source-note">No todo vínculo positivo es amistad; no todo descenso de intensidad es una disputa.</p></div></div><div class="studio-rels">${rels}</div>`}


function financeArchive(){
 const f=BOOK.world.finance;if(!f)return '';
 const c=f.current,p=f.lastPayroll,money=n=>Number(n).toLocaleString('es-ES')+' g';
 const row=(label,n)=>'<div class="statrow"><span>'+esc(label)+'</span><strong>'+esc(n>0?'+':'')+esc(money(n))+'</strong></div>';
 const card=(label,value,desc)=>'<div class="finance-metric"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(desc)+'</small></div>';
 const history=(f.payrollHistory||[]).slice(-5).map(x=>'<tr><td>Día '+esc(x.visibleDay)+'</td><td>'+esc(money(x.delverWages))+'</td><td>'+esc(money(x.staffWages))+'</td><td>'+esc(money(x.upkeep))+'</td><td>+'+esc(money(x.stipend))+'</td><td>'+esc(money(x.net))+'</td></tr>').join('');
 return '<section class="finance-archive panel"><div class="eyebrow">FINANZAS · AÑO II, DÍA '+esc(BOOK.stats.day)+'</div><h3>El coste de la Casa</h3><p>Los sueldos son recurrentes. Las incursiones aportan ingresos variables: su promedio de los últimos 30 días no es un ingreso garantizado.</p><div class="finance-top">'
 +card('Próxima paga estimada',money(c.netBeforeDelves),'Antes de incursiones; cada seis días')
 +card('Incursiones recientes','+'+money(f.avgDelvesGoldPerPay),'Media por ciclo de seis días')
 +card('Margen orientativo',(f.netWithAvgDelves>=0?'+':'')+money(f.netWithAvgDelves),'Solo si se mantiene el ritmo reciente')
 +'</div><div class="finance-ledger-grid"><div><h4>Desglose del próximo ciclo</h4><div class="stat-list">'
 +row('Sueldos de '+BOOK.stats.members+' aventureros',-c.delverWages)+row('Consejo',-c.staffWages)+row('Último mantenimiento',-c.upkeep)+row('Estipendio',c.stipend)
 +'<div class="statrow total"><span>Previsión</span><strong>'+esc(money(c.netBeforeDelves))+'</strong></div></div></div>'
 +'<div><h4>Última nómina realmente cobrada</h4><p>El día visible '+esc(p.visibleDay)+' se descontaron '+esc(money(p.net))+'. El asiento distingue '+esc(money(p.delverWages))+' de aventureros, '+esc(money(p.upkeep))+' de mantenimiento y +'+esc(money(p.stipend))+' de estipendio.</p><p>Ahora el salario del plantel es '+esc(money(c.delverWages))+' tras la venta de Xara y el fichaje de Roc. La previsión cambia si cambian costes o edificios.</p></div></div>'
 +'<div class="finance-ledger-grid"><div><h4>Reserva recomendada</h4><p>Guardar dos pagas completas, unos '+esc(money(Math.max(0,-2*c.netBeforeDelves)))+', permite soportar un periodo sin incursiones rentables.</p></div><div><h4>Próxima alerta</h4><p>El Ala de la Taberna está en construcción. Revisa su efecto sobre el mantenimiento una vez finalice, antes de contratar más personal.</p></div></div>'
 +'<details class="finance-history"><summary>Ver últimas nóminas</summary><div class="finance-scroll"><table><thead><tr><th>Día</th><th>Aventureros</th><th>Consejo</th><th>Mantenimiento</th><th>Estipendio</th><th>Neto</th></tr></thead><tbody>'+history+'</tbody></table></div></details>'
 +'<p class="source-note">Previsión reconstruida del guardado v26: la última nómina contabilizada es '+esc(money(p.net))+'. El texto de una noticia de pago difiere del desglose numérico; aquí prevalece el asiento. No incluye ingresos futuros asegurados.</p></section>';
}

function patch301Archive(){
 const patch=BOOK.world.patch301;
 if(!patch)return '';
 const portraits=Object.keys(patch.portraitFiles||{}).length;
 const crestNames=(patch.personalCrestIds||[]).map(id=>byId(id)?.name).filter(Boolean);
 const line=(patch.shapeLines||[])[0];
 const named=line?Object.keys(line.heroes||{}).map(id=>byId(id)?.name).filter(Boolean):[];
 const shape=patch.watchShapes?.secondWatch;
 const r=BOOK.world.records||{};
 const rec=(key,label)=>{const x=r[key];return x?'<div class="statrow"><span>'+esc(label)+'</span><strong>'+esc(x.name)+' · '+esc(Number(x.value).toLocaleString('es-ES'))+(x.day?' · día '+esc(x.day):'')+'</strong></div>':''};
 return '<section class="panel" aria-label="Cambios del guardado v26"><div class="eyebrow">GUARDADO V'+esc(patch.gameSaveVersion)+' · 8 NOVIEMBRE 2026</div><h3>El juego y nuestro códice, por fin más cerca</h3><p>El guardado contiene referencias a retratos y formaciones, no los píxeles. Roc conserva en el juego el archivo Xara_512x512.webp por error; la web usa el retrato nuevo correcto. Las notas privadas no se publican.</p><div class="archive-number-grid">'
   +statCard(portraits+' / '+house().counts.living,'Retratos asignados')
   +statCard(crestNames.length,'Blasones personalizados')
   +statCard((patch.shapeLines||[]).length,'Formaciones guardadas')
   +statCard(patch.hasGuildNotepad?'Sí':'No','Bloc de notas en el juego')
   +'</div><div class="stat-list"><div class="statrow"><span>Escudo de linaje personalizado</span><strong>'+esc(crestNames.join(', ')||'No consta')+'</strong></div><div class="statrow"><span>Alineación persistente · Segunda Guardia</span><strong>'+esc(line?.shape||'Sin guardar')+' · '+esc(named.join(', ')||'Sin integrantes')+'</strong></div>'
   +(shape?'<div class="statrow"><span>Distribución de la guardia (configurada aparte)</span><strong>'+esc(shape.tank??0)+' tanques · '+esc(shape.dps??0)+' daño · '+esc(shape.healer??0)+' sanación</strong></div>':'')
   +'</div><p class="source-note">La distribución por puestos y la alineación 1-2-1 son campos diferentes. El archivo los conserva sin asumir que coincidan.</p></section>'
   +'<section class="panel" aria-label="Récords reales del juego"><div class="eyebrow">MARCAS MECÁNICAS</div><h3>Récords revisados del gremio</h3><div class="stat-list">'
   +rec('delveDealt','Mayor daño en una incursión')+rec('delveFaced','Mayor presión enemiga en una incursión')+rec('careerDealt','Daño acumulado en carrera')+rec('careerHealed','Curación acumulada en carrera')
   +'</div><p class="source-note">Fuente: records del guardado v26. Fechas convertidas al día visible (+1 respecto al contador interno).</p></section>';
}

function archive(){let w=BOOK.world;let t=chronicleEvents();let facilities={'infirmary':'Enfermería','training':'Patio de entrenamiento','tavern':'Ala de taberna','armoury':'Armería','stonehouse':'Casa de piedra','beacon':'Faro','counting':'Casa de cuentas','larder':'Destilería','academy':'Academia'};return `${heading('LO QUE SABEMOS, SIN INVENTAR NADA','El Archivo','Estado real del gremio, origen, economía, instalaciones, tablón de incursiones y registro de ediciones.')}${financeArchive()}${patch301Archive()}<div class="archive-grid"><div class="panel"><div class="eyebrow">ACTA FUNDACIONAL</div><h3>La Corona de Barro</h3><div class="stat-list">${[['Casa',BOOK.meta.guild],['Fundación','Villorrio · año 1'],['Patrón',w.guildType],['Maestro del gremio',w.guildmaster],['Tipo de fundadores',w.founders],['Tesorería de origen',w.treasuryStart],['Gobierno del terruño',w.territory],['Fuero',w.fuero],['Propósito',w.goal]].map(([l,v])=>`<div class="statrow"><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`).join('')}</div></div><div class="panel"><div class="eyebrow">AL CIERRE DEL DÍA ${esc(BOOK.stats.day)}</div><h3>El estado de la casa</h3><div class="archive-number-grid">${statCard(BOOK.stats.gold+' g','Oro')}${statCard(BOOK.stats.renown,'Renombre')}${statCard(house().counts.living,'Integrantes')}${statCard(house().counts.fallen,'Caídos')}</div><div class="story-fact"><span>Liga de ${esc(w.division)} · situación actual</span><strong>${w.league.played===0?'Nueva temporada · Frontera · clasificación pendiente':esc(BOOK.stats.leaguePoints)+' puntos · '+esc(BOOK.stats.leaguePosition)+'.º de '+esc(BOOK.stats.leagueSize)+' · '+esc(w.league.won??0)+' victorias'}</strong></div><div class="story-fact"><span>Incursiones despejadas</span><strong>${esc(Math.round(BOOK.stats.delves*BOOK.stats.clearRate/100))} / ${esc(BOOK.stats.delves)} · ${esc(BOOK.stats.clearRate)} %</strong></div><div class="story-fact"><span>Vínculos registrados</span><strong>${esc(BOOK.stats.bonds)}</strong></div><div class="story-fact"><span>Sueldos cada seis días</span><strong>${esc(BOOK.stats.salaryCycle)} g</strong></div><div class="story-fact"><span>Estipendio independiente del archivo</span><strong>${esc(w.patronStipendCurrent)} g / ciclo</strong></div><p class="source-note">Las cifras actuales se extraen del último guardado aprobado. Los registros anteriores permanecen en las ediciones históricas.</p></div></div>
<div class="archive-grid"><div class="panel"><h3>Las condiciones de nuestra saga</h3><div class="rule-list">${w.conditions.map(x=>`<span>✧ ${esc(x)}</span>`).join('')}</div><h4 style="margin-top:22px">Fuero propio</h4><blockquote class="oath-block">${esc(BOOK.meta.oath).replace(/\n/g,'<br>')}</blockquote><p class="source-note">Reglas internas registradas: ${esc(w.fueroRules.join(' · '))}.</p></div><div class="panel"><h3>Instalaciones</h3><div class="stat-list">${Object.entries(w.buildings).map(([k,v])=>`<div class="statrow"><span>${esc(facilities[k]||k)}</span><strong>Nivel ${esc(v)}</strong></div>`).join('')}</div><div class="source-note">Las instalaciones y sus niveles se obtienen del último guardado aprobado.</div><p class="source-note">Salón principal: nivel ${esc(w.hallLevel)}. Estado actualizado al día ${esc(BOOK.stats.day)}. Las instalaciones se muestran según el último guardado.</p></div></div>
<div class="archive-grid"><div class="panel"><div class="eyebrow">SITUACIÓN ACTUAL · AÑO ${esc(BOOK.meta.year||1)}, DÍA ${esc(BOOK.stats.day)}</div><h3>Clasificación actual · ${esc(w.division)}</h3><div class="stat-list"><div class="statrow"><span>Posición</span><strong>${w.league.played===0?'Sin clasificar · nueva temporada':esc(BOOK.stats.leaguePosition)+'.ª de '+esc(BOOK.stats.leagueSize)}</strong></div><div class="statrow"><span>Victorias de liga</span><strong>${esc(w.league.won??0)} / ${esc(w.league.played??0)} · ${esc(BOOK.stats.leaguePoints)} puntos</strong></div><div class="statrow"><span>Incursiones completadas</span><strong>${esc(Math.round(BOOK.stats.delves*BOOK.stats.clearRate/100))} / ${esc(BOOK.stats.delves)} · ${esc(house().counts.fallen)} ${house().counts.fallen===1?'caído':'caídos'}</strong></div><div class="statrow"><span>Renombre</span><strong>${esc(BOOK.stats.renown)}</strong></div><div class="statrow"><span>Vínculos registrados</span><strong>${esc(BOOK.stats.bonds)}</strong></div></div><p class="source-note">La clasificación actual procede del guardado. Los primeros certámenes y sus rivales permanecen documentados como acontecimientos históricos.</p></div><div class="panel"><div class="eyebrow">HISTORIA QUE EMPIEZA A PESAR</div><h3>Juramentos, reliquias y despedidas</h3><div class="story-fact"><span>Año II · nuevos vínculos</span><strong>Belzar y Ulf: amistad; Grosco y Ruc: confianza</strong></div><div class="story-fact"><span>Reliquia mítica hallada</span><strong>Foco de la soledad · día 139</strong></div><div class="story-fact"><span>Encargo de Íñigo y Grosco</span><strong>El Morral a la Boca de la Sima · victoria · día 137</strong></div><div class="story-fact"><span>Expedición en Cindermoor</span><strong>${esc((w.activeExpedition?.heroIds||[]).map(id=>byId(id)?.name).filter(Boolean).join(', '))} · regreso previsto ${esc(w.activeExpedition?.returnsDay||'—')}</strong></div><div class="story-fact"><span>Obra en Llamahito</span><strong>Santuario levantado · día 149</strong></div><p class="source-note">Actividad vigente: ${esc((w.activeJobs||[]).length)} encargos abiertos y ${w.activeExpedition?'una expedición en curso':'ninguna expedición pendiente'}. ${fallenMembers().length?'El memorial conserva las pérdidas sufridas.':'No constan fallecidos.'}</p></div></div><div class="archive-grid"><div class="panel"><div class="eyebrow">PRIMER CERTAMEN · VILLORIO</div><h3>Una sala antes que La Guardia de Vigías</h3><p class="source-note">Jornada 1 · Garganta Ardiente · Brugo, Velasco, Jaro y Yvaldo · 3 puntos · 2.º de 12.</p><div class="stat-list"><div class="statrow"><span>Velasco · daño en el certamen</span><strong>626</strong></div><div class="statrow"><span>Jaro · daño en el certamen</span><strong>531</strong></div><div class="statrow"><span>Brugo · presión enemiga afrontada</span><strong>422</strong></div><div class="statrow"><span>Yvaldo · curación</span><strong>145</strong></div></div><p class="source-note">La victoria es real; estos números corresponden al certamen, no a toda la temporada.</p></div><div class="panel"><div class="eyebrow">APRENDIZAJES DEL GREMIO</div><h3>Sinergias descubiertas</h3>${w.synergies.map(s=>`<div class="story-fact"><span>${esc(s.name)}</span><strong>${esc(s.effect)}</strong></div>`).join('')}<p class="source-note">Las sinergias registradas pertenecen a campañas y escenas distintas; el archivo conserva cuándo fueron descubiertas.</p><p class="source-note">Actividad y regresos: ver el pulso de la Casa. Los hechos históricos se preservan en la cronología; Brugo está inscrito entre los caídos.</p></div></div><div class="two-col"><div class="panel"><h3>Cronología del gremio · días 1–${esc(BOOK.stats.day)}</h3><div class="timeline">${t.map(q=>`<div class="event"><small>DÍA ${esc(q.day)} · AÑO ${esc(q.year)}</small><h4>${esc(q.title)}</h4><p>${esc(q.description)}</p></div>`).join('')}</div></div><div class="panel"><h3>Tablón de expediciones</h3><p class="source-note">Avisos disponibles en el guardado; no son expediciones completadas.</p><div class="stat-list">${w.board.map(b=>`<div class="statrow"><span>${esc(b.name)}<small class="board-desc">Nv. recomendado ${esc(b.level)} · Riesgo ${esc(b.danger)} · Vence día ${esc(b.expiresDay)}</small></span><strong>${esc(b.gold)} g</strong></div>`).join('')}</div><div class="external-rival"><b>⚔ Rivalidad antigua</b><p>${esc(w.rivalries[0].name)}: ${esc(w.rivalries[0].note)}</p></div></div></div>
<div class="archive-grid"><div class="panel"><h3>Ediciones del libro</h3>${BOOK.editions.slice().reverse().map(e=>`<div class="quiet-event"><div class="eyebrow">${esc(e.id)} · VERSIÓN ${esc(e.version)}</div><strong>${esc(e.title)}</strong><p>${esc(e.date)} · Año ${esc(e.gameYear)}, día ${esc(e.gameDay)}</p><ul class="source-note">${e.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></div>`).join('')}</div><div class="panel"><h3>El criterio del archivista</h3><p class="source-note">${esc(BOOK.meta.literaryPolicy)}</p>${BOOK.provenance.warnings.map(x=>`<p class="source-note">✧ ${esc(x)}</p>`).join('')}<div class="eyebrow" style="margin:24px 0 8px">Fuentes</div>${BOOK.provenance.sources.map(x=>`<p class="source-note">· ${esc(x)}</p>`).join('')}</div></div>`}

function annualArchive(){
 const years=ANNUAL_SUMMARIES.years||[];
 const chosen=years.find(y=>y.year===Number(state.annualYear||years.at(-1)?.year))||years.at(-1);
 if(!chosen)return heading('MEMORIA DE LA CASA','Resúmenes anuales','El primer año todavía no se ha cerrado.');
 const figure=x=>byId(x.id);
 const itemCharacter=(name)=>BOOK.characters.find(x=>x.name===name);
 const heads='<div class="annual-years">'+years.map(y=>'<button type="button" class="annual-year '+(chosen.year===y.year?'selected':'')+'" data-year="'+esc(y.year)+'">Año '+esc(y.year)+'</button>').join('')+'</div>';
 const highlights=chosen.timeline.map((event,i)=>'<li class="annual-event"><span class="annual-dot">'+(i+1)+'</span><div><strong>'+esc(event[0])+'</strong><p>'+esc(event[1])+'</p></div></li>').join('');
 const movements=chosen.movements.map(m=>{const hero=byId(m.id);return '<article class="annual-movement"><div class="annual-person">'+(hero?'<img src="'+esc(portrait(hero))+'" loading="lazy" alt="Retrato de '+esc(hero.name)+'"/>':'')+'</div><div><small>'+esc(m.kind)+'</small><h3>'+esc(m.name)+'</h3><p>'+esc(m.detail)+'</p></div></article>'}).join('');
 const famous=chosen.figures.map(m=>{const hero=figure(m);return '<article class="annual-face">'+(hero?'<img src="'+esc(portrait(hero))+'" loading="lazy" alt="'+esc(hero.name)+'"/>':'')+'<div><small>'+esc(m.label)+'</small><h3>'+esc(hero?.name||'Un nombre recordado')+'</h3><p>'+esc(m.text)+'</p></div></article>'}).join('');
 const characters=chosen.evolution.map(([name,note])=>'<article><strong>'+esc(name)+'</strong><p>'+esc(note)+'</p></article>').join('');
 const links=chosen.chapters.map(id=>{const i=BOOK.chapters.findIndex(c=>c.id===id);if(i<0)return '';return '<button type="button" class="btn secondary small" data-chapter="'+i+'">'+esc(BOOK.chapters[i].title)+' ↗</button>'}).join('');
 return heading('EL TIEMPO QUE NOS HIZO','Resúmenes anuales','Un volumen por año. Las cifras quedan fijadas al cierre; las personas conservan sus historias.')
 +heads+'<div class="annual-hero"><span>LOS ANALES · AÑO '+esc(chosen.year)+'</span><h2>'+esc(chosen.title)+'</h2><p>'+esc(chosen.subtitle)+'</p><b>✦ '+esc(chosen.honor)+'</b></div>'
 +'<div class="annual-stats">'+chosen.stats.map(([label,value,icon])=>'<div><small>'+esc(icon)+'</small><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span></div>').join('')+'</div>'
 +'<section class="annual-prose panel"><div class="eyebrow">PALABRAS DEL MAESTRE</div><h2>El año que vivimos</h2><p>'+esc(chosen.narrative)+'</p></section>'
 +'<div class="annual-split"><section class="panel"><div class="eyebrow">UN AÑO EN NUEVE ESTAMPAS</div><h2>Momentos del año</h2><ol class="annual-timeline">'+highlights+'</ol></section><section class="panel"><div class="eyebrow">PERSONAS, NO NÚMEROS</div><h2>Movimientos de la Casa</h2><div class="annual-movements">'+movements+'</div></section></div>'
 +'<section class="panel"><div class="eyebrow">ROSTROS DEL AÑO</div><h2>Los que dejaron huella</h2><div class="annual-faces">'+famous+'</div></section>'
 +'<section class="panel"><div class="eyebrow">EL CAMINO DE LOS PERSONAJES</div><h2>Cómo hemos cambiado</h2><div class="annual-evolution">'+characters+'</div></section>'
 +'<section class="annual-next panel"><div><div class="eyebrow">PRÓXIMO MANDATO</div><h2>'+esc(chosen.nextMandate)+'</h2><p>Objetivo de renombre: <b>'+esc(chosen.target)+'</b> · '+esc(chosen.rank)+'</p></div><div><div class="eyebrow">EN LAS CRÓNICAS</div><div class="annual-chapter-links">'+links+'</div></div></section>';
}

function main(){if(state.section==='annual')return annualArchive();if(state.section==='home')return home();if(state.section==='saga')return state.reader?reader():saga();if(state.section==='heroes')return state.hero?heroDetail():heroes();if(state.section==='patrols')return patrols();if(state.section==='bonds')return bonds();if(state.section==='legacy')return legacy();if(state.section==='archive')return archive();if(state.section==='studio')return studio();return home()}
function render(){document.documentElement.style.setProperty('--fontmult',state.font);document.body.classList.toggle('reading-night',state.light);navs();document.querySelectorAll('.crest-icon').forEach(el=>el.src=ART.crest);let crumb={home:'Portada',saga:state.reader?'Leyendo el libro':'Crónicas',heroes:state.hero?'Biografía':'Aventureros',patrols:'Patrullas',bonds:'Los lazos',legacy:'Leyendas',annual:'Resumen anual',archive:'El archivo',studio:'El Escritorio'}[state.section]||'Portada';document.getElementById('breadcrumbs').textContent=BOOK.meta.guild+' · '+crumb;document.getElementById('content').innerHTML=main();restoreStudioDraft();document.getElementById('footer').innerHTML=`<span>Archivo literario privado · ${esc(BOOK.meta.guild)} · Edición ${esc(BOOK.editions.at(-1).id)}</span><span>Juego: Dungeons & Dynasties · Libro ilustrado no oficial</span>`;applyNight()}
function applyNight(){let style=document.getElementById('nightOverride');if(!style){style=document.createElement('style');style.id='nightOverride';document.head.appendChild(style)}style.textContent=state.light?`
body.reading-night .main{background:#162b29;background-image:radial-gradient(circle at top left,#24433c,transparent 54%),linear-gradient(#19342f,#102925);}
body.reading-night .section-title,body.reading-night .section-heading-row h2,body.reading-night .panel h3,body.reading-night .chapter-tile h3,body.reading-night .hero-card h3,body.reading-night .detail-head h2,body.reading-night .oath-panel h2{color:#f3dfb8;text-shadow:none}
body.reading-night .eyebrow{color:#deb677}body.reading-night .section-subtitle,body.reading-night .hero-card p,body.reading-night .chapter-tile p,body.reading-night .quiet-event p{color:#c3b398}
body.reading-night .panel,body.reading-night .chapter-tile,body.reading-night .hero-card,body.reading-night .stat,body.reading-night .reader,body.reading-night .atlas-details,body.reading-night .bond-card,body.reading-night .empty-state{background:#243b35;background-image:radial-gradient(circle at top left,#39574a,#223b35 85%);border-color:#a78a5a;color:#ecdabc}
body.reading-night .stat strong,body.reading-night .latest-card b{color:#f5d28c}body.reading-night .stat small,body.reading-night .latest-card span,body.reading-night .hero-card footer{color:#ddc79e}
body.reading-night .section-head{border-color:#ac8b53}body.reading-night .hero-card main{background:linear-gradient(#29473d,#1c342f)}
body.reading-night .hero-card .overline,body.reading-night .chapter-tile .eyebrow{color:#e1b677}
body.reading-night .reader-hero{background:linear-gradient(140deg,#345149,#203b34)}body.reading-night .reader-hero h2{color:#ffedc6}body.reading-night .reader-hero p{color:#d9c6a4}
body.reading-night .prose p,body.reading-night .prose p.narration,body.reading-night .prose .dialogue-entry p.dialogue-text{color:#f3e4c9}
body.reading-night .dialogue-entry .dialogue-speaker{color:#e5b777}body.reading-night .reading-settings{border-color:#7a745c}body.reading-night .reading-settings .setting-hint{color:#d7c6a9}
body.reading-night .reader-tools{background:#243e35;border-top-color:#a88b5f}body.reading-night .reader-tools .small-controls{color:#ebd9b8}
body.reading-night .fact-note{background:#30423a;color:#f2dfbc;border-color:#987b50}body.reading-night .fact-note p,body.reading-night .fact-note li{color:#e5d2b2}
body.reading-night .topbar{background:linear-gradient(90deg,#1a3d38,#102c2d)}body.reading-night .featured-card{background:#294139;color:#ebd6b6;border-color:#b19059}
body.reading-night .featured-card-body{background:#294239}body.reading-night .featured-card-body strong{color:#f3ddb5}body.reading-night .featured-card-body em{color:#c7b697}body.reading-night .featured-card-body small{color:#e6b27b}
body.reading-night .founder-note{background:#30473c;border-color:#9f8657;color:#f0dbbb}body.reading-night .notice{background:#294338;color:#efdabb;border-color:#b58e4f}body.reading-night .searchbox,body.reading-night .filter,body.reading-night .atlas-select{background:#30473c;color:#f2debd;border-color:#9f8657}
body.reading-night .searchbox input{color:#f0dbbb}body.reading-night .filter.active{background:#a37738;color:#21180b}
body.reading-night .footer{color:#d8bf91}body.reading-night .maestre-codex{background:#233f37;border-color:#a4875a}body.reading-night .maestre-codex h2{color:#f3deb8}body.reading-night .maestre-codex p{color:#d1bf9e}
body.reading-night .atlas-panel{background:#2c4439;color:#eedbb8}body.reading-night .atlas-canvas{background:radial-gradient(circle,#e6d1a9,#bfa57e)}
`:''}
document.addEventListener('click',ev=>{const annualYear=ev.target.closest('[data-year]');if(annualYear){state.annualYear=Number(annualYear.getAttribute('data-year'));render();return;}const x=ev.target.closest('[data-open-bond],[data-nav],[data-chapter],[data-hero],[data-filter],[data-era],[data-action],[data-bondfocus],[data-bondtype],[data-bondview],[data-rel-detail]');if(!x)return;
 if(x.hasAttribute('data-rel-detail')){openRelationDetail(x.getAttribute('data-rel-detail'),x);return}
 if(x.getAttribute('data-action')==='close-relation'){closeRelationDetail();return}
 if(x.hasAttribute('data-open-bond')){state.bond=x.getAttribute('data-open-bond');state.bondType='all';state.reader=false;state.hero=null;go('bonds');return}
 if(x.hasAttribute('data-bondfocus')){state.bond=x.getAttribute('data-bondfocus');state.bondType='all';render();return}
 if(x.hasAttribute('data-bondview')){state.bondView=x.getAttribute('data-bondview');state.bondType='all';render();return}
 if(x.hasAttribute('data-bondtype')){state.bondType=x.getAttribute('data-bondtype');render();return}
 if(x.hasAttribute('data-nav')){state.reader=false;state.hero=null;go(x.getAttribute('data-nav'));return}
 if(x.hasAttribute('data-chapter')){state.reader=true;state.hero=null;go('saga',{chapter:+x.getAttribute('data-chapter')});return}
 if(x.hasAttribute('data-hero')){if(state.section==='saga'&&state.reader){state.returnToReader={chapter:state.chapter,scroll:window.scrollY}}else if(state.section!=='heroes'){state.returnToReader=null}state.reader=false;go('heroes',{hero:x.getAttribute('data-hero')});return}
 if(x.hasAttribute('data-filter')){state.filter=x.getAttribute('data-filter');render();return}
 if(x.hasAttribute('data-era')){state.era=x.getAttribute('data-era');render();return}
 let act=x.getAttribute('data-action');if(act==='toggle-menu'){toggleMobileMenu();return}if(act==='scroll-cards-left'||act==='scroll-cards-right'){document.getElementById('featuredRail')?.scrollBy({left:act==='scroll-cards-left'?-480:480,behavior:'smooth'});return}if(act==='read-last'){if(!BOOK.chapters.length)return;state.reader=true;go('saga',{chapter:state.chapter});return}
 if(act==='back-saga'){state.reader=false;go('saga');return}
 if(act==='back-heroes'){state.hero=null;state.returnToReader=null;go('heroes');return}
 if(act==='back-reading'&&state.returnToReader){const last=state.returnToReader;state.returnToReader=null;state.reader=true;go('saga',{chapter:last.chapter});window.scrollTo({top:last.scroll,behavior:'instant'});return}
 if(act==='toggle-portraits'){const anchor=window.scrollY;state.portraits=!state.portraits;savePrefs();render();window.scrollTo({top:anchor,behavior:'instant'});return}
 if(act==='font-up'){state.font=Math.min(1.35,Math.round((state.font+.1)*100)/100);savePrefs();render();return}
 if(act==='font-down'){state.font=Math.max(.85,Math.round((state.font-.1)*100)/100);savePrefs();render();return}
 if(act==='theme'){state.light=!state.light;savePrefs();render();return}
 if(act==='download-update-json'){
  saveStudioDraft();const value=JSON.stringify(updateRequestPacket(),null,2);
  const blob=new Blob([value],{type:'application/json;charset=utf-8'});
  const href=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=href;anchor.download='La_Corona_de_Barro_Encargo_Actualizacion.json';document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(href),5000);
  const status=document.getElementById('studioStatus');if(status)status.textContent='JSON generado. Envíalo junto al JSON nuevo del juego; no hace falta subir ningún ZIP.';return}
 if(act==='copy-update-json'||act==='copy-editorial-prompt'){
  saveStudioDraft();const value=act==='copy-editorial-prompt'?NARRATIVE_ENGINE.prompt:JSON.stringify(updateRequestPacket(),null,2);
  const status=document.getElementById('studioStatus');
  (async()=>{let ok=false;try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);ok=true}}catch(e){}
    if(!ok){try{const el=document.createElement('textarea');el.value=value;el.style.position='fixed';el.style.left='-10000px';document.body.appendChild(el);el.select();ok=!!document.execCommand('copy');el.remove()}catch(e){}}
    if(status)status.textContent=ok?'Copiado. Pégalo en nuestra conversación junto al JSON nuevo del juego.':'El portapapeles está bloqueado. Usa «Descargar JSON del encargo».';
  })();return}
 if(act==='print'){window.print();return}
});
document.addEventListener('change',ev=>{if(studioControlIds.includes(ev.target.id))saveStudioDraft()});
document.addEventListener('input',ev=>{if(studioControlIds.includes(ev.target.id))saveStudioDraft();if(ev.target.id==='heroSearch'){state.search=ev.target.value;const q=state.search.toLocaleLowerCase('es').trim();let list=BOOK.characters.filter(c=>(state.filter==='all'||(state.filter==='activos'&&!isFallen(c)&&c.status!=='retirada'&&c.status!=='vendida')||(state.filter==='caidos'&&isFallen(c))||(state.filter==='salidos'&&(c.status==='vendida'||c.status==='retirada'))||(state.filter==='fundadores'&&!c.aspirant)||(state.filter==='aspirantes'&&c.aspirant)||state.filter===c.role)&&(!q||[c.name,c.epithet,c.classLabel,c.race,c.blurb,c.origin].join(' ').toLowerCase().includes(q)));let grid=document.querySelector('.hero-grid');if(grid)grid.innerHTML=list.map(heroCard).join('');}});
document.addEventListener('change',ev=>{if(ev.target.id==='bondSelect'){state.bond=ev.target.value;render()}});
document.addEventListener('keydown',ev=>{if(state.reader&&state.section==='saga'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){if(ev.key==='ArrowRight'&&state.chapter<BOOK.chapters.length-1){go('saga',{chapter:state.chapter+1})}if(ev.key==='ArrowLeft'&&state.chapter>0){go('saga',{chapter:state.chapter-1})}}});
render();
})();