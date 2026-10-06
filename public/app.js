import {setupSongPage} from './song-page.js';
import {songGrid,renderGrid,songPreview} from './grid.js';
import {parseIreal} from './ireal.js';
import {setupIrealImport} from './ireal-import.js';
import {setupMetadata} from './metadata.js';
import {setupChordImport} from './chord-import.js';
import {youtubeVideoId} from './youtube.js';
import {chordSections,chordText,inferLoop} from './chords.js';
import {marked} from '/vendor/marked.js';
import DOMPurify from '/vendor/purify.js';
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={songs:[],setlists:[],view:'library',selected:new Set(),editing:null};
let displayMode='detailed';
let sortDirection=1;
try{const saved=localStorage.getItem('playlist-jam-display');if(['detailed','compact','artists'].includes(saved))displayMode=saved;}catch{}
function activeDisplay(){return currentSet()&&displayMode==='artists'?'compact':displayMode;}
const artistOrder=new Intl.Collator('fr',{sensitivity:'base',numeric:true});
function renderDisplay(songs){
  const mode=activeDisplay(),artists=mode==='artists';
  document.body.dataset.display=mode;
  document.querySelectorAll('#display-mode [data-display]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.display===mode));b.hidden=!!currentSet()&&b.dataset.display==='artists';});
  $('#view-hint').textContent=artists?'Artistes et titres A–Z · lecture par rangées':'';
  $('#sort').hidden=artists;
  $('#sort-direction').hidden=artists||$('#sort').value==='source';
  $('#sort-direction').textContent=sortDirection===1?'↑':'↓';
  $('#sort-direction').setAttribute('aria-label',sortDirection===1?'Tri croissant : passer en décroissant':'Tri décroissant : passer en croissant');
  document.querySelectorAll('thead th').forEach(th=>th.removeAttribute('aria-sort'));
  document.querySelectorAll('[data-sort]').forEach(button=>{
    const active=button.dataset.sort===$('#sort').value;
    button.dataset.direction=active?(sortDirection===1?'asc':'desc'):'';
    button.setAttribute('aria-label',button.dataset.sort==='source'?'Rétablir l’ordre initial':`Trier par ${button.textContent.toLocaleLowerCase('fr')} ${active&&sortDirection===1?'décroissant':'croissant'}`);
    if(active&&button.dataset.sort!=='source')button.closest('th').setAttribute('aria-sort',sortDirection===1?'ascending':'descending');
  });
  $('#show-chords').closest('label').hidden=artists&&!$('#show-lyrics').checked;
  $('#artist-grid').hidden=!artists;
  $('#artist-selection').hidden=!artists||!songs.length;
  $('#select-all-artists').checked=!!songs.length&&songs.every(s=>state.selected.has(s.id));
  $('#select-all-artists').indeterminate=songs.some(s=>state.selected.has(s.id))&&!$('#select-all-artists').checked;
  const groups=new Map();
  if(artists)for(const song of songs){const name=song.artist.trim()||'Artiste non renseigné',key=name.toLocaleLowerCase('fr');if(!groups.has(key))groups.set(key,{name,songs:[]});groups.get(key).songs.push(song);}
  $('#artist-grid').innerHTML=[...groups.values()].sort((a,b)=>artistOrder.compare(a.name,b.name)).map((group,i)=>`<section class="artist-group" aria-labelledby="artist-heading-${i}"><h2 id="artist-heading-${i}"><span>${esc(group.name)}</span><small class="artist-count" aria-label="${group.songs.length} morceaux">${group.songs.length}</small><small class="artist-genres">${esc([...new Set(group.songs.map(s=>s.style.trim()).filter(Boolean))].sort(artistOrder.compare).join(' · '))}</small></h2><ul>${group.songs.sort((a,b)=>artistOrder.compare(a.title,b.title)).map(s=>`<li class="artist-song ${state.selected.has(s.id)?'selected':''}"><label class="artist-check"><input type="checkbox" data-select="${esc(s.id)}" aria-label="Sélectionner ${esc(s.title)}" ${state.selected.has(s.id)?'checked':''}></label><button type="button" class="artist-title" data-open="${esc(s.id)}">${esc(s.title)}</button>${listenButton(s)}${gridButton(s)}${deleteButton(s)}</li>`).join('')}</ul></section>`).join('');
}
function membershipCount(song){
  const sets=state.setlists.filter(set=>set.songIds.includes(song.id));
  if(!sets.length)return '';
  if(sets.length===1)return `<span class="membership-count membership-name" title="${esc(sets[0].name)}">${esc(sets[0].name)}</span>`;
  return `<details class="membership-count membership-details"><summary aria-label="Voir les ${sets.length} setlists">${sets.length} setlists</summary><ul class="membership-names">${sets.map(set=>`<li>${esc(set.name)}</li>`).join('')}</ul></details>`;
}
const labels={yes:'Ça boucle',no:'Ça change',unknown:'À vérifier'};
const md=t=>DOMPurify.sanitize(marked.parse(t,{breaks:true}),{FORBID_TAGS:['img','iframe','style','form','input']});
let toastTimer;function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',3500);}
async function api(url,body){const r=await fetch(url,body===undefined?{}:{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||'Impossible d’enregistrer');return d;}
function gridButton(song){return `<button type="button" class="row-edit row-grid no-print" data-grid="${esc(song.id||'')}" aria-label="Afficher la grille de ${esc(song.title)}" title="Vue grille"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg></button>`;}
function deleteButton(song){return `<button type="button" class="row-edit row-delete" data-delete="${esc(song.id)}" aria-label="Supprimer ${esc(song.title)} de la collection" title="Supprimer de la collection"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button>`;}
let deleteConfirmation=null;
function confirmDeletion({title,artist='',setlist=false}){
  if(deleteConfirmation)return Promise.resolve(false);
  const dialog=$('#delete-dialog');
  $('#delete-title').textContent=setlist?'Supprimer cette setlist ?':'Supprimer ce morceau ?';
  $('#delete-item-title').textContent=title;
  $('#delete-item-artist').textContent=artist;
  $('#delete-item-artist').hidden=!artist;
  $('#delete-description').textContent=setlist?'Les morceaux resteront dans ta collection.':'Le morceau sera retiré de ta collection et de toutes les setlists qui le contiennent.';
  $('#confirm-delete').textContent=setlist?'Supprimer la setlist':'Supprimer le morceau';
  dialog.returnValue='';
  return new Promise(resolve=>{deleteConfirmation=resolve;dialog.showModal();$('#cancel-delete').focus();});
}
$('#cancel-delete').onclick=$('#close-delete').onclick=()=>$('#delete-dialog').close();
$('#confirm-delete').onclick=()=>$('#delete-dialog').close('delete');
$('#delete-dialog').addEventListener('close',()=>{
  const resolve=deleteConfirmation;deleteConfirmation=null;
  resolve?.($('#delete-dialog').returnValue==='delete');
});
let deletingSong=false;
async function deleteSong(id){
  const song=state.songs.find(s=>s.id===id);
  if(!song||deletingSong)return;
  if(!await confirmDeletion({title:song.title,artist:song.artist}))return;
  deletingSong=true;
  const controls=[...document.querySelectorAll('[data-delete],#delete-song,#song-form [type=submit]')];
  controls.forEach(b=>b.disabled=true);
  try{
    const response=await fetch('/api/songs/'+encodeURIComponent(id),{method:'DELETE'});
    const result=await response.json();if(!response.ok)throw Error(result.error||'Impossible de supprimer');
    state.songs=state.songs.filter(s=>s.id!==id);state.setlists=result.setlists;state.selected.delete(id);
    if(quickSongId===id)stopQuickListen();
    if(state.editing===id){initialForm=JSON.stringify(values());leaveSong();state.editing=null;}
    refreshOptions();render();$('#search').focus({preventScroll:true});toast('Morceau supprimé');
  }catch(e){toast(e.message);}finally{deletingSong=false;controls.forEach(b=>b.disabled=false);}
}
function currentSet(){return state.setlists.find(s=>s.id===state.view);}
let printSelection=false;
function visible(applyFilters=true){let a=currentSet()?currentSet().songIds.map(id=>state.songs.find(s=>s.id===id)).filter(Boolean):[...state.songs];const q=$('#search').value.trim().toLocaleLowerCase();if(applyFilters)a=a.filter(s=>(!q||[s.title,s.artist,chordText(s)].join(' ').toLocaleLowerCase().includes(q))&&(!$('#decade').value||s.decade===Number($('#decade').value))&&(!$('#year').value||s.year===Number($('#year').value))&&(!$('#style').value||($('#style').value==='unset'?!s.style:s.style===$('#style').value))&&(!$('#loop').value||s.loop===$('#loop').value));const sort=$('#sort').value;
if(sort!=='source')a.sort((a,b)=>{
  const value=s=>sort==='decade'?(s.year||s.decade):sort==='loop'?({yes:0,no:1,unknown:null}[s.loop]??null):sort==='chords'?songPreview(s).text.trim():s[sort]?.trim();
  const av=value(a),bv=value(b),missing=v=>v===null||v===undefined||v==='';
  if(missing(av)!==missing(bv))return missing(av)?1:-1;
  const comparison=missing(av)?0:typeof av==='number'?av-bv:artistOrder.compare(av,bv);
  return comparison*sortDirection||artistOrder.compare(a.title,b.title)||artistOrder.compare(a.artist,b.artist);
});return a;}
function chordPreview(song){
  const preview=songPreview(song);
  return `<div class="chords" title="Aperçu des accords">${preview.label?`<small class="chord-preview-label">${esc(preview.label)}</small>`:''}<span>${esc(preview.text||'—')}${preview.truncated?' …':''}</span></div>`;
}
function chords(s,showGridButton=true){
  let chart='';
  const measured=s.irealUrl||chordSections.some(([key])=>s[key]?.includes('|'));
  if(measured)chart=`<div class="inline-grid">${renderGrid(songGrid(s))}</div>`;
  if(showGridButton)chart+=gridButton(s);

  const sections=chordSections.filter(([key])=>s[key]?.trim());
  const progression=(value,section=false)=>`<div class="chords">${value.split(section?/\s+-\s+|\s+/:/\s+-\s+/).filter(Boolean).map(c=>`<span>${esc(c)}</span>`).join('')}</div>`;
  if(!sections.length)return (s.irealUrl?'':progression(s.chords||''))+chart;
  const rows=sections;
  return `<div class="chord-sections">${rows.map(([key,label])=>`<div class="chord-section"><strong>${label}</strong>${progression(s[key],key!=='chords')}</div>`).join('')}</div>`+chart;
}
let removingMembership=false;
function memberships(song){const sets=state.setlists.filter(set=>set.songIds.includes(song.id));if(!sets.length)return '';return `<ul class="song-playlists" aria-label="Playlists de ${esc(song.title)}">${sets.map(set=>`<li class="playlist-tag"><span>${esc(set.name)}</span><button type="button" class="playlist-remove no-print" data-remove-from="${esc(set.id)}" data-song="${esc(song.id)}" aria-label="Retirer ${esc(song.title)} de ${esc(set.name)}" title="Retirer de ${esc(set.name)}" ${removingMembership?'disabled':''}>×</button></li>`).join('')}</ul>`;}
async function removeMembership(button){
  if(removingMembership)return;
  const setId=button.dataset.removeFrom,songId=button.dataset.song,set=state.setlists.find(s=>s.id===setId);
  if(!set)return;
  const row=button.closest('tr');
  removingMembership=true;
  document.querySelectorAll('[data-remove-from]').forEach(b=>b.disabled=true);
  try{
    await saveSets(state.setlists.map(s=>s.id===setId?{...s,songIds:s.songIds.filter(id=>id!==songId)}:s));
    toast('Morceau retiré de « '+set.name+' »');
  }finally{
    removingMembership=false;
    document.querySelectorAll('[data-remove-from]').forEach(b=>b.disabled=false);
    // Keep keyboard navigation in the same song after its tags are refreshed.
    const currentRow=[...document.querySelectorAll('#rows tr')].find(r=>r.dataset.id===songId);
    if(!row.isConnected)(currentRow?.querySelector('[data-remove-from]:not(:disabled)')||currentRow?.querySelector('[data-open]'))?.focus({preventScroll:true});
  }
}
function refreshOptions(){const keep=$('#style').value;$('#style').innerHTML='<option value="">Tous les styles</option><option value="unset">Non renseigné</option>'+[...new Set(state.songs.map(s=>s.style).filter(Boolean))].sort().map(s=>`<option>${esc(s)}</option>`).join('');$('#style').value=keep;const dec=$('#decade').value;$('#decade').innerHTML='<option value="">Toutes les décennies</option>'+[...new Set(state.songs.map(s=>s.decade))].sort().map(d=>`<option value="${d}">Années ${d}</option>`).join('');$('#decade').value=dec;}
function render(){const set=currentSet(),songs=printSelection?visible(false).filter(s=>state.selected.has(s.id)):visible();$('#total').textContent=state.songs.length;$('#library').classList.toggle('active',!set);$('#setlists').innerHTML=state.setlists.map(s=>`<button class="nav-item ${s.id===state.view?'active':''}" data-view="${s.id}"><span>${esc(s.name)}</span><span>${s.songIds.length}</span></button>`).join('');$('#sets-empty').hidden=!!state.setlists.length;$('#view-title').innerHTML=esc(set?.name||'La collection')+'<span>.</span>';$('#view-subtitle').textContent=set?'Les bons morceaux, dans le bon ordre.':'Trouve le morceau. Garde le rythme.';$('#crumb').textContent=set?'SETLIST':'COLLECTION';$('#eyebrow').textContent=set?'SETLIST · PRÊTE POUR LA PROCHAINE SESSION':state.songs.length+' TITRES · UN RÉPERTOIRE À FAIRE VIVRE';$('#count').textContent=songs.length;$('#sort option[value=source]').textContent=set?'Ordre de la setlist':'Ordre de la collection';document.body.classList.toggle('hide-chords',!$('#show-chords').checked);$('#set-actions').innerHTML=set?'<button class="text-button" id="rename-set">Renommer</button><button class="text-button" id="delete-set">Supprimer la setlist</button><span>Glisse les morceaux ou utilise ↑ ↓ pour changer l’ordre.</span>':'';
$('#rows').innerHTML=songs.map((s,i)=>`<tr data-id="${s.id}" class="${state.selected.has(s.id)?'selected':''}" draggable="${!!set&&$('#sort').value==='source'}"><td class="check-col no-print"><input type="checkbox" aria-label="Sélectionner ${esc(s.title)}" data-select="${s.id}" ${state.selected.has(s.id)?'checked':''}></td><td class="number">${String(i+1).padStart(2,'0')}</td><td class="title-col"><div class="song-summary">${songThumbnail(s)}<div class="song-summary-text"><button class="song-open" data-open="${s.id}" title="${esc(s.title)}"><strong>${esc(s.title)}</strong><span>${esc(s.artist)}</span></button>${listenButton(s)}</div></div></td><td class="compact-artist" title="${esc(s.artist)}">${esc(s.artist)}</td><td class="membership-col" ${set?'hidden':''}>${set?'':memberships(s)+membershipCount(s)}</td><td class="era">${s.year||s.decade+'s'}</td><td class="genre">${esc(s.style||'—')}</td><td class="loop-col"><span class="status ${s.loop}">${labels[s.loop]||labels.unknown}</span></td><td class="chord-col">${chordPreview(s)}</td><td class="no-print action-col"><div class="row-actions">${gridButton(s)}${set?`<div class="move-buttons"><button data-move="-1" data-song="${s.id}" aria-label="Monter ${esc(s.title)}" ${set.songIds.indexOf(s.id)===0?'disabled':''}>↑</button><button data-move="1" data-song="${s.id}" aria-label="Descendre ${esc(s.title)}" ${set.songIds.indexOf(s.id)===set.songIds.length-1?'disabled':''}>↓</button><button data-remove="${s.id}" aria-label="Retirer ${esc(s.title)}">×</button></div>`:`<button type="button" class="row-edit" data-edit="${s.id}" aria-label="Modifier ${esc(s.title)}" title="Modifier la fiche"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5-13 13H3v-5Z"/><path d="m13 6 5 5"/></svg></button>`}${deleteButton(s)}</div></td></tr>`).join('');$('#empty').hidden=!!songs.length;
$('th.membership-col').hidden=!!set;
const n=state.selected.size;$('#print-selected').textContent='Imprimer la sélection ('+n+')';$('#selection-bar').hidden=!n;$('#selected-text').textContent=n+' morceau'+(n>1?'x':'')+' sélectionné'+(n>1?'s':'');const target=$('#target-set').value;$('#target-set').innerHTML=state.setlists.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')+'<option value="new">+ Nouvelle setlist</option>';if(target)$('#target-set').value=target;$('#select-all').checked=!!songs.length&&songs.every(s=>state.selected.has(s.id));$('#select-all').indeterminate=songs.some(s=>state.selected.has(s.id))&&!$('#select-all').checked;
$('#print-meta').textContent=songs.length+' morceaux'+($('#show-chords').checked?' · avec accords':'')+(printSelection?' · sélection':'')+' · '+[printSelection?'':$('#decade').selectedOptions[0]?.textContent,printSelection?'':$('#year').value,printSelection?'':$('#style').value,!printSelection&&$('#loop').value?labels[$('#loop').value]:''].filter(v=>v&&v!=='Toutes les décennies').join(' / ');
const withLyrics=songs.filter(s=>s.lyrics.trim()).length;
$('#lyrics-notice').hidden=!$('#show-lyrics').checked;
$('#lyrics-notice').innerHTML=songs.length?`<span>${withLyrics?withLyrics+' fiche(s) avec paroles sur '+songs.length:'Aucune parole enregistrée pour ces '+songs.length+' morceaux.'} Les fiches sont sous la liste.</span><button type="button" class="text-button" id="go-lyrics">Voir les fiches</button>`:'Aucun morceau à afficher avec ces filtres.';
$('#lyrics-pages').innerHTML=$('#show-lyrics').checked&&songs.length?'<div class="lyrics-navigation no-print"><strong>Fiches paroles</strong><button type="button" class="button" id="back-to-list">Revenir à la liste</button></div>'+songs.map(s=>`<article class="lyrics-sheet"><h2>${esc(s.title)}</h2><p class="artist">${esc(s.artist)}</p>${listenButton(s)}<button type="button" class="text-button no-print" data-edit-lyrics="${s.id}">${s.lyrics.trim()?'Modifier la fiche':'Ajouter les paroles'}</button>${$('#show-chords').checked?chords(s):''}${s.lyrics?`<div class="markdown">${md(s.lyrics)}</div>`:'<p class="missing-lyrics">Paroles non renseignées.</p>'}${/^https?:\/\//.test(s.lyricsUrl)?`<p><a href="${esc(s.lyricsUrl)}" target="_blank" rel="noopener noreferrer">Source des paroles</a></p>`:''}</article>`).join(''):'';
renderDisplay(songs);
updateListenButtons();
}
function reset(){for(const id of ['search','decade','year','style','loop'])$('#'+id).value='';render();}
function navigate(id){if(songPage.isOpen()&&!closeSong())return;state.view=id;state.selected.clear();$('#sort').value='source';sortDirection=1;reset();}
async function saveSets(next){await api('/api/setlists',next);state.setlists=next;render();songPage.memberships();}
let nameAction;function nameDialog(action,value=''){stopQuickListen();nameAction=action;$('#set-name').value=value;$('#name-title').textContent=value?'RENOMMER LA SETLIST':'NOUVELLE SETLIST';$('#name-dialog').showModal();$('#set-name').focus();}
async function createSet(name,ids=[]){const s={id:crypto.randomUUID(),name:name.trim(),songIds:[...new Set(ids)]};await saveSets([...state.setlists,s]);navigate(s.id);toast('Setlist créée');}
$('#name-form').onsubmit=async e=>{e.preventDefault();const name=$('#set-name').value.trim();if(!name)return;try{await nameAction(name);$('#name-dialog').close();}catch(e){toast(e.message);}};
$('#close-name').onclick=()=>$('#name-dialog').close();$('#new-set').onclick=()=>nameDialog(name=>createSet(name));$('#library').onclick=()=>navigate('library');$('#setlists').onclick=e=>{const b=e.target.closest('[data-view]');if(b)navigate(b.dataset.view);};
for(const id of ['search','year'])$('#'+id).oninput=render;for(const id of ['decade','style','loop','sort','show-chords','show-lyrics'])$('#'+id).onchange=render;$('#reset').onclick=reset;
$('#sort').onchange=()=>{sortDirection=1;render();};
$('#sort-direction').onclick=()=>{sortDirection*=-1;render();};
$('thead').onclick=e=>{const button=e.target.closest('[data-sort]');if(!button)return;const key=button.dataset.sort;sortDirection=key!=='source'&&$('#sort').value===key?-sortDirection:1;$('#sort').value=key;render();};
$('#display-mode').onclick=e=>{const button=e.target.closest('[data-display]');if(!button)return;displayMode=button.dataset.display;try{localStorage.setItem('playlist-jam-display',displayMode);}catch{}render();};
function goToLyrics(){if($('#lyrics-pages').children.length)$('#lyrics-pages').scrollIntoView({block:'start'});}
$('#show-lyrics').onchange=()=>{render();if($('#show-lyrics').checked)goToLyrics();};
$('#lyrics-notice').onclick=e=>{if(e.target.closest('#go-lyrics'))goToLyrics();};
$('#lyrics-pages').onclick=e=>{const listen=e.target.closest('[data-listen]');if(listen){listenSong(listen.dataset.listen,listen.dataset.provider);return;}if(e.target.closest('#back-to-list')){$('.list-toolbar').scrollIntoView({block:'start'});$('#show-lyrics').focus({preventScroll:true});}const b=e.target.closest('[data-edit-lyrics]');if(b){openSong(b.dataset.editLyrics,true);songPage.tab('lyrics');$('#lyrics-editor').focus();}};
$('#select-all').onchange=e=>{visible().forEach(s=>e.target.checked?state.selected.add(s.id):state.selected.delete(s.id));render();};$('#clear-selection').onclick=()=>{state.selected.clear();render();};
$('#add-selected').onclick=async()=>{if($('#target-set').value==='new'){const ids=[...state.selected];nameDialog(name=>createSet(name,ids));return;}try{const id=$('#target-set').value;await saveSets(state.setlists.map(s=>s.id===id?{...s,songIds:[...new Set([...s.songIds,...state.selected])]}:s));state.selected.clear();render();toast('Morceaux ajoutés à la setlist');}catch(e){toast(e.message);}};
function selectSong(e){const id=e.target.dataset.select;if(!id)return;const container=e.currentTarget;e.target.checked?state.selected.add(id):state.selected.delete(id);render();[...container.querySelectorAll('[data-select]')].find(input=>input.dataset.select===id)?.focus({preventScroll:true});}
$('#rows').onchange=selectSong;
$('#artist-grid').onchange=selectSong;
$('#select-all-artists').onchange=$('#select-all').onchange;
$('#artist-grid').onclick=e=>{const b=e.target.closest('button');if(b?.dataset.open)openSong(b.dataset.open);if(b?.dataset.listen)listenSong(b.dataset.listen,b.dataset.provider);if(b?.dataset.delete)deleteSong(b.dataset.delete);};
async function reorder(id,to){const s=currentSet();const ids=[...s.songIds];const from=ids.indexOf(id);if(from<0||to<0||to>=ids.length)return;ids.splice(from,1);ids.splice(to,0,id);await saveSets(state.setlists.map(x=>x.id===s.id?{...x,songIds:ids}:x));}
$('#rows').onclick=async e=>{const b=e.target.closest('button');if(!b)return;try{if(b.dataset.delete){await deleteSong(b.dataset.delete);return;}if(b.dataset.listen){listenSong(b.dataset.listen,b.dataset.provider);return;}if(b.dataset.removeFrom){await removeMembership(b);return;}if(b.dataset.open)openSong(b.dataset.open);if(b.dataset.edit)openSong(b.dataset.edit,true);if(b.dataset.move)await reorder(b.dataset.song,currentSet().songIds.indexOf(b.dataset.song)+Number(b.dataset.move));if(b.dataset.remove)await saveSets(state.setlists.map(s=>s.id===state.view?{...s,songIds:s.songIds.filter(id=>id!==b.dataset.remove)}:s));}catch(e){toast(e.message);}};
let dragId;$('#rows').ondragstart=e=>{if(e.target.closest('button,input')){e.preventDefault();return;}dragId=e.target.closest('tr')?.dataset.id;e.dataTransfer.setData('text/plain',dragId);};$('#rows').ondragover=e=>{if(currentSet()&&dragId){e.preventDefault();}};$('#rows').ondrop=async e=>{e.preventDefault();const id=e.target.closest('tr')?.dataset.id;if(id&&dragId&&currentSet())try{await reorder(dragId,currentSet().songIds.indexOf(id));}catch(e){toast(e.message);}dragId=null;};$('#rows').ondragend=()=>dragId=null;
$('#set-actions').onclick=async e=>{if(e.target.id==='rename-set'){const s=currentSet();nameDialog(name=>saveSets(state.setlists.map(x=>x.id===s.id?{...x,name}:x)),s.name);}if(e.target.id==='delete-set'){const s=currentSet();if(await confirmDeletion({title:s.name,setlist:true}))saveSets(state.setlists.filter(x=>x.id!==s.id)).then(()=>navigate('library')).catch(e=>toast(e.message));}};
const form=$('#song-form');let initialForm='';function values(){const fd=new FormData(form);const legacy=state.songs.find(s=>s.id===state.editing)?.chords;return {...(legacy?{chords:legacy}:{}),...Object.fromEntries(fd),year:fd.get('year')?Number(fd.get('year')):null,decade:Number(fd.get('decade')),loop:inferLoop(Object.fromEntries(fd)).loop};}function updateLoop(){const result=inferLoop(values());form.elements.loop.value=result.loop;$('#loop-result').textContent=labels[result.loop];$('#loop-reason').textContent=result.reason;}function dirty(){return JSON.stringify(values())!==initialForm;}let savingSong=false;
function canLeaveSong(){if(savingSong){toast('Enregistrement en cours…');return false;}return !songPage.isOpen()||!dirty()||confirm('Quitter sans enregistrer les modifications ?');}
let songSequence=[],listScroll=0,listFocus=null;
function leaveSong(updateUrl=true){
  $('#song-dialog').dispatchEvent(new Event('close'));songPage.close();
  document.body.append($('#quick-listen'));$('#quick-listen').classList.remove('song-player');
  if(updateUrl)history.replaceState(null,'',location.pathname+location.search);
  document.title='Playlist Jam — Le carnet';
  requestAnimationFrame(()=>{window.scrollTo(0,listScroll);listFocus?.isConnected&&listFocus.focus({preventScroll:true});});
}
function closeSong(){if(!canLeaveSong())return false;leaveSong();return true;}

function link(){const url=form.elements.lyricsUrl.value;$('#lyrics-link').hidden=!/^https?:\/\//i.test(url);$('#lyrics-link').href=/^https?:\/\//i.test(url)?url:'#';}
function openSong(id,edit=false,{fromHistory=false}={}){
  if(!canLeaveSong())return false;
  const fresh=!songPage.isOpen();
  if(fresh){listScroll=window.scrollY;listFocus=document.activeElement;songSequence=visible().map(s=>s.id);if(activeDisplay()==='artists')songSequence=visible().sort((a,b)=>artistOrder.compare(a.artist,b.artist)||artistOrder.compare(a.title,b.title)).map(s=>s.id);}
  $('#song-dialog').dispatchEvent(new Event('close'));
  const existing=state.songs.find(s=>s.id===id);
  state.editing=id||crypto.randomUUID();form.reset();
  $('#delete-song').hidden=!existing;
  const s=existing||{title:'',artist:'',year:null,decade:2020,style:'',loop:'unknown',note:'',lyricsUrl:'',lyrics:''};
  form.elements.decade.innerHTML=Array.from({length:21},(_,i)=>1900+i*10).map(d=>`<option value="${d}">Années ${d}</option>`).join('');
  for(const [key] of chordSections)form.elements[key].value=s[key]||'';
  for(const name of ['title','artist','year','decade','style','note','lyricsUrl','lyrics','youtubeUrl','irealUrl'])form.elements[name].value=s[name]??'';
  $('#save-state').textContent=existing?'Enregistré':'Nouveau morceau';updateLoop();initialForm=JSON.stringify(values());link();youtubeField();preview(false);
  songPage.open({edit:edit||!existing,sequence:songSequence,origin:currentSet()?.name||'Collection',fresh});
  $('#song-dialog').dispatchEvent(new Event('songopen'));
  $('#song-player-slot').append($('#quick-listen'));$('#quick-listen').classList.add('song-player');
  if(!fromHistory){const url='#song/'+encodeURIComponent(state.editing);if(fresh)history.pushState(null,'',url);else history.replaceState(null,'',url);}
  document.title=(s.title||'Nouveau morceau')+' — Playlist Jam';window.scrollTo(0,0);return true;
}

function preview(show){$('#lyrics-editor').hidden=show;$('#markdown-preview').hidden=!show;$('#markdown-preview').innerHTML=md(form.elements.lyrics.value||'*Aucune parole enregistrée.*');$('#edit-tab').classList.toggle('active',!show);$('#preview-tab').classList.toggle('active',show);}
$('#edit-tab').onclick=()=>preview(false);$('#preview-tab').onclick=()=>preview(true);$('#new-song').onclick=()=>openSong(undefined,true);$('#delete-song').onclick=()=>deleteSong(state.editing);$('#close-song').onclick=closeSong;$('#cancel-song').onclick=()=>{if(!canLeaveSong())return;const song=state.songs.find(s=>s.id===state.editing);if(!song){initialForm=JSON.stringify(values());leaveSong();return;}initialForm=JSON.stringify(values());openSong(song.id);};$('#song-dialog').addEventListener('cancel',e=>{e.preventDefault();closeSong();});form.oninput=e=>{if(e.target!==form&&!e.target.name)return;updateLoop();$('#save-state').textContent=dirty()?'Modifications non enregistrées':'Enregistré dans un fichier .md';link();youtubeField();songPage.refresh();};
form.onsubmit=async e=>{e.preventDefault();const submit=form.querySelector('[type=submit]');if(savingSong)return;savingSong=true;submit.disabled=true;form.inert=true;try{const s=await api('/api/songs/'+state.editing,values());const i=state.songs.findIndex(x=>x.id===s.id);if(i<0)state.songs.push(s);else state.songs[i]=s;initialForm=JSON.stringify(values());$('#save-state').textContent='Enregistré';refreshOptions();render();$('#delete-song').hidden=false;songPage.setEditing(false);songPage.refresh();$('#song-dialog').dispatchEvent(new Event('close'));toast('Fiche enregistrée');}catch(e){$('#save-state').textContent='Échec de l’enregistrement : '+e.message;toast(e.message);}finally{submit.disabled=false;form.inert=false;savingSong=false;}};
function download(filename,text,type='text/plain'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function openGrid(song){
  $('#grid-title').textContent=song.title||'Grille du morceau';$('#grid-artist').textContent=song.artist||'';
  const grid=songGrid(song);
  $('#grid-content').innerHTML=renderGrid(grid);
  $('#grid-footer-note').textContent=grid.sections.length?'Jusqu’à 4 mesures par ligne · reprises écrites':grid.unmeasured.length?'Progressions sans découpage en mesures':'Aucune grille renseignée';
  $('#grid-dialog').showModal();
}
$('#song-grid-open').onclick=()=>openGrid(values());
$('#close-grid').onclick=$('#grid-back').onclick=()=>$('#grid-dialog').close();
document.addEventListener('click',e=>{const button=e.target.closest('[data-grid]');if(!button)return;const song=state.songs.find(song=>song.id===button.dataset.grid);if(song)openGrid(song);});
$('#download-song').onclick=()=>{const {lyrics,...meta}=values();download((meta.title||'chanson')+'.md','---\n'+Object.entries(meta).map(([k,v])=>k+': '+JSON.stringify(v)).join('\n')+'\n---\n\n'+lyrics,'text/markdown');};$('#export').onclick=()=>download('playlist-jam.json',JSON.stringify({version:1,songs:state.songs,setlists:state.setlists},null,2),'application/json');
function printSongs(selection){printSelection=selection;render();window.print();}
$('#print').onclick=()=>printSongs(false);$('#print-selected').onclick=()=>printSongs(true);window.addEventListener('beforeprint',render);window.addEventListener('afterprint',()=>{printSelection=false;render();});window.addEventListener('beforeunload',e=>{if(songPage.isOpen()&&dirty()){e.preventDefault();e.returnValue='';}});document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!songPage.isOpen()&&!$('#name-dialog').open&&!$('#listen-dialog').open&&!$('#delete-dialog').open){e.preventDefault();$('#search').focus();}});


const providers={
  youtube:{name:'YouTube',field:'youtubeUrl',id:youtubeVideoId,url:id=>'https://www.youtube.com/watch?v='+id,hint:'Si la lecture ne démarre pas, appuie sur ▶ dans la vidéo.'}
};
let quickSongId=null,quickProvider=null;
function youtubeFrame(song,autoplay=false){
  const frame=document.createElement('iframe');
  frame.title='Lecteur YouTube — '+song.title;
  frame.src='https://www.youtube-nocookie.com/embed/'+youtubeVideoId(song.youtubeUrl)+'?playsinline=1&rel=0'+(autoplay?'&autoplay=1':'');
  frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
  frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.allowFullscreen=true;
  return frame;
}
function updateListenButtons(){
  document.querySelectorAll('[data-listen]').forEach(button=>{
    const active=button.dataset.listen===quickSongId&&button.dataset.provider===quickProvider;
    button.classList.toggle('listening',active);
    button.setAttribute('aria-current',String(active));
  });
}
function stopQuickListen(){
  quickSongId=null;quickProvider=null;
  $('#quick-video').replaceChildren();
  $('#quick-listen').hidden=true;
  updateListenButtons();
}
function openQuickListen(song,provider='youtube'){
  const source=providers[provider];
  if(quickSongId===song.id&&quickProvider===provider){$('#close-quick').focus({preventScroll:true});return;}
  quickSongId=song.id;quickProvider=provider;
  $('#quick-title').textContent=song.title;
  $('#quick-artist').textContent=song.artist;
  $('#quick-external').href=source.url(source.id(song[source.field]));
  $('#quick-external').textContent=source.name+' ↗';
  $('#quick-listen').setAttribute('aria-label','Lecteur '+source.name);
  $('#quick-listen').dataset.provider=provider;
  $('.quick-hint').textContent=source.hint;
  $('#quick-chords').innerHTML=chordText(song).trim()?chords(song):'<p class="missing-lyrics">Accords non renseignés.</p>';
  $('#quick-lyrics').innerHTML=md(song.lyrics||'*Paroles non renseignées.*')+(song.note?'<h3>Notes</h3><p>'+esc(song.note).replace(/\n/g,'<br>')+'</p>':'');
  $('#quick-details').hidden=true;
  $('#quick-details-toggle').setAttribute('aria-expanded','false');
  $('#quick-listen').hidden=false;
  $('#quick-video').replaceChildren(youtubeFrame(song,true));
  updateListenButtons();
}
$('#quick-details-toggle').onclick=()=>{
  const details=$('#quick-details');details.hidden=!details.hidden;
  $('#quick-details-toggle').setAttribute('aria-expanded',String(!details.hidden));
};
$('#close-quick').onclick=()=>{
  const id=quickSongId,provider=quickProvider;stopQuickListen();
  [...document.querySelectorAll('[data-listen]')].find(b=>b.dataset.listen===id&&b.dataset.provider===provider)?.focus({preventScroll:true});
};
// Leave enough scroll space to reach the last rows above the floating player.
new ResizeObserver(()=>document.documentElement.style.setProperty('--player-clearance',$('#quick-listen').hidden?'0px':($('#quick-listen').getBoundingClientRect().height+32)+'px')).observe($('#quick-listen'));

function songThumbnail(song){
  const id=youtubeVideoId(song.youtubeUrl);
  return `<span class="song-thumbnail no-print" aria-hidden="true"><span>♪</span>${id?`<img src="https://i.ytimg.com/vi/${id}/mqdefault.jpg" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`:''}</span>`;
}
// Keep the neutral placeholder visible if YouTube cannot supply a thumbnail.
$('#rows').addEventListener('error',e=>{if(e.target.matches('.song-thumbnail img'))e.target.remove();},true);

function listenButton(song){
  return Object.entries(providers).filter(([,source])=>source.id(song[source.field])).map(([provider,source])=>`<button type="button" class="listen-button no-print" data-listen="${esc(song.id)}" data-provider="${provider}" aria-label="Écouter ${esc(song.title)} sur ${source.name}">▶ Écouter sur ${source.name}</button>`).join('');
}
function youtubeField(){
  const input=form.elements.youtubeUrl,valid=!!youtubeVideoId(input.value);
  input.setCustomValidity(input.value.trim()&&!valid?'Colle un lien vers une vidéo YouTube valide.':'');
  $('#preview-youtube').disabled=!valid;
  $('#youtube-search').href='https://www.youtube.com/results?search_query='+encodeURIComponent([form.elements.artist.value,form.elements.title.value].filter(Boolean).join(' '));
}
function listenSong(id,provider='youtube'){
  const song=state.songs.find(s=>s.id===id);if(!song)return;
  const source=providers[provider];if(!source?.id(song[source.field]))return;
  openQuickListen(song,provider);
}
function openListen(song,provider='youtube'){
  stopQuickListen();
  const source=providers[provider],id=source?.id(song[source.field]);if(!id)return;
  $('#listen-title').textContent=song.title||'Écoute '+source.name;
  $('#listen-artist').textContent=song.artist;
  $('#listen-chords').innerHTML=chordText(song).trim()?chords(song):'<p class="missing-lyrics">Accords non renseignés.</p>';
  $('#listen-lyrics').innerHTML=md(song.lyrics||'*Paroles non renseignées.*')+(song.note?'<h3>Notes</h3><p>'+esc(song.note).replace(/\n/g,'<br>')+'</p>':'');
  $('#youtube-external').href=source.url(id);
  $('#youtube-external').textContent='Ouvrir sur '+source.name+' ↗';
  $('.listen-help').textContent=source.hint+' Fermer cette fenêtre arrête la lecture.';
  $('#youtube-player').dataset.provider=provider;
  $('#youtube-player').replaceChildren(youtubeFrame(song));
  $('#listen-dialog').showModal();
}
$('#preview-youtube').onclick=()=>openListen(values());
$('#close-listen').onclick=()=>$('#listen-dialog').close();
$('#listen-dialog').addEventListener('close',()=>$('#youtube-player').replaceChildren());

const songPage=setupSongPage({form,state,values,esc,md,songGrid,renderGrid,inferLoop,labels,
  onEdit:()=>{},onBack:closeSong,
  onStep:direction=>{const id=songSequence[songSequence.indexOf(state.editing)+direction];if(id)openSong(id);},
  onNavigate:navigate,
  onListen:()=>openQuickListen({...values(),id:state.editing}),
  onMembership:async(id,checked)=>{try{await saveSets(state.setlists.map(s=>s.id===id?{...s,songIds:checked?[...new Set([...s.songIds,state.editing])]:s.songIds.filter(id=>id!==state.editing)}:s));toast(checked?'Morceau ajouté à la setlist':'Morceau retiré de la setlist');}catch(e){toast(e.message);}},
  onCreateSet:()=>{const songId=state.editing;nameDialog(async name=>{await saveSets([...state.setlists,{id:crypto.randomUUID(),name:name.trim(),songIds:[songId]}]);songPage.memberships();toast('Setlist créée et morceau ajouté');});}
});
// Keep playback mounted when its video is folded away.
const foldPlayer=document.createElement('button');foldPlayer.type='button';foldPlayer.id='quick-fold';foldPlayer.className='text-button';foldPlayer.textContent='Replier';foldPlayer.setAttribute('aria-expanded','true');
$('#quick-listen .quick-header').insertBefore(foldPlayer,$('#close-quick'));
foldPlayer.onclick=()=>{const collapsed=$('#quick-listen').classList.toggle('collapsed');foldPlayer.textContent=collapsed?'Déplier':'Replier';foldPlayer.setAttribute('aria-expanded',String(!collapsed));};
window.addEventListener('popstate',()=>{
  const match=location.hash.match(/^#song\/(.+)$/),old=state.editing;
  if(!canLeaveSong()){history.pushState(null,'','#song/'+encodeURIComponent(old));return;}
  initialForm=JSON.stringify(values());
  const id=match?decodeURIComponent(match[1]):null;
  if(id&&state.songs.some(s=>s.id===id))openSong(id,false,{fromHistory:true});else if(songPage.isOpen())leaveSong(false);
});

setupMetadata(form);
setupChordImport(form);
setupIrealImport(form);
try{const d=await api('/api/library');state.songs=d.songs;state.setlists=d.setlists;refreshOptions();render();const match=location.hash.match(/^#song\/(.+)$/);if(match){const id=decodeURIComponent(match[1]);if(state.songs.some(s=>s.id===id))openSong(id,false,{fromHistory:true});else{history.replaceState(null,'',location.pathname+location.search);toast('Morceau introuvable');}}}catch(e){$('#empty').hidden=false;$('#empty').textContent='Impossible de charger la collection. Relance l’application puis actualise cette page.';toast(e.message);}
