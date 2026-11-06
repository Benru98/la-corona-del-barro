import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.BASE_URL || 'http://127.0.0.1:8765/';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const sections=['home','saga','heroes','patrols','bonds','legacy','archive','studio'];
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
   assert.match(cover.src,/corona-grupal-v2\.webp$/,'Debe aparecer la portada panorámica V2');
   assert.ok(cover.naturalWidth>1000,'La portada no se ha cargado');
   assert.equal(cover.fit,'contain','La portada no debe recortarse');
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
   await desktop.locator('.chapter-tile').last().click();
   const novel=await desktop.locator('.reading').innerText();
   assert.equal((await desktop.locator('.reader-hero h2').innerText()).trim(),'La medida de una victoria','Capítulo V ausente del lector');
   assert.ok(novel.includes('Belzar')&&novel.includes('Jaro'),'Faltan protagonistas del capítulo V');
   assert.ok(await desktop.locator('.prose .dialogue-entry').count()>=40,'Faltan diálogos del capítulo V');
   const sources=await desktop.locator('.prose .dialogue-entry img').evaluateAll(
     nodes=>[...new Set(nodes.map(n=>n.getAttribute('src')).filter(Boolean))]);
   assert.ok(sources.some(x=>x.includes('-v2-')),'La narración no utiliza ninguna variante visual aprobada');
   for(const src of sources)assert.equal((await desktop.request.get(new URL(src,base).href)).status(),200,'Retrato del capítulo V ausente: '+src);
   console.log('Capítulo V:',JSON.stringify({dialogues:await desktop.locator('.prose .dialogue-entry').count(),uniqueImages:sources.length,contextualVariants:sources.filter(x=>x.includes('-v2-')).length}));

 }
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await mobile.goto(base,{waitUntil:'networkidle',timeout:30000});
 await mobile.locator('.mobile-menu-button').click();
 assert.equal(await mobile.locator('#mobileDrawer').getAttribute('aria-hidden'),'false','Menú móvil no abre');
 await mobile.locator('.drawer-close').click();
 assert.equal(await mobile.locator('#mobileDrawer').getAttribute('aria-hidden'),'true','Menú móvil no cierra');
 assert.ok((await mobile.locator('#content').innerText()).length>60);
 if(!base.includes('pages.dev')){
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
