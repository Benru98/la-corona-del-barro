import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const context=vm.createContext({});
for(const path of ['data/campaign.js','annual/summaries.js','home-summary.js'])
 vm.runInContext(read(path),context,{filename:path,timeout:10000});
const book=JSON.parse(vm.runInContext('JSON.stringify(BOOK)',context));
const annual=JSON.parse(vm.runInContext('JSON.stringify(ANNUAL_SUMMARIES)',context));
const build=vm.runInContext('HomeSummary.build',context);
const view=(b,a=annual)=>JSON.parse(JSON.stringify(build(b,a)));

test('La portada se deriva de las cifras y de la edición aprobadas',()=>{
 const v=view(book);
 assert.equal(v.year,book.meta.year);
 assert.equal(v.day,book.meta.day);
 assert.equal(v.editionId,book.editions.at(-1).id);
 assert.equal(v.title,book.editions.at(-1).title);
 assert.ok(v.intro.includes(book.world.division));
 assert.ok(v.intro.includes(String(book.world.league.points)+' puntos'));
 assert.ok(v.intro.includes(book.stats.members+' integrantes'));
 assert.ok(v.annual?.title);
 assert.ok(v.feature.title&&v.feature.text);
});

test('Un guardado del año III elimina los anuncios del año II',()=>{
 const next=structuredClone(book);
 next.meta.year=3;next.meta.day=200;next.stats.day=200;
 next.world.league={position:1,of:12,points:16,played:6};
 next.world.activeJobs=[];next.world.activeExpedition=null;next.world.systemEvents=[];
 const roc=next.characters.find(c=>c.name==='Roc Guardalmena');
 assert.ok(roc);roc.status='en la Casa';roc.away=null;
 next.editions.push({id:'E0099',gameYear:3,gameDay:200,title:'Una nueva era',notes:['La Casa comienza otra etapa.']});
 const summaries=structuredClone(annual);
 summaries.years.push({year:2,title:'Los anales del segundo año',subtitle:'Una etapa cerrada.'});
 const v=view(next,summaries);
 assert.equal(v.title,'Una nueva era');
 assert.ok(v.intro.includes('16 puntos'));
 assert.ok(!v.intro.includes('Roc Guardalmena'),'Roc ya no está de camino');
 assert.ok(!v.intro.includes('día 165')&&!v.intro.includes('día 167'));
 assert.ok(!v.feature.text.includes('Roc Guardalmena'));
 assert.equal(v.annual.year,2);
 assert.equal(v.annual.title,'Los anales del segundo año');
});

test('No se abre la ficha de un caído en un acontecimiento de memoria',()=>{
 const next=structuredClone(book);
 next.meta.day+=1;next.world.activeJobs=[];next.world.activeExpedition=null;
 next.world.systemEvents=[{year:next.meta.year,day:next.meta.day,kind:'death',subjectId:'adv_w21f5zhwf7li',title:'Un nombre permanece',description:'El memorial recuerda a un caído.'}];
 const v=view(next);
 assert.equal(v.feature.title,'Un nombre permanece');
 assert.equal(v.feature.heroId,null);
 assert.notEqual(v.primary.type,'hero');
});

test('El código no vuelve a incrustar titulares de un día fijo',()=>{
 const app=read('app.js'),html=read('index.html');
 assert.ok(html.indexOf('home-summary.js')<html.indexOf('app.js'));
 assert.match(app,/HomeSummary\.build\(BOOK,ANNUAL_SUMMARIES\)/);
 assert.doesNotMatch(app,/Actualización del día 164|Comienzo del Año II|Conocer a Roc ↗|Las salidas también son historia/);
 assert.match(app,/finance\?\.asOfVisibleDay===BOOK\.meta\.day/);
});
