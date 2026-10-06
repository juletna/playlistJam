// The song workspace owns presentation; app.js keeps persistence and playback.
export function setupSongPage({form, state, values, esc, md, songGrid, renderGrid, inferLoop, labels, onEdit, onBack, onStep, onNavigate, onListen, onMembership, onCreateSet}) {
  const $=s=>document.querySelector(s), root=$('#song-dialog');
  let editing=false, activeTab='play', toolTrigger=null;
  const oldTop=form.querySelector('.dialog-top');
  const header=document.createElement('header');header.className='song-header';
  header.innerHTML=`<div class="song-breadcrumb"><button type="button" id="song-menu-toggle" class="button" aria-label="Afficher ou masquer la navigation" aria-expanded="true">☰</button><button type="button" id="close-song" class="text-button">← Collection</button><div class="song-paging"><button type="button" id="song-prev" aria-label="Morceau précédent">‹</button><span id="song-position"></span><button type="button" id="song-next" aria-label="Morceau suivant">›</button></div></div>
    <div class="song-identity"><span class="eyebrow">LE CARNET · FICHE CHANSON</span><h1 id="song-heading" tabindex="-1"></h1><p id="song-subtitle"></p><div id="song-memberships"></div></div>
    <div class="song-actions"><button type="button" class="button" id="song-listen">▶ Écouter</button><details id="song-set-menu"><summary class="button">+ Setlist</summary><div class="song-set-popover"><label>Ajouter à une setlist<input type="search" id="song-set-search" placeholder="Rechercher une setlist…"></label><div id="song-set-options"></div><p id="song-set-help"></p><button type="button" class="text-button" id="song-create-set">+ Créer une setlist…</button></div></details><button type="button" class="button" id="song-rehearse" aria-pressed="false">Mode répétition</button><button type="button" class="button dark" id="song-edit">Modifier</button><details id="song-more"><summary class="button" aria-label="Autres actions">⋯</summary><div class="song-more-actions"></div></details></div>
    <div class="song-tabs" role="tablist" aria-label="Contenu de la fiche"><button type="button" role="tab" id="tab-play" data-song-tab="play" aria-controls="panel-play">Jouer</button><button type="button" role="tab" id="tab-lyrics" data-song-tab="lyrics" aria-controls="panel-lyrics">Paroles</button><button type="button" role="tab" id="tab-info" data-song-tab="info" aria-controls="panel-info">Informations</button></div>`;
  // Keep existing actions and field IDs so the import adapters share one form.
  const more=header.querySelector('.song-more-actions');
  for(const id of ['song-grid-open','download-song','delete-song'])more.append($('#'+id));
  oldTop.replaceWith(header);
  const content=$('.song-dialog-content');
  const original=[...content.children];
  content.innerHTML=`<section id="panel-play" role="tabpanel" aria-labelledby="tab-play"><div class="song-section-heading"><h2>Grille d’accords</h2><button type="button" class="button enrichment" data-tool="chords">Importer une grille</button></div><div id="song-loop"></div><div id="song-chart"></div><div class="song-editor-fields" id="song-chord-fields"></div><div id="song-play-notes"></div></section>
    <section id="panel-lyrics" role="tabpanel" aria-labelledby="tab-lyrics" hidden><div class="song-section-heading"><h2>Paroles</h2><button type="button" class="button enrichment" data-tool="lyrics">Rechercher les paroles</button></div><div id="song-lyrics-read" class="markdown"></div><div id="song-lyrics-source"></div><div class="song-editor-fields" id="song-lyrics-fields"></div></section>
    <section id="panel-info" role="tabpanel" aria-labelledby="tab-info" hidden><div class="song-section-heading"><h2>Informations</h2><button type="button" class="button enrichment" data-tool="metadata">Rechercher les informations</button></div><div id="song-info-read"></div><div class="song-editor-fields" id="song-info-fields"></div></section>`;
  const drawer=document.createElement('aside');drawer.id='song-tools';drawer.hidden=true;drawer.setAttribute('aria-label','Compléter la fiche');
  drawer.innerHTML=`<div class="song-tools-heading"><h2 id="song-tools-title">Compléter la fiche</h2><button type="button" id="song-tools-close" class="close" aria-label="Fermer le panneau d’import">×</button></div><div id="song-tool-sources"><button type="button" class="button" data-import-source="ireal">iReal Pro</button><button type="button" class="button" data-import-source="chords">Chords-and-tabs</button></div><p class="metadata-help">Applique les champs souhaités, puis enregistre la fiche.</p><div id="song-tool-content"></div>`;
  form.append(drawer);
  for(const node of original){
    if(node.matches('.metadata-panel'))$('#song-tool-content').append(node);
    else if(node.matches('.section-chords'))$('#song-chord-fields').append(node);
    else if(node.matches('.lyrics-label,#lyrics-editor,#markdown-preview')||node.querySelector('[name=lyricsUrl]'))$('#song-lyrics-fields').append(node);
    else $('#song-info-fields').append(node);
  }
  const footer=form.querySelector('.dialog-bottom');footer.classList.add('song-savebar');
  $('#cancel-song').textContent='Annuler';
  const player=document.createElement('div');player.id='song-player-slot';header.querySelector('.song-tabs').before(player);
  $('#close-song').onclick=onBack;$('#song-prev').onclick=()=>onStep(-1);$('#song-next').onclick=()=>onStep(1);
  $('#song-edit').onclick=()=>{onEdit();setEditing(true);};
  $('#song-listen').onclick=onListen;
  $('#song-menu-toggle').onclick=()=>{document.body.classList.toggle('song-sidebar-hidden');syncMenu();};
  function syncMenu(){const collapsed=document.body.classList.contains('song-sidebar-hidden');$('#song-menu-toggle').setAttribute('aria-expanded',String(!collapsed));}
  $('#song-rehearse').onclick=()=>{
    if(editing)return;
    const enabled=root.classList.toggle('rehearsing');document.body.classList.toggle('song-rehearsing',enabled);
    $('#song-rehearse').textContent=enabled?'Quitter la répétition':'Mode répétition';$('#song-rehearse').setAttribute('aria-pressed',String(enabled));
    if(enabled){closeTools();tab('play');}else tab(activeTab);
  };
  $('.song-tabs').onclick=e=>{const b=e.target.closest('[data-song-tab]');if(b)tab(b.dataset.songTab);};
  $('.song-tabs').onkeydown=e=>{
    const tabs=[...document.querySelectorAll('[data-song-tab]')],i=tabs.indexOf(document.activeElement);
    if(i<0||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
    const n=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;tab(tabs[n].dataset.songTab);tabs[n].focus();
  };
  function tab(name){
    activeTab=name;root.dataset.tab=name;
    document.querySelectorAll('[data-song-tab]').forEach(b=>{const active=b.dataset.songTab===name;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
    for(const key of ['play','lyrics','info'])$('#panel-'+key).hidden=key!==name&&!(root.classList.contains('rehearsing')&&key==='lyrics');
  }
  function source(name){
    $('#song-tool-sources').hidden=!['ireal','chords'].includes(name);
    for(const node of $('#song-tool-content').children)node.hidden=name==='ireal'?!node.matches('.ireal-panel'):name==='chords'?!node.matches('.chord-import-panel'):node.matches('.ireal-panel,.chord-import-panel');
    document.querySelectorAll('[data-import-source]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.importSource===name)));
    $('#song-tools-title').textContent=name==='ireal'||name==='chords'?'Importer une grille':name==='lyrics'?'Rechercher les paroles':'Rechercher les informations';
  }
  function openTools(name,trigger){
    if(!editing)return;toolTrigger=trigger;drawer.hidden=false;source(name==='chords'?'ireal':name);
    $('#song-tools-close').focus();
    if(name==='lyrics')$('#metadata-lyrics-only').click();
  }
  function closeTools(){drawer.hidden=true;toolTrigger?.focus({preventScroll:true});toolTrigger=null;}
  content.addEventListener('click',e=>{const b=e.target.closest('[data-tool]');if(b)openTools(b.dataset.tool,b);});
  $('#song-tool-sources').onclick=e=>{const b=e.target.closest('[data-import-source]');if(b)source(b.dataset.importSource);};
  $('#song-tools-close').onclick=closeTools;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!drawer.hidden){e.preventDefault();closeTools();}});
  // Reveal the correct tab before browser validation tries to focus a hidden field.
  form.addEventListener('invalid',e=>{const panel=e.target.closest('[role=tabpanel]');if(panel){setEditing(true);tab(panel.id.replace('panel-',''));}},true);
  $('#song-set-search').oninput=memberships;
  $('#song-set-search').onkeydown=e=>{if(e.key==='Enter')e.preventDefault();};
  document.addEventListener('click',e=>{for(const id of ['song-set-menu','song-more'])if(!$('#'+id).contains(e.target))$('#'+id).open=false;});
  let membershipBusy=false;
  $('#song-set-options').onchange=async e=>{
    const input=e.target.closest('[data-song-set]');if(!input||membershipBusy)return;membershipBusy=true;
    $('#song-set-options').querySelectorAll('input').forEach(n=>n.disabled=true);
    try{await onMembership(input.dataset.songSet,input.checked);}finally{membershipBusy=false;memberships();}
  };
  $('#song-create-set').onclick=()=>{if(!membershipBusy)onCreateSet();};
  $('#song-memberships').onclick=e=>{const b=e.target.closest('[data-song-view]');if(b)onNavigate(b.dataset.songView);};
  function memberships(){
    const saved=state.songs.some(s=>s.id===state.editing),q=$('#song-set-search').value.trim().toLocaleLowerCase();
    $('#song-memberships').innerHTML=state.setlists.filter(s=>s.songIds.includes(state.editing)).map(s=>`<button type="button" class="playlist-tag" data-song-view="${esc(s.id)}">${esc(s.name)}</button>`).join('');
    const sets=state.setlists.filter(s=>s.name.toLocaleLowerCase().includes(q));
    $('#song-set-options').innerHTML=sets.map(s=>`<label><input type="checkbox" data-song-set="${esc(s.id)}" ${s.songIds.includes(state.editing)?'checked':''} ${!saved||membershipBusy?'disabled':''}>${esc(s.name)}</label>`).join('');
    $('#song-set-help').textContent=!saved?'Enregistre d’abord ce nouveau morceau.':!sets.length?'Aucune setlist correspondante.':'Les changements sont enregistrés immédiatement.';
    $('#song-create-set').disabled=!saved||membershipBusy;
  }
  function refresh(){
    const s=values(),loop=inferLoop(s);
    $('#song-heading').textContent=s.title||'Nouveau morceau';
    $('#song-subtitle').textContent=[s.artist,s.year,s.style].filter(Boolean).join(' · ')||'Commence par le titre et l’artiste.';
    $('#song-chart').innerHTML=renderGrid(songGrid(s));
    $('#song-loop').innerHTML=`<span class="status ${loop.loop}">${labels[loop.loop]}</span><span>${esc(loop.reason)}</span>`;
    $('#song-play-notes').innerHTML=s.note?`<h3>Notes</h3><p>${esc(s.note).replace(/\n/g,'<br>')}</p>`:'';
    $('#song-lyrics-read').innerHTML=md(s.lyrics||'*Aucune parole enregistrée.*');
    $('#song-lyrics-source').innerHTML=/^https?:\/\//i.test(s.lyricsUrl)?`<a href="${esc(s.lyricsUrl)}" target="_blank" rel="noopener noreferrer">Source des paroles ↗</a>`:'';
    $('#song-info-read').innerHTML=`<dl>${[['Titre',s.title],['Artiste',s.artist],['Année',s.year],['Décennie',s.decade+'s'],['Style',s.style]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v||'Non renseigné')}</dd></div>`).join('')}</dl>${/^https?:\/\//i.test(s.youtubeUrl)?`<p><a href="${esc(s.youtubeUrl)}" target="_blank" rel="noopener noreferrer">Version YouTube ↗</a></p>`:''}<h3>Notes et sources</h3><p class="song-notes">${esc(s.note||'Aucune note renseignée.')}</p>`;
    $('#song-listen').disabled=!form.elements.youtubeUrl.value||$('#preview-youtube').disabled;
    if(state.songs.some(song=>song.id===state.editing)&&$('#song-position').textContent==='Nouveau')$('#song-position').textContent='';
    memberships();
  }
  function setEditing(enabled){
    editing=enabled;root.classList.toggle('editing',enabled);footer.hidden=!enabled;$('#song-edit').hidden=enabled;$('#song-rehearse').disabled=enabled;$('#song-rehearse').hidden=enabled;
    if(enabled&&root.classList.contains('rehearsing')){root.classList.remove('rehearsing');document.body.classList.remove('song-rehearsing');$('#song-rehearse').textContent='Mode répétition';$('#song-rehearse').setAttribute('aria-pressed','false');tab(activeTab);}
    $('.song-identity .eyebrow').textContent=enabled?'MODIFICATION DU MORCEAU':'LE CARNET · FICHE CHANSON';
    $('#tab-play').textContent=enabled?'Accords':'Jouer';
    $('#panel-play .song-section-heading h2').textContent=enabled?'Modifier les accords':'Grille d’accords';
    $('#panel-lyrics .song-section-heading h2').textContent=enabled?'Modifier les paroles':'Paroles';
    $('#panel-info .song-section-heading h2').textContent=enabled?'Modifier les informations':'Informations';
    if(!enabled)closeTools();
  }
  function open({edit=false,sequence=[],origin='Collection',fresh=false}={}){
    root.hidden=false;document.body.classList.add('song-open-page');$('#library-page').hidden=true;
    if(fresh)document.body.classList.toggle('song-sidebar-hidden',matchMedia('(max-width:760px)').matches);
    $('#close-song').textContent='← '+origin;
    const index=sequence.indexOf(state.editing);$('#song-position').textContent=index>=0?`${index+1} / ${sequence.length}`:'Nouveau';
    $('#song-prev').disabled=index<=0;$('#song-next').disabled=index<0||index>=sequence.length-1;
    $('#song-set-menu').open=false;$('#song-more').open=false;$('#song-set-search').value='';
    setEditing(edit);tab(edit&&!state.songs.some(s=>s.id===state.editing)?'info':'play');syncMenu();refresh();
    $('#song-heading').focus({preventScroll:true});
  }
  function close(){
    closeTools();root.hidden=true;root.classList.remove('rehearsing');$('#song-rehearse').textContent='Mode répétition';$('#song-rehearse').setAttribute('aria-pressed','false');
    document.body.classList.remove('song-open-page','song-rehearsing','song-sidebar-hidden');$('#library-page').hidden=false;
  }
  return {open,close,refresh,setEditing,tab,memberships,isOpen:()=>!root.hidden,closeTools};
}
