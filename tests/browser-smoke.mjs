import fs from 'node:fs';
import vm from 'node:vm';
const campaign=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../data/campaign.js',import.meta.url),'utf8'),campaign,{timeout:10000});
const expectedEdition=vm.runInContext('BOOK.editions.at(-1).id',campaign);
const sourceBook=JSON.parse(vm.runInContext('JSON.stringify(BOOK)',campaign));
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
 assert.ok(summary.includes(expectedEdition),kind+' no muestra la edición '+expectedEdition+': '+summary);
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
 assert.ok((await page.locator('.new-era-home').innerText()).includes(sourceBook.world.division));
 assert.equal(await page.locator('.home-memorial').count(),1,'Brugo debe seguir en el memorial');
 assert.equal(await page.locator('.featured-card.is-fallen').count(),1,'Falta el retrato memorial');
 await page.locator('#sideNav [data-nav="heroes"]').click();
 assert.equal(await page.locator('.hero-card').count(),sourceBook.characters.length,'El archivo debe incluir todos los personajes canónicos');
 assert.ok((await page.locator('#content').innerText()).includes('Grosco del Puño de Piedra'));
 await page.locator('.hero-card[data-hero="adv_3yrkzbvzvfzu"]').click();
 const groscoText=await page.locator('#content').innerText();
 const grosco=sourceBook.characters.find(c=>c.id==='adv_3yrkzbvzvfzu');
 assert.ok(groscoText.includes('VALORACIÓN DE INGRESO')&&groscoText.includes(String(grosco.ratingAtJoin))&&groscoText.includes('HABILIDAD ACTUAL (CA)')&&groscoText.includes(String(Math.round(grosco.currentAbility))),'Grosco no muestra puntuaciones correctas');
 await page.locator('[data-action="back-heroes"]').click();
 const rocAvatar=page.locator('.hero-card[data-hero="adv_xhgcncku9qpi"] img');
 assert.ok((await rocAvatar.getAttribute('src')).includes('roc-guardalmena-codice.webp'),'El retrato de Roc no se ha actualizado');
 await page.locator('.hero-card[data-hero="adv_xhgcncku9qpi"]').click();
 assert.ok((await page.locator('#content').innerText()).includes('Roc Guardalmena'),'La ficha de Roc no abre');
 await page.locator('[data-action="back-heroes"]').click();
 await page.locator('.hero-card[data-hero="adv_dvyb6kaxgy9l"]').click();
 assert.ok((await page.locator('#content').innerText()).includes('Vendida'),'La ficha de Xara no conserva su salida');
 await page.locator('[data-action="back-heroes"]').click();
 await page.locator('.hero-card[data-hero="adv_efelp4o01ks4"]').click();
 assert.ok((await page.locator('#content').innerText()).includes('Iligar el Rompehuesos'),'No abre ficha de Iligar');
 await page.locator('#sideNav [data-nav="patrols"]').click();
 assert.equal(await page.locator('.patrol-row').count(),sourceBook.stats.members,'Patrullas incompletas: deben aparecer los miembros vivos');
 const patrolContent=(await page.locator('#content').innerText());
 if(sourceBook.characters.some(x=>x.potentialGap>=45&&x.status!=='caído'&&x.status!=='retirada'))assert.ok(patrolContent.includes('Gran margen'),'Patrullas no presenta oportunidades de crecimiento');
 const yvaldo=page.locator('.patrol-row[data-hero="adv_nmu0cr5oezjw"]');
 assert.ok((await yvaldo.innerText()).includes(String(sourceBook.characters.find(x=>x.id==='adv_nmu0cr5oezjw').gameRating)),'Yvaldo no muestra su valoración de clase');
 assert.equal(await page.locator('.patrol-row[data-hero="adv_dvyb6kaxgy9l"]').count(),0,'Xara vendida no puede aparecer en Patrullas');
 const roc=page.locator('.patrol-row[data-hero="adv_xhgcncku9qpi"]');
 assert.equal(await roc.count(),1,'Roc debe figurar entre los once nuevos integrantes');
 assert.ok((await roc.innerText()).includes('En camino'),'Roc todavía viaja hacia la Casa');
 assert.equal(await page.locator('.patrol-row.patrol-away').count(),sourceBook.characters.filter(c=>c.away&&c.status!=='caído'&&c.status!=='retirada'&&c.status!=='vendida').length,'Desajuste de ausencias entre encargo, incursión y llegada');
 const patrolText=await page.locator('#content').innerText();
 if(sourceBook.world.activeExpedition)assert.ok(patrolText.includes(String(sourceBook.world.activeExpedition.returnsDay)),'Falta el día de regreso');
 for(const dead of sourceBook.characters.filter(x=>x.status==='caído'))assert.ok(!patrolText.includes(dead.name),'Un fallecido no puede aparecer en patrullas: '+dead.name);
 await page.locator('#sideNav [data-nav="annual"]').click();
 assert.ok((await page.locator('#content').innerText()).includes('El año que hicimos casa'),'Falta el cierre anual del Año I');
 await page.locator('#sideNav [data-nav="archive"]').click();
 const archive=await page.locator('#content').innerText();
 assert.ok(archive.includes(sourceBook.world.division)&&archive.includes(String(sourceBook.stats.renown)),'Archivo desactualizado');
 assert.ok(archive.toLocaleLowerCase('es').includes('retratos asignados')&&archive.toLocaleLowerCase('es').includes('récords revisados'),'Falta la auditoría del guardado v26');
 if(sourceBook.world.finance){const fin=sourceBook.world.finance;
  assert.ok(archive.includes(String(Math.abs(fin.current.netBeforeDelves)))&&archive.includes(String(Math.abs(fin.lastPayroll.net)))&&archive.includes(String(fin.avgDelvesGoldPerPay)),'La economía no refleja paga real y previsión');
 }
 if(sourceBook.world.finance?.recentStaffDeparture)assert.ok(archive.includes(sourceBook.world.finance.recentStaffDeparture.name),'No se explica la salida del Consejo');
 for(const b of sourceBook.world.board||[])assert.ok(archive.includes(b.name),'Tablón no sincronizado: '+b.name);
 await page.locator('#sideNav [data-nav="legacy"]').click();
 assert.equal(await page.locator('.memorial-person').count(),sourceBook.stats.dead,'Faltan caídos en el memorial');
 await page.locator('#sideNav [data-nav="saga"]').click();
 const latest=page.locator('.chronicle-feature [data-chapter]');
 assert.equal(await latest.count(),1,'Falta botón de última crónica');
 await latest.click();
 assert.ok((await page.locator('.reader-hero h2').innerText()).trim().length>5,'El lector no muestra el título');
 assert.ok((await page.locator('.prose').innerText()).trim().length>100,'La última crónica no tiene contenido');
 notes.push({kind,sections:sections.length,edition:summary,patrols:sourceBook.stats.members,expedition:sourceBook.world.activeExpedition?.heroIds?.length||0,latest:sourceBook.chapters?.at(-1)?.title||'último interludio',errors:0});
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
