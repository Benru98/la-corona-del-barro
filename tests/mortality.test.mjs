import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {compareSaves,prepareCampaignUpdate,validateSave} from '../scripts/save-core.mjs';
import {fallenId,reconcileCasualties} from '../scripts/mortality-core.mjs';

const root=new URL('../',import.meta.url);
const txt=p=>readFileSync(new URL(p,root),'utf8');
const ctx=vm.createContext({});
vm.runInContext(txt('data/campaign.js'),ctx);
const book=JSON.parse(vm.runInContext('JSON.stringify(BOOK)',ctx));
const current=JSON.parse(txt('data/approved-save-projection.json'));
const brugo='adv_w21f5zhwf7li';
const luna='adv_xvecyci8knko';
const who=id=>book.characters.find(x=>x.id===id);

test('Un caído sigue en el códice, pero no cuenta como aventurero vivo',()=>{
 assert.equal(book.stats.day,45);
 assert.equal(current.guild.roster.length,10);
 assert.equal(current.guild.fallen.length,1);
 assert.equal(book.characters.length,11);
 assert.equal(who(brugo).status,'caído');
 assert.equal(who(brugo).death.day,34);
 assert.equal(who(brugo).death.place,'El Asalto de Ashfall');
 assert.equal(book.world.fallen[0].id,brugo);
 assert.ok(who(brugo).memorial.quote.includes('regresáramos'));
 assert.ok(who(brugo).memorial.literaryDeath.includes('versión literaria'));
 assert.ok(who(brugo).bio.includes('Murió en El Asalto de Ashfall'));
 assert.equal(book.stats.dead,1);
 assert.equal(book.stats.members,10);
 assert.ok(!book.world.guildRosterAlive.includes(brugo));
});

test('Un futuro fallecimiento activa la conciliación sin eliminar retrato, biografía ni vínculos',()=>{
 const next=structuredClone(current);
 next.guild.day++;
 const [hero]=next.guild.roster.splice(next.guild.roster.findIndex(x=>x.id===luna),1);
 next.guild.fallen.push({adventurer:{id:hero.id,name:hero.name},day:current.guild.day,dungeon:'El Paso de la Niebla',epitaph:'La Casa conserva su nombre'});
 validateSave(next);
 const diff=compareSaves(current,next);
 assert.equal(diff.fallen.added.length,1);
 assert.deepEqual(diff.fallen.added[0],{id:luna,name:'Luna'});
 assert.equal(diff.roster.removed.length,1);
 assert.ok(diff.requiresEditorialReview);
 const props=prepareCampaignUpdate(book,current,next,'futuro.json');
 const after=props.campaign;
 const c=after.characters.find(x=>x.id===luna);
 assert.equal(after.characters.length,11,'No se borran personajes históricos');
 assert.equal(c.status,'caído');
 assert.equal(c.death.day,45);
 assert.equal(c.death.place,'El Paso de la Niebla');
 assert.equal(c.away,null);
 assert.equal(after.stats.members,9);
 assert.equal(after.stats.dead,2);
 assert.equal(after.world.fallen.length,2);
 assert.ok(!after.world.guildRosterAlive.includes(luna));
 assert.equal(c.portrait,who(luna).portrait);
 assert.equal(c.bio,who(luna).bio,'La biografía histórica no se reescribe automáticamente');
 assert.equal(c.memorial.literaryDeath,undefined,'No inventar la causa exacta automáticamente');
 assert.deepEqual(after.chapters,book.chapters,'Las escenas históricas no cambian');
 assert.deepEqual(after.literaryRelationships,book.literaryRelationships);
 assert.equal(book.stats.dead,1,'La propuesta nunca muta producción');
});

test('La proyección acepta fallecidos anidados o con ID simple, pero rechaza duplicados y resurrección silenciosa',()=>{
 assert.equal(fallenId({id:brugo}),brugo);
 assert.equal(fallenId({adventurer:{id:luna}}),luna);
 const bad=structuredClone(current);bad.guild.fallen.push({adventurer:{id:brugo}});
 assert.throws(()=>validateSave(bad),/duplicados/);
 const overlap=structuredClone(current);overlap.guild.fallen.push({id:luna});
 assert.throws(()=>validateSave(overlap),/simultáneamente/);
 const resurrect=structuredClone(current);
 resurrect.guild.day++;
 resurrect.guild.fallen=[];
 resurrect.guild.roster.push({id:brugo,name:'Brugo',level:8,morale:64,condition:100,stress:32,fatigue:27,experience:91});
 assert.throws(()=>prepareCampaignUpdate(book,current,resurrect),/Regreso de un caído/);
});

test('Los textos públicos son dinámicos: no anuncian una Casa sin bajas después de Brugo',()=>{
 const app=txt('app.js'),css=txt('styles.css');
 assert.ok(!app.includes('Por ahora, once personas siguen vivas.'));
 assert.ok(!app.includes('Pero hoy no falta nadie.'));
 assert.ok(!app.includes('Tres puntos. Y todavía nadie en el memorial.'));
 assert.ok(!app.includes('SITUACIÓN ACTUAL · AÑO 1, DÍA 20'));
 assert.ok(app.includes('livingMembers()')&&app.includes('fallenMembers()'));
 assert.ok(app.includes("c.status==='caído'")||app.includes("isFallen(c)"));
 assert.ok(app.includes('memorial-person'));
 assert.ok(app.includes('!isFallen(c)&&c.post')||app.includes('living.filter(c=>c.post===title)'));
 assert.ok(css.includes('.memorial-person'));
 assert.ok(css.includes('.death-ribbon'));
});
