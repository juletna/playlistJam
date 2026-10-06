// Run against the current server. Dry run by default; --apply archives before writing.
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chordSections} from '../public/chords.js';
import {songGrid} from '../public/grid.js';

const base=`http://localhost:${process.env.PORT||4317}`;
async function request(route,options){
  const response=await fetch(base+route,options),body=await response.json();
  if(!response.ok)throw Error(body.error||`HTTP ${response.status}`);
  return body;
}
const before=await request('/api/library');
const candidates=before.songs.filter(song=>Object.hasOwn(song,'chords')&&(
  !song.chords.trim()||chordSections.some(([key])=>song[key]?.trim())||
  (song.irealUrl&&songGrid(song).sections.length)
));
const report={createdAt:new Date().toISOString(),total:before.songs.length,
  retainedLegacy:before.songs.filter(song=>song.chords?.trim()&&!candidates.includes(song)).map(song=>song.id),
  changes:candidates.map(song=>({id:song.id,previousChords:song.chords,reason:song.chords.trim()?'Aperçu remplacé par les sections ou la grille':'Champ vide',verified:false}))};
if(!process.argv.includes('--apply')){
  console.log(JSON.stringify(report,null,2));
}else{
  await mkdir('research',{recursive:true});
  const file='research/chord-overviews-cleanup-'+report.createdAt.replace(/[:.]/g,'-')+'.json';
  await writeFile(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  for(const song of candidates){
    const current=(await request('/api/library')).songs.find(s=>s.id===song.id);
    assert.deepEqual(current,song,'Fiche modifiée pendant le nettoyage : '+song.id);
    const {chords,...next}=current;
    const saved=await request('/api/songs/'+song.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});
    assert.ok(!Object.hasOwn(saved,'chords'));
    for(const [key,value] of Object.entries(next))assert.deepEqual(saved[key],value,`${song.id}: ${key}`);
    const persisted=(await request('/api/library')).songs.find(s=>s.id===song.id);
    assert.deepEqual(persisted,saved);
    report.changes.find(change=>change.id===song.id).verified=true;
    await writeFile(file,JSON.stringify(report,null,2)+'\n');
  }
  const after=await request('/api/library');
  assert.deepEqual(after.setlists,before.setlists);
  assert.deepEqual(after.songs.map(s=>s.id),before.songs.map(s=>s.id));
  for(const song of before.songs.filter(s=>!candidates.includes(s)))assert.deepEqual(after.songs.find(s=>s.id===song.id),song);
  const ids=new Set(after.songs.map(s=>s.id));
  for(const set of after.setlists)for(const id of set.songIds)assert.ok(ids.has(id),`Référence absente : ${id}`);
  console.log(`${candidates.length} fiches nettoyées ; ${report.retainedLegacy.length} anciens relevés préservés. Setlists et autres champs vérifiés. Rapport : ${file}`);
}
