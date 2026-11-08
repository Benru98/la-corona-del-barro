import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.BASE_URL||'http://127.0.0.1:8765/';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const sections=['home','saga','heroes','patrols','bonds','legacy','annual','archive','studio'];
const notes=[];
async function audit(page,kind){
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const res=await page.goto(base,{waitUntil:'networkidle',timeout:45000});
 assert.equal(res.status(),200,kind+' HTTP');
 await page.locator('#content').waitFor({state:'visible'});
 const summary=await page.locator('#sideEdition').innerText();
 assert.ok(summary.includes('E0029'),kind+' no muestra la edición E0029: '+summary);
 for(const section of sections){
   await page.locator('#sideNav [data-nav="'+section+'"]').click();
   const text=await page.locator('#content').innerText();
   assert.ok(text.trim().length>60,kind+' '+section+' vacía');
   const broken=await page.locator('#content img[src]').evaluateAll(async images=>{
     const urls=[...new Set(images.map(i=>i.currentSrc||i.src).filter(Boolean))];
     return (await Promise.all(urls.map(async url=>{
       try {const r=await fetch(url); return r.ok&&r.headers.get('content-type')?.startsWith('image/')?null:url+' HTTP '+r.status;}
       catch(e){return url+': '+String(e)}
     }))).filter(Boolean);
   });
   assert.deepEqual(broken,[],kind+' imágenes rotas en '+section);
 }
 assert.deepEqual(errors,[],kind+' errores JavaScript');
 await page.locator('#sideNav [data-nav="home"]').click();
 assert.equal(await page.locator('.new-era-home').count(),1,'Falta la portada del Año II');
 assert.ok((await page.locator('.new-era-home').innerText()).includes('Frontera'));
 assert.equal(await page.locator('.home-memorial').count(),1,'Brugo debe seguir en el memorial');
 assert.equal(await page.locator('.featured-card.is-fallen').count(),1,'Falta el retrato memorial');
 await page.locator('#sideNav [data-nav="heroes"]').click();
 assert.equal(await page.locator('.hero-card').count(),13,'El archivo debe incluir 11 vivos, Brugo y Turca');
 assert.ok((await page.locator('#content').innerText()).includes('Grosco del Puño de Piedra'));
 await page.locator('.hero-card[data-hero="adv_3yrkzbvzvfzu"]').click();
 const groscoText=await page.locator('#content').innerText();
 assert.ok(groscoText.includes('VALORACIÓN DE INGRESO')&&groscoText.includes('68')&&groscoText.includes('HABILIDAD ACTUAL (CA)')&&groscoText.includes('118'),'Grosco no muestra puntuaciones correctas');
 await page.locator('[data-action="back-heroes"]').click();
 await page.locator('.hero-card[data-hero="adv_efelp4o01ks4"]').click();
 assert.ok((await page.locator('#content').innerText()).includes('Iligar el Rompehuesos'),'No abre ficha de Iligar');
 await page.locator('#sideNav [data-nav="patrols"]').click();
 assert.equal(await page.locator('.patrol-row').count(),11,'Patrullas incompletas: han de aparecer los 11 miembros vivos');
 assert.equal(await page.locator('.patrol-row.patrol-away').count(),4,'Deben figurar cuatro compañeros en Cindermoor');
 const patrolText=await page.locator('#content').innerText();
 assert.ok(patrolText.includes('154')&&patrolText.includes('Grosco'));
 assert.ok(!patrolText.includes('Brugo'),'Un fallecido no puede aparecer en patrullas');
 await page.locator('#sideNav [data-nav="annual"]').click();
 assert.ok((await page.locator('#content').innerText()).includes('El año que hicimos casa'),'Falta el cierre anual');
 await page.locator('#sideNav [data-nav="archive"]').click();
 const archive=await page.locator('#content').innerText();
 assert.ok(archive.includes('Frontera')&&archive.includes('226'),'Archivo desactualizado');
 assert.ok(archive.toLocaleLowerCase('es').includes('retratos asignados')&&archive.toLocaleLowerCase('es').includes('récords revisados'),'Falta la auditoría del guardado v26');
 assert.ok(archive.includes('Cado Feroz')&&archive.includes('Tumba Inviolable'),'Tablón no sincronizado');
 await page.locator('#sideNav [data-nav="legacy"]').click();
 assert.equal(await page.locator('.memorial-person').count(),1,'Brugo perdió su memorial');
 await page.locator('#sideNav [data-nav="saga"]').click();
 const latest=page.locator('.chronicle-feature [data-chapter]');
 assert.equal(await latest.count(),1,'Falta botón de última crónica');
 await latest.click();
 assert.equal((await page.locator('.reader-hero h2').innerText()).trim(),'Las piedras saben escuchar');
 assert.ok(await page.locator('.prose .dialogue-entry').count()>=20,'Interludio XXIII sin diálogos');
 notes.push({kind,sections:sections.length,edition:summary,patrols:11,expedition:4,latest:'Las piedras saben escuchar',errors:0});
}
try{
 const desktop=await browser.newPage({viewport:{width:1440,height:900}});
 await audit(desktop,'desktop');
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const res=await mobile.goto(base,{waitUntil:'networkidle',timeout:45000});
 assert.equal(res.status(),200,'mobile HTTP');
 await mobile.locator('.mobile-menu-button').click();
 assert.equal(await mobile.locator('#mobileDrawer').getAttribute('aria-hidden'),'false','Menú móvil no abre');
 await mobile.locator('.drawer-close').click();
 assert.equal(await mobile.locator('#mobileDrawer').getAttribute('aria-hidden'),'true','Menú móvil no cierra');
 assert.ok((await mobile.locator('#content').innerText()).length>60,'Portada móvil vacía');
 await mobile.locator('#mobileNav [data-nav="saga"]').click();
 await mobile.locator('.chronicle-feature [data-chapter]').click();
 const overflow=await mobile.locator('.reading').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
 assert.ok(overflow.scroll<=overflow.client+3,'Desbordamiento horizontal de crónica móvil');
 notes.push({kind:'mobile',menu:'ok',overflow});
 console.log(JSON.stringify({ok:true,base,notes},null,2));
} finally {await browser.close();}
