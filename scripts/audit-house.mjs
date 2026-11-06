import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import HouseEngine from '../data/house-state.js';
const root=new URL('../',import.meta.url);
const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('data/campaign.js',root),'utf8'),context);
vm.runInContext(readFileSync(new URL('novel/relationships.js',root),'utf8'),context);
const book=JSON.parse(vm.runInContext('JSON.stringify(BOOK)',context));
const issues=HouseEngine.audit(book);
const summary=HouseEngine.create(book).counts;
console.log('Corazón de la Casa:',JSON.stringify(summary));
if(issues.length){for(const issue of issues)console.error(issue.code+': '+issue.message);process.exitCode=1;}
else console.log('Auditoría de estado: sin contradicciones estructurales detectadas.');
