import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.BASE_URL || 'http://127.0.0.1:8765/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
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
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await mobile.goto(base,{waitUntil:'networkidle',timeout:30000});
 await mobile.locator('.mobile-menu-button').click();
 assert.equal(await mobile.locator('#mobileDrawer').getAttribute('aria-hidden'),'false','Menú móvil no abre');
 await mobile.locator('.drawer-close').click();
 assert.equal(await mobile.locator('#mobileDrawer').getAttribute('aria-hidden'),'true','Menú móvil no cierra');
 assert.ok((await mobile.locator('#content').innerText()).length>60);
 console.log(JSON.stringify({ok:true,findings,chapters:chapters.length,artResources:art.length,mobileMenu:'OK'},null,2));
}finally{await browser.close()}
