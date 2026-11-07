import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.BASE_URL || 'http://127.0.0.1:8765/';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const sections=['home','saga','heroes','patrols','bonds','legacy','annual','archive','studio'];
let visited=0,images=0;
const findings=[];
async function inspectPage(page,label){
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(base,{waitUntil:'networkidle',timeout:30000});
  assert.equal(response.status(),200,label+' respuesta HTTP');
  await page.locator('#content').waitFor({state:'visible'});
  for(const section of sections){
    const nav=page.locator('#sideNav [data-nav="'+section+'"]');
    await nav.click();
    await page.waitForTimeout(100);
    const content=await page.locator('#content').innerText();
    assert.ok(content.trim().length>60,label+' sección vacía: '+section);
    const broken=await page.locator('img').evaluateAll(async images=>{
      const paths=[...new Set(images.map(i=>i.currentSrc||i.src).filter(Boolean))];
      return (await Promise.all(paths.map(async src=>{
        try{const result=await fetch(src);return {src,status:result.status,ok:result.ok,type:result.headers.get('content-type')};}
        catch(e){return {src,ok:false,error:String(e)}}
      }))).filter(x=>!x.ok || (!x.type?.startsWith('image/') && !x.src.startsWith('data:')));
    });
    assert.deepEqual(broken,[],label+' imágenes rotas en '+section);
    images+=await page.locator('img[src]').count();
    visited++;
  }
  assert.deepEqual(errors,[],label+' errores JS en navegador');
  findings.push({label,sections:sections.length,imagesChecked:images,errors:errors.length});
}
try{
 const desktop=await browser.newPage({viewport:{width:1440,height:900}});
 await inspectPage(desktop,'desktop');
 await desktop.locator('#sideNav [data-nav="saga"]').click();
 const chapters=await desktop.evaluate(()=>BOOK.chapters.map(c=>c.id));
 assert.ok(chapters.length>=4,'Se han perdido capítulos');
 const art=await desktop.evaluate(()=>Object.values(ART));
 assert.ok(art.length>=17,'Se han perdido recursos aprobados');
 for(const asset of art){
   const result=await desktop.request.get(new URL(asset,base).href);
   assert.equal(result.status(),200,'Imagen ausente: '+asset);
 }

 if(!base.includes('pages.dev')){
   // La prueba de la nueva versión se hace contra el código de la PR; la URL pública
   // puede seguir mostrando la edición anterior hasta que se fusione.
   await desktop.locator('#sideNav [data-nav="home"]').click();
   const cover=await desktop.locator('.cover-fullbleed .cover-art').evaluate(img=>({
     src:img.currentSrc,naturalWidth:img.naturalWidth,fit:getComputedStyle(img).objectFit
   }));
   assert.match(cover.src,/portada-casa\.webp$/,'Debe aparecer la nueva portada institucional de la Casa');
   assert.ok(cover.naturalWidth>1000,'La portada no se ha cargado');
   assert.equal(cover.fit,'contain','La portada no debe recortarse');
   const coverAlt=await desktop.locator('.cover-fullbleed .cover-art').getAttribute('alt');
   assert.ok(coverAlt.includes('sin personajes concretos'),'La portada debe describir la nueva imagen institucional');
   const artCatalog=await desktop.evaluate(()=>ART_CATALOG.items);
   assert.ok(artCatalog.some(x=>x.id==='cover-group'&&x.src==='portada-casa.webp'),'El catálogo no apunta a la portada institucional');
   assert.ok(artCatalog.some(x=>x.id==='cover-group-v2-historical'&&x.src==='corona-grupal-v2.webp'),'Se ha perdido el mural de los fundadores');
   assert.ok(artCatalog.some(x=>x.id==='portrait-adv_efelp4o01ks4'&&x.status==='approved'&&x.characterId==='adv_efelp4o01ks4'),'Retrato oficial de Iligar sin aprobar');
   assert.equal((await desktop.request.get(new URL('iligar-rompehuesos.webp',base).href)).status(),200,'Retrato del paladín ausente');
   await desktop.locator('#sideNav [data-nav="saga"]').click();
   await desktop.locator('.chapter-tile').first().click();
   const cards=desktop.locator('.prose .dialogue-entry');
   assert.ok(await cards.count()>=2,'No se muestran diálogos ilustrados');
   const portraits=await cards.evaluateAll(nodes=>nodes.map(node=>{
     const image=node.querySelector('.dialogue-avatar img');
     const frame=node.querySelector('.dialogue-avatar');
     const r=frame.getBoundingClientRect();
     return {width:r.width,height:r.height,brief:node.classList.contains('dialogue-entry-brief'),
       master:node.dataset.speaker==='guildmaster',
       src:image.currentSrc,fit:getComputedStyle(image).objectFit,naturalWidth:image.naturalWidth};
   }));
   assert.ok(portraits.some(p=>!p.brief&&p.width>=100),'Retratos principales demasiado pequeños');
   assert.ok(portraits.some(p=>p.brief&&p.width>=76),'Retratos cortos demasiado pequeños');
   assert.ok(portraits.filter(p=>!p.master).every(p=>p.fit==='contain'),'Retratos de aventureros recortados');
   // Las imágenes fuera de la pantalla usan loading=lazy: solo exigimos decodificar
   // la primera imagen después de desplazarla a la zona visible.
   const firstImage=desktop.locator('.prose .dialogue-entry img').first();
   await firstImage.scrollIntoViewIfNeeded();
   const firstLoaded=await firstImage.evaluate(async img=>{await img.decode();return img.naturalWidth>0;});
   assert.ok(firstLoaded,'El primer retrato no se pudo cargar');
   console.log('Diálogos de escritorio:',JSON.stringify({count:portraits.length,regular:portraits.find(p=>!p.brief),brief:portraits.find(p=>p.brief)}));
   // Nueva crónica de la actualización real: comprobar contenido y retratos contextuales.
   await desktop.locator('#sideNav [data-nav="saga"]').click();
   await desktop.locator('.chapter-tile').nth(4).click();
   const novel=await desktop.locator('.reading').innerText();
   assert.equal((await desktop.locator('.reader-hero h2').innerText()).trim(),'La medida de una victoria','Capítulo V ausente del lector');
   assert.ok(novel.includes('Belzar')&&novel.includes('Jaro'),'Faltan protagonistas del capítulo V');
   assert.ok(await desktop.locator('.prose .dialogue-entry').count()>=40,'Faltan diálogos del capítulo V');
   const sources=await desktop.locator('.prose .dialogue-entry img').evaluateAll(
     nodes=>[...new Set(nodes.map(n=>n.getAttribute('src')).filter(Boolean))]);
   assert.ok(sources.some(x=>x.includes('-v2-')),'La narración no utiliza ninguna variante visual aprobada');
   for(const src of sources)assert.equal((await desktop.request.get(new URL(src,base).href)).status(),200,'Retrato del capítulo V ausente: '+src);
   console.log('Capítulo V:',JSON.stringify({dialogues:await desktop.locator('.prose .dialogue-entry').count(),uniqueImages:sources.length,contextualVariants:sources.filter(x=>x.includes('-v2-')).length}));
   await desktop.locator('#sideNav [data-nav="saga"]').click();
   await desktop.locator('.chapter-tile').nth(5).click();
   assert.equal((await desktop.locator('.reader-hero h2').innerText()).trim(),'Lo que no regresó de Ashfall','Capítulo VI no cargado');
   assert.ok((await desktop.locator('.reading').innerText()).includes('Enterraron a Brugo'),'El entierro de Brugo no figura en la crónica');
   assert.ok(await desktop.locator('.prose .dialogue-entry').count()>=20,'Faltan diálogos del capítulo VI');
   await desktop.locator('#sideNav [data-nav="saga"]').click();
   await desktop.locator('.chapter-tile').nth(6).click();
   assert.equal((await desktop.locator('.reader-hero h2').innerText()).trim(),'La grieta y la guardia','Capítulo VII no cargado');
   assert.ok((await desktop.locator('.reading').innerText()).includes('Catacumba Inviolable'),'Falta la Catacumba en el capítulo VII');
   assert.ok(await desktop.locator('.prose .dialogue-entry').count()>=18,'Faltan diálogos del capítulo VII');
   await desktop.locator('#sideNav [data-nav="saga"]').click();
   await desktop.locator('.chapter-tile').nth(7).click();
   assert.equal((await desktop.locator('.reader-hero h2').innerText()).trim(),'La mano que no se aparta','Interludio VIII no cargado');
   const newProse=await desktop.locator('.reading').innerText();
   assert.ok(newProse.includes('Ulf')&&newProse.includes('Xara'),'Falta la relación central del interludio');
   assert.ok(await desktop.locator('.prose .dialogue-entry').count()>=30,'Faltan intervenciones retratadas en el interludio');
   await desktop.locator('#sideNav [data-nav="saga"]').click();
   await desktop.locator('.chapter-tile').nth(8).click();
   assert.equal((await desktop.locator('.reader-hero h2').innerText()).trim(),'La voz que no se llevaron','Interludio IX ausente');
   assert.ok(await desktop.locator('.prose .dialogue-entry').count()>=20,'Faltan las voces en el interludio IX');
   await desktop.locator('#sideNav [data-nav="saga"]').click();
   await desktop.locator('.chapter-tile').nth(9).click();
   assert.equal((await desktop.locator('.reader-hero h2').innerText()).trim(),'El juramento fresco','Interludio X ausente');
   assert.ok(await desktop.locator('.prose .dialogue-entry').count()>=30,'Faltan las voces en el interludio X');
   const iligarImages=await desktop.locator('.prose .dialogue-entry[data-speaker="adv_efelp4o01ks4"] img').count();
   assert.ok(iligarImages>=1,'Los diálogos de Iligar deben mostrar su retrato');
   // Corrección UI: la tarjeta abre notas completas y el diálogo responde a ESC y cierre.
   await desktop.locator('#sideNav [data-nav="home"]').click();
   assert.equal(await desktop.locator('.chapter-peek .latest-icon').count(),0,'Quedan mini-portadas decorativas sin ilustración');
   assert.equal(await desktop.locator('.chapter-peek .latest-card').count(),Math.min(5,chapters.length),'Las cinco crónicas más recientes no aparecen en portada');
   await desktop.locator('#sideNav [data-nav="bonds"]').click();
   const relRow=desktop.locator('.rel-simple-row[data-rel-detail]').first();
   assert.ok(await relRow.count(),'Faltan tarjetas de vínculos');
   const relExcerpt=(await relRow.locator('.rel-simple-main p').first().textContent()).trim();
   await relRow.locator('.rel-simple-track').click();
   const relDialog=desktop.locator('#relationDetailDialog');
   assert.ok(await relDialog.evaluate(el=>el.open),'No se abre el diálogo al pulsar la tarjeta');
   assert.ok((await relDialog.innerText()).includes(relExcerpt),'El diálogo debe conservar el texto completo');
   assert.notEqual(await relDialog.locator('.relation-dialog-prose').first().evaluate(el=>getComputedStyle(el).webkitLineClamp),'2','El texto del diálogo sigue truncado');
   await desktop.keyboard.press('Escape');
   assert.ok(!(await relDialog.evaluate(el=>el.open)),'ESC no cierra el diálogo');
   await relRow.locator('.rel-open-detail').click();
   assert.ok(await relDialog.evaluate(el=>el.open),'El botón Leer relación completa no abre el diálogo');
   await relDialog.locator('[data-action="close-relation"]').first().click();
   assert.ok(!(await relDialog.evaluate(el=>el.open)),'La X no cierra el diálogo');
   // Primera muerte registrada: portada, memorial, ficha y patrullas deben coincidir.
   await desktop.locator('#sideNav [data-nav="home"]').click();
   assert.equal(await desktop.locator('.home-memorial').count(),1,'No aparece la noticia de duelo en portada');
   assert.ok((await desktop.locator('.home-memorial').innerText()).includes('Brugo'));
   assert.equal(await desktop.locator('.featured-card.is-fallen').count(),1,'Retrato sin marca de caído en portada');
   await desktop.locator('#sideNav [data-nav="legacy"]').click();
   assert.equal(await desktop.locator('.memorial-person').count(),1,'Memorial no actualizado');
   assert.ok((await desktop.locator('.legacy-opening').innerText()).includes('ausencias'));
   assert.ok((await desktop.locator('.memorial-person').innerText()).includes('Brugo'));
   assert.ok((await desktop.locator('.memorial-person').textContent()).includes('Velasco'),'El homenaje editorial debe identificar a Velasco');
   await desktop.locator('.memorial-person [data-hero]').click();
   assert.equal(await desktop.locator('.death-biography').count(),1,'La ficha no refleja la muerte');
   assert.ok((await desktop.locator('.death-biography').innerText()).includes('día 34'));
   assert.ok((await desktop.locator('.death-biography').innerText()).includes('literaria'));
   assert.ok((await desktop.locator('.founder-note').innerText()).includes('recibir golpes'),'Nota original de Brugo ausente');
   await desktop.locator('#sideNav [data-nav="heroes"]').click();
   await desktop.locator('[data-filter="caidos"]').click();
   assert.equal(await desktop.locator('.hero-card.is-fallen').count(),1,'Filtro de caídos incorrecto');
   await desktop.locator('[data-filter="all"]').click();
   const iligarCard=desktop.locator('[data-hero="adv_efelp4o01ks4"]').first();
   assert.ok(await iligarCard.count(),'Iligar no aparece en la galería');
   await iligarCard.click();
   assert.ok((await desktop.locator('#content').innerText()).includes('Una Tumba que Responder'),'Falta su voto en la ficha');
   assert.ok((await desktop.locator('.founder-note').innerText()).includes('honorable'),'Falta la nota literal sobre Iligar');
   await desktop.locator('#sideNav [data-nav="saga"]').click();
   const extraTitles=['Los nombres de Huesolinde','La tumba y el camino','Nadie vuelve invicto','La Casa que sigue'];
   for(let i=0;i<extraTitles.length;i++){
     await desktop.locator('.chapter-tile').nth(10+i).click();
     assert.equal((await desktop.locator('.reader-hero h2').innerText()).trim(),extraTitles[i]);
     assert.ok(await desktop.locator('.prose .dialogue-entry').count()>=25,'Faltan diálogos en '+extraTitles[i]);
     await desktop.locator('#sideNav [data-nav="saga"]').click();
   }
   await desktop.locator('#sideNav [data-nav="heroes"]').click();
   await desktop.locator('#sideNav [data-nav="patrols"]').click();
   assert.equal(await desktop.locator('.patrol-row').count(),11,'El Año II tiene once miembros vivos asignados a patrullas');
    assert.equal(await desktop.locator('.patrol-row.patrol-away').count(),4,'Los cuatro aventureros en Cindermoor deben permanecer visibles');
    assert.ok((await desktop.locator('#content').innerText()).includes('154'),'Falta el día de regreso previsto para la expedición');
   assert.ok(!(await desktop.locator('.patrol-row .patrol-name strong').allTextContents()).includes('Brugo'),'Brugo no puede figurar en patrulla');
   await desktop.locator('#sideNav [data-nav="archive"]').click();
   const archiveNow=await desktop.locator('#content').innerText();
   assert.ok(archiveNow.includes('226'),'El archivo no refleja el renombre vigente del Año II');
    assert.ok(archiveNow.includes('Frontera'),'El archivo sigue enseñando Villorrio como liga actual');
   assert.ok(archiveNow.includes('1 caído'),'El archivo no refleja la baja');
   assert.ok(!archiveNow.includes('6 / 6 · ninguna muerte'),'Aún se muestran cifras históricas como actuales');
   console.log('Memorial, fichas, patrullas y archivo: sincronizados con el Año II, día visible 150');


 }
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await mobile.goto(base,{waitUntil:'networkidle',timeout:30000});
 await mobile.locator('.mobile-menu-button').click();
 assert.equal(await mobile.locator('#mobileDrawer').getAttribute('aria-hidden'),'false','Menú móvil no abre');
 await mobile.locator('.drawer-close').click();
 assert.equal(await mobile.locator('#mobileDrawer').getAttribute('aria-hidden'),'true','Menú móvil no cierra');
 assert.ok((await mobile.locator('#content').innerText()).length>60);
 if(!base.includes('pages.dev')){
   await mobile.evaluate(()=>document.querySelector('#sideNav [data-nav="bonds"]').click());
   await mobile.locator('.rel-simple-row .rel-open-detail').first().click();
   const mobileRel=mobile.locator('#relationDetailDialog');
   assert.ok(await mobileRel.evaluate(el=>el.open),'La relación no se abre en móvil');
   const dialogSizing=await mobileRel.evaluate(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,vw:innerWidth,vh:innerHeight}));
   assert.ok(dialogSizing.w<=dialogSizing.vw&&dialogSizing.h<=dialogSizing.vh,'El diálogo sobresale de la pantalla móvil');
   await mobileRel.locator('[data-action="close-relation"]').first().click();
   await mobile.evaluate(()=>document.querySelector('#sideNav [data-nav="saga"]').click());
   await mobile.locator('.chapter-tile').first().click();
   const portraits=await mobile.locator('.prose .dialogue-entry').evaluateAll(nodes=>nodes.map(n=>{
     const a=n.querySelector('.dialogue-avatar'),r=a.getBoundingClientRect();
     return {width:r.width,height:r.height,brief:n.classList.contains('dialogue-entry-brief')};
   }));
   assert.ok(portraits.some(p=>p.width>=64),'Retratos móviles demasiado pequeños');
   const overflow=await mobile.locator('.reading').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
   assert.ok(overflow.scroll<=overflow.client+3,'Desbordamiento horizontal de la lectura móvil');
   console.log('Diálogos móviles:',JSON.stringify({count:portraits.length,overflow}));
 }

 console.log(JSON.stringify({ok:true,findings,chapters:chapters.length,artResources:art.length,mobileMenu:'OK'},null,2));
}finally{await browser.close()}
