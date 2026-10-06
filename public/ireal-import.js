import {irealMeasures,renderGrid} from './grid.js';
import {chordSections} from './chords.js';
import {parseIreal} from './ireal.js';
export function setupIrealImport(form){
  const $=id=>document.getElementById(id);let result=null,accordChoices=[];
  function saved(){
    const source=form.elements.irealUrl.value;const box=$('ireal-saved');box.hidden=!source;
    if(source)try{const song=parseIreal(source);$('ireal-saved-text').innerHTML=renderGrid({sections:irealMeasures(song.raw),origin:'iReal Pro',key:song.key,tempo:song.tempo});$('ireal-open').href=song.source;$('ireal-saved-info').textContent=info(song);}catch{box.hidden=true;}
  }
  function info(song){return [song.title,song.composer,song.style,'Tonalité : '+song.key,song.tempo?'Tempo : '+song.tempo:''].filter(Boolean).join(' · ');}
  function reset(){result=null;accordChoices=[];$('ireal-accord-fields').replaceChildren();$('ireal-preview').hidden=true;$('ireal-status').textContent='';}
  $('ireal-analyze').onclick=()=>{
    reset();try{result=parseIreal($('ireal-input').value);$('ireal-info').textContent=info(result);$('ireal-chart').innerHTML=renderGrid({sections:irealMeasures(result.raw),origin:'iReal Pro',key:result.key,tempo:result.tempo});$('ireal-warning').textContent=result.warnings.join(' ');
      for(const [field,key] of [['title','title'],['artist','composer'],['style','style']]){
        const check=$('ireal-'+field);check.disabled=!result[key];check.checked=!!result[key]&&!form.elements[field].value.trim();
      }
      const proposals=result.sections.map(section=>({label:section.name?'Section '+section.name:'Sans section',field:({i:'chordsIntro',I:'chordsIntro',V:'chordsVerse',v:'chordsVerse',A:'chordsVerse',B:'chordsChorus',C:'chordsBridge1',D:'chordsBridge2'})[section.name]||'',chords:section.chords}));
      const assigned=new Set();
      accordChoices=proposals.filter(p=>p.chords).map(proposal=>{
        const row=document.createElement('div'),label=document.createElement('label'),check=document.createElement('input'),caption=document.createElement('span'),select=document.createElement('select'),progression=document.createElement('p');
        row.className='chord-import-choice';label.className='metadata-choice';check.type='checkbox';
        const field=assigned.has(proposal.field)?'':proposal.field;if(field)assigned.add(field);
        check.checked=!!field&&!form.elements[field].value.trim();caption.textContent=proposal.label;label.append(check,caption);
        select.setAttribute('aria-label','Destination — '+proposal.label);
        select.append(new Option('Ne pas affecter',''),...chordSections.map(([key,name])=>new Option(name,key)));select.value=field;
        progression.textContent=proposal.chords;progression.className='metadata-help';
        row.append(label,select,progression);$('ireal-accord-fields').append(row);
        select.onchange=()=>{check.checked=!!select.value&&!form.elements[select.value].value.trim();};
        return {check,select,chords:proposal.chords};
      });
      $('ireal-preview').hidden=false;$('ireal-status').textContent=form.elements.irealUrl.value?'Appliquer remplacera la grille iReal Pro actuelle.':'Vérifie le morceau et la grille avant d’appliquer.';
    }catch(e){$('ireal-status').textContent=e.message;}
  };
  $('ireal-apply').onclick=()=>{
    if(!result)return;const song=result;
    const selected=accordChoices.filter(c=>c.check.checked&&c.select.value),targets=selected.map(c=>c.select.value);
    if(new Set(targets).size!==targets.length){$('ireal-status').textContent='Choisis un champ différent pour chaque section cochée.';return;}
    for(const choice of selected)form.elements[choice.select.value].value=choice.chords;
    for(const [field,key] of [['title','title'],['artist','composer'],['style','style']])if($('ireal-'+field).checked)form.elements[field].value=song[key];
    form.elements.irealUrl.value=song.source;reset();saved();form.dispatchEvent(new Event('input',{bubbles:true}));$('ireal-status').textContent='Grille appliquée. Clique sur Enregistrer pour la sauvegarder.';
  };
  $('ireal-remove').onclick=()=>{form.elements.irealUrl.value='';saved();form.dispatchEvent(new Event('input',{bubbles:true}));};
  $('ireal-input').oninput=reset;$('ireal-cancel').onclick=reset;
  $('song-dialog').addEventListener('songopen',()=>{reset();$('ireal-input').value='';saved();});
}
