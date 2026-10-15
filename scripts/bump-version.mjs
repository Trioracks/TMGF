import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('../VERSION',import.meta.url),dataFile=new URL('../src/data.js',import.meta.url);
const old=(await readFile(file,'utf8')).trim();
if(!/^\d+\.\d+\.\d+\.\d+$/.test(old))throw Error('Ожидалась версия из четырёх чисел');
const parts=old.split('.');parts[3]=(BigInt(parts[3])+1n).toString();const next=parts.join('.');
const source=await readFile(dataFile,'utf8');
if(!source.includes(`export const VERSION='${old}';`))throw Error('VERSION и data.js не совпадают');
if(process.argv.includes('--check')){console.log(`${old} → ${next}`);}else{
 await writeFile(dataFile,source.replace(`export const VERSION='${old}';`,`export const VERSION='${next}';`));
 await writeFile(file,next+'\n');console.log(next);
}
