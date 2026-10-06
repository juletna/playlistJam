export function setupMetadata(form){
  const $=s=>document.querySelector(s),dialog=$('#song-dialog');
  let generation=0,controller,recording=null,lyrics=[],chosen=null;
  const status=text=>$('#metadata-status').textContent=text;
  const terms=()=>({title:form.elements.title.value.trim(),artist:form.elements.artist.value.trim()});
  function reset(){
    generation++;controller?.abort();recording=null;lyrics=[];chosen=null;
    $('#metadata-results').replaceChildren();$('#metadata-preview').hidden=true;status('');
    $('#metadata-search').disabled=false;$('#metadata-lyrics-only').disabled=false;
  }
  async function request(kind,query,signal){
    const r=await fetch('/api/metadata/'+kind+'?'+new URLSearchParams(query),{signal});
    const data=await r.json();if(!r.ok)throw Error(data.error||'Recherche indisponible.');return data;
  }
  const duration=s=>s?Math.floor(s/60)+':'+String(Math.round(s%60)).padStart(2,'0'):'';
  const summary=r=>[r.artist,r.album,r.date||r.year,duration(r.duration),r.description].filter(Boolean).join(' · ');
  function checkTerms(){const q=terms();if(!q.title||!q.artist){status('Renseigne le titre et l’artiste pour rechercher.');return null;}return q;}
  function updateApply(){
    $('#metadata-apply').disabled=!((recording?.year&&$('#import-year').checked)||(chosen&&($('#import-lyrics').checked||$('#import-source').checked)));
  }
  function showLyrics(){
    chosen=lyrics[Number($('#metadata-lyrics-select').value)]||null;
    $('#metadata-lyrics-preview').hidden=!chosen;
    if(chosen){
      $('#metadata-lyrics-text').textContent=chosen.text;
      $('#metadata-lyrics-source').href=chosen.source;
      $('#import-lyrics').checked=!form.elements.lyrics.value.trim();
      $('#import-source').checked=!form.elements.lyricsUrl.value.trim();
      $('#import-lyrics-label').textContent=form.elements.lyrics.value.trim()?'Remplacer les paroles déjà saisies':'Importer les paroles';
      $('#import-source-label').textContent=form.elements.lyricsUrl.value.trim()?'Remplacer le lien source des paroles':'Ajouter le lien source des paroles';
    }
    updateApply();
  }
  async function choose(result){
    controller?.abort();controller=new AbortController();const token=++generation;
    recording=result;chosen=null;lyrics=[];
    $('#metadata-preview').hidden=false;$('#metadata-lyrics-preview').hidden=true;$('#metadata-lyrics-label').hidden=true;
    $('#metadata-version').textContent=result?result.title+' — '+summary(result):'Recherche des paroles pour '+terms().title;
    $('#metadata-source').hidden=!result;if(result)$('#metadata-source').href=result.source;
    $('#import-year').disabled=!result?.year;$('#import-year').checked=!!result?.year&&!form.elements.year.value;
    $('#import-year-label').textContent=result?.year?(form.elements.year.value?'Remplacer l’année par ':'Importer l’année : ')+result.year+' (première sortie de cet enregistrement)':'Année non disponible';
    $('#metadata-lyrics-status').textContent='Recherche des paroles…';updateApply();
    try{
      const data=await request('lyrics',result?{title:result.title,artist:result.artist}:terms(),controller.signal);
      if(token!==generation)return;
      lyrics=data.lyrics;
      // The user still chooses and previews the version; closer durations appear first.
      if(result?.duration)lyrics.sort((a,b)=>Math.abs((a.duration||0)-result.duration)-Math.abs((b.duration||0)-result.duration));
      $('#metadata-lyrics-status').textContent=lyrics.length?'Vérifie la version et les paroles avant l’import.':'Aucune parole trouvée. Tu peux conserver ou saisir tes paroles manuellement.';
      $('#metadata-lyrics-select').replaceChildren(...lyrics.map((r,i)=>new Option(r.title+' — '+summary(r),String(i))));
      $('#metadata-lyrics-label').hidden=!lyrics.length;showLyrics();
    }catch(e){if(token===generation&&e.name!=='AbortError')$('#metadata-lyrics-status').textContent=e.message+' Tu peux quand même importer l’année.';}
  }
  $('#metadata-search').onclick=async()=>{
    reset();const q=checkTerms();if(!q)return;
    controller=new AbortController();const token=generation;$('#metadata-search').disabled=true;status('Recherche des versions sur MusicBrainz…');
    try{
      const data=await request('search',q,controller.signal);if(token!==generation)return;
      status(data.recordings.length?'Choisis la bonne version. Une version live ou une réédition peut avoir une autre année.':'Aucune version trouvée. Ajuste le titre ou l’artiste, ou cherche uniquement les paroles.');
      $('#metadata-results').replaceChildren(...data.recordings.map(r=>{
        const b=document.createElement('button');b.type='button';b.className='metadata-result';
        const title=document.createElement('strong');title.textContent=r.title;
        const detail=document.createElement('span');detail.textContent=summary(r)||'Informations incomplètes';
        b.append(title,detail);b.onclick=()=>{document.querySelectorAll('.metadata-result').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));choose(r);};return b;
      }));
    }catch(e){if(token===generation&&e.name!=='AbortError')status(e.message+' Tu peux chercher uniquement les paroles.');}
    finally{if(token===generation)$('#metadata-search').disabled=false;}
  };
  $('#metadata-lyrics-only').onclick=()=>{reset();if(checkTerms())choose(null);};
  $('#metadata-lyrics-select').onchange=showLyrics;
  for(const id of ['import-year','import-lyrics','import-source'])$('#'+id).onchange=updateApply;
  $('#metadata-cancel').onclick=reset;
  $('#metadata-apply').onclick=()=>{
    if(recording?.year&&$('#import-year').checked){form.elements.year.value=recording.year;form.elements.decade.value=Math.floor(recording.year/10)*10;}
    if(chosen&&$('#import-lyrics').checked)form.elements.lyrics.value=chosen.text;
    if(chosen&&$('#import-source').checked)form.elements.lyricsUrl.value=chosen.source;
    reset();form.dispatchEvent(new Event('input',{bubbles:true}));
    // Refresh a lyrics preview that was already open before importing.
    if(!$('#markdown-preview').hidden)$('#preview-tab').click();
    status('Informations appliquées. Tu peux les corriger puis enregistrer la fiche.');
  };
  for(const field of ['title','artist'])form.elements[field].addEventListener('input',reset);
  dialog.addEventListener('close',reset);
}
