import fs from 'node:fs';
import vm from 'node:vm';
const campaign=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../data/campaign.js',import.meta.url),'utf8'),campaign,{timeout:10000});
const expectedEdition=vm.runInContext('BOOK.editions.at(-1).id',campaign);
const sourceBook=JSON.parse(vm.runInContext('JSON.stringify(BOOK)',campaign));
vm.runInContext(fs.readFileSync(new URL('../annual/summaries.js',import.meta.url),'utf8'),campaign,{timeout:10000});
vm.runInContext(fs.readFileSync(new URL('../home-summary.js',import.meta.url),'utf8'),campaign,{timeout:10000});
const expectedHome=JSON.parse(vm.runInContext('JSON.stringify(HomeSummary.build(BOOK,ANNUAL_SUMMARIES))',campaign));
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
   // Validar imágenes ya cargadas sin volver a descargarlas por fetch().
   const broken=await page.locator('#content img[src]').evaluateAll(async images=>{
     await Promise.all(images.map(img=>img.decode().catch(()=>{})));
     return images.filter(img=>img.naturalWidth===0).map(img=>img.currentSrc||img.src);
   });
   assert.deepEqual(broken,[],kind+' imágenes rotas en '+section);
 }
 assert.deepEqual(errors,[],kind+' errores JavaScript');
 await page.locator('#sideNav [data-nav="home"]').click();
 assert.equal(await page.locator('.new-era-home').count(),1,'Falta la portada dinámica');
 const homeText=await page.locator('.new-era-home').innerText();
 assert.ok(homeText.includes(expectedHome.title)&&homeText.includes(sourceBook.world.division),'La portada no coincide con la edición actual');
 assert.ok(homeText.includes(String(sourceBook.stats.members)),'La plantilla no coincide con la portada');
 const highlighted=await page.locator('.panel[aria-label="Acontecimiento destacado de la edición"]').innerText();
 assert.ok(highlighted.includes(expectedHome.feature.title),'El destacado de portada está caducado');
 if(expectedHome.annual)assert.ok((await page.locator('.annual-home-link').innerText()).includes(expectedHome.annual.title),'No aparece el último cierre anual');
 if(sourceBook.world.finance?.asOfVisibleDay===sourceBook.meta.day)assert.equal(await page.locator('.finance-home-strip').count(),1,'Falta la previsión económica vigente');
 assert.equal(await page.locator('.home-memorial').count(),sourceBook.stats.dead?1:0,'El memorial no coincide con el guardado');
 assert.equal(await page.locator('.featured-card.is-fallen').count(),sourceBook.stats.dead,'No aparecen todos los caídos');
 await page.locator('#sideNav [data-nav="heroes"]').click();
 assert.equal(await page.locator('.hero-card').count(),sourceBook.characters.length,'El archivo debe incluir todos los personajes canónicos');
 const sampleHero=sourceBook.characters.find(c=>c.currentAbility!=null&&!['caído','vendida','retirada'].includes(c.status));
 assert.ok(sampleHero,'No hay un aventurero activo para comprobar');
 await page.locator('.hero-card[data-hero="'+sampleHero.id+'"]').click();
 const heroText=await page.locator('#content').innerText();
 assert.ok(heroText.includes(sampleHero.name)&&heroText.includes('HABILIDAD ACTUAL (CA)')&&heroText.includes(String(Math.round(sampleHero.currentAbility))),
  'La ficha no muestra las estadísticas actuales del personaje');
 await page.locator('[data-action="back-heroes"]').click();
 const departed=sourceBook.characters.find(c=>['vendida','retirada'].includes(c.status));
 if(departed){
  await page.locator('.hero-card[data-hero="'+departed.id+'"]').click();
  assert.ok((await page.locator('#content').innerText()).includes(departed.name),'Falta el antiguo integrante');
  await page.locator('[data-action="back-heroes"]').click();
 }
 await page.locator('#sideNav [data-nav="patrols"]').click();
 assert.equal(await page.locator('.patrol-row').count(),sourceBook.stats.members,'Patrullas incompletas: deben aparecer los miembros vivos');
 const patrolContent=(await page.locator('#content').innerText());
 if(sourceBook.characters.some(x=>x.potentialGap>=45&&x.status!=='caído'&&x.status!=='retirada'))assert.ok(patrolContent.includes('Gran margen'),'Patrullas no presenta oportunidades de crecimiento');
 for(const c of sourceBook.characters.filter(c=>!['caído','vendida','retirada'].includes(c.status))){
  const row=page.locator('.patrol-row[data-hero="'+c.id+'"]');
  assert.equal(await row.count(),1,'No figura en Patrullas: '+c.name);
  if(c.gameRating!=null)assert.ok((await row.innerText()).includes(String(c.gameRating)),'Falta la valoración de '+c.name);
 }
 for(const c of sourceBook.characters.filter(c=>['caído','vendida','retirada'].includes(c.status)))
  assert.equal(await page.locator('.patrol-row[data-hero="'+c.id+'"]').count(),0,'Persona inactiva en Patrullas: '+c.name);
 assert.equal(await page.locator('.patrol-row.patrol-away').count(),
  sourceBook.characters.filter(c=>c.away&&!['caído','vendida','retirada'].includes(c.status)).length,'Ausencias inconsistentes');
 await page.locator('[data-action="open-patrol-advisor"]').click();
 const advisor=page.locator('#patrolAdvisorDialog');
 await advisor.waitFor({state:'visible'});
 const advisorText=await advisor.innerText();
 assert.ok(advisorText.includes('DÍA '+sourceBook.meta.day)&&advisorText.includes('Entrenamientos sugeridos'),
  'Consejo de patrullas no actualizado');
 for(const c of sourceBook.characters.filter(c=>['caído','vendida','retirada'].includes(c.status)))
  assert.ok(!advisorText.includes(c.name),'El consejo recomienda a alguien que no está en plantilla: '+c.name);
 await advisor.locator('[data-action="close-patrol-advisor"]').click();
 assert.equal(await advisor.isVisible(),false,'El consejo no se ha cerrado');
 const patrolText=await page.locator('#content').innerText();
 if(sourceBook.world.activeExpedition)assert.ok(patrolText.includes(String(sourceBook.world.activeExpedition.returnsDay)),'Falta el día de regreso');
 for(const dead of sourceBook.characters.filter(x=>x.status==='caído'))assert.ok(!patrolText.includes(dead.name),'Un fallecido no puede aparecer en patrullas: '+dead.name);
 await page.locator('#sideNav [data-nav="annual"]').click();
 assert.ok((await page.locator('#content').innerText()).length>80,'No aparece el archivo anual');
 await page.locator('#sideNav [data-nav="archive"]').click();
 const archive=await page.locator('#content').innerText();
 assert.ok(archive.includes(sourceBook.world.division)&&archive.includes(String(sourceBook.stats.renown)),'Archivo desactualizado');
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
