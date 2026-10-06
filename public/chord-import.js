import {chordSections} from './chords.js';

export function setupChordImport(form){
  const $=s=>document.querySelector(s),dialog=$('#song-dialog');
  let generation=0,controller,result=null,choices=[];
  const status=text=>$('#chord-import-status').textContent=text;
  function reset(clearUrl=false){
    generation++;controller?.abort();result=null;choices=[];
    $('#chord-import-preview').hidden=true;$('#chord-import-fields').replaceChildren();
    $('#chord-import-fetch').disabled=false;status('');if(clearUrl)$('#chord-import-url').value='';
  }
  function searchLink(){
    $('#chord-import-search').href='https://www.google.com/search?'+new URLSearchParams({q:'site:chords-and-tabs.net/song/name/ '+form.elements.artist.value+' '+form.elements.title.value+' chords'});
  }
  function updateApply(){
    $('#chord-import-apply').disabled=!result||!(choices.some(c=>c.check.checked)||$('#chord-import-notes').checked||(!$('#chord-import-lyrics').disabled&&$('#chord-import-lyrics').checked));
  }
  function show(data){
    result=data;$('#chord-import-preview').hidden=false;
    $('#chord-import-title').textContent=data.title||'Grille importée';$('#chord-import-source').href=data.source;
    $('#chord-import-warnings').textContent=data.warnings.join(' ');
    $('#chord-import-text').textContent=data.text;$('#chord-import-notes-text').textContent=data.notes;
    choices=chordSections.flatMap(([field,label])=>{
      const versions=data.sections.filter(s=>s.field===field);if(!versions.length)return [];
      const row=document.createElement('div'),choice=document.createElement('label'),check=document.createElement('input'),caption=document.createElement('span'),select=document.createElement('select');
      row.className='chord-import-choice';choice.className='metadata-choice';check.type='checkbox';check.checked=!form.elements[field].value.trim();check.id='chord-import-'+field;
      caption.textContent=(form.elements[field].value.trim()?'Remplacer : ':'Importer : ')+label;choice.append(check,caption);
      select.setAttribute('aria-label','Version à importer — '+label);
      select.append(...versions.map((v,i)=>new Option(v.heading+' — '+v.chords,String(i))));
      check.onchange=updateApply;row.append(choice,select);$('#chord-import-fields').append(row);
      return [{field,check,select,versions}];
    });
    const hasLyrics=!!data.lyrics;$('#chord-import-lyrics').disabled=!hasLyrics;
    // Lyrics from a chord sheet can be incomplete; require explicit selection.
    $('#chord-import-lyrics').checked=false;$('#chord-import-lyrics-text').hidden=!hasLyrics;
    $('#chord-import-lyrics-text').textContent=data.lyrics;
    $('#chord-import-lyrics-label').textContent=!hasLyrics?'Paroles non disponibles dans cette grille':form.elements.lyrics.value.trim()?'Remplacer les paroles et leur lien source par celles de cette grille':'Importer les paroles de cette grille et leur lien source';
    $('#chord-import-notes').checked=true;updateApply();
  }
  $('#chord-import-fetch').onclick=async()=>{
    reset();const url=$('#chord-import-url').value.trim();if(!url){status('Colle l’URL d’une grille Chords-and-tabs.net.');return;}
    controller=new AbortController();const token=generation;$('#chord-import-fetch').disabled=true;status('Analyse de la grille…');
    try{
      const response=await fetch('/api/chords/import?'+new URLSearchParams({url}),{signal:controller.signal});
      const data=await response.json();if(!response.ok)throw Error(data.error||'Import indisponible.');
      if(token!==generation)return;show(data);status('Vérifie les variantes et coche les champs à remplir.');
    }catch(e){if(token===generation&&e.name!=='AbortError')status(e.message);}
    finally{if(token===generation)$('#chord-import-fetch').disabled=false;}
  };
  $('#chord-import-apply').onclick=()=>{
    if(!result)return;
    for(const c of choices)if(c.check.checked)form.elements[c.field].value=c.versions[Number(c.select.value)].chords;
    if($('#chord-import-lyrics').checked&&!$('#chord-import-lyrics').disabled){form.elements.lyrics.value=result.lyrics;form.elements.lyricsUrl.value=result.source;}
    if($('#chord-import-notes').checked){const notes=form.elements.note.value.trim();if(!notes.includes(result.notes))form.elements.note.value=[notes,result.notes].filter(Boolean).join('\n\n');}
    reset();form.dispatchEvent(new Event('input',{bubbles:true}));if(!$('#markdown-preview').hidden)$('#preview-tab').click();
    status('Grille appliquée. Tu peux corriger les accords puis enregistrer la fiche.');
  };
  for(const id of ['chord-import-lyrics','chord-import-notes'])$('#'+id).onchange=updateApply;
  $('#chord-import-cancel').onclick=()=>reset();$('#chord-import-url').oninput=()=>reset();
  for(const field of ['title','artist'])form.elements[field].addEventListener('input',()=>{reset();searchLink();});
  dialog.addEventListener('close',()=>reset(true));
  // Refresh the link when the existing editor opens a different song.
  dialog.addEventListener('songopen',()=>{reset(true);searchLink();});
  searchLink();
}
