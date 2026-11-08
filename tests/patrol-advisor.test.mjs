import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ctx=vm.createContext({window:{}});
vm.runInContext(read('data/campaign.js'),ctx,{filename:'data/campaign.js',timeout:10000});
vm.runInContext(read('patrol-advisor.js'),ctx,{filename:'patrol-advisor.js',timeout:10000});
const book=JSON.parse(vm.runInContext('JSON.stringify(BOOK)',ctx));
const html=vm.runInContext('window.PatrolAdvisor.build(BOOK,BOOK.characters)',ctx,{timeout:10000});
test('Informe por edición basado en la patrulla viva',()=>{
 assert.ok(html.includes('DÍA '+book.meta.day)&&html.includes('Vanguardia')&&html.includes('Segunda Guardia'));
 assert.ok(html.includes('Entrenamientos sugeridos'));
 for(const c of book.characters.filter(c=>['Vanguardia','Segunda Guardia'].includes(c.post)&&!['caído','vendida','retirada'].includes(c.status)))
  assert.ok(html.includes(c.name),'No figura '+c.name);
});
test('No recomienda a los caídos y salidos',()=>{
 for(const c of book.characters.filter(c=>['caído','vendida','retirada'].includes(c.status)))
  assert.ok(!html.includes(c.name),'Personaje antiguo incluido: '+c.name);
});
test('No mezcla la economía ni confunde las escalas',()=>{
 assert.ok(!html.includes('g / 6 días')&&!html.includes('paga actual'));
 assert.ok(html.includes('CA y PA')&&html.includes('valoración'));
});
