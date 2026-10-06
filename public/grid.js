import {parseIreal,chartToken} from './ireal.js';
import {chordSections} from './chords.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Spaces separate symbols within a bar, except inside chord extensions.
function measureChords(text){
  const chords=[];let chord='',depth=0;
  for(const char of text.trim()){
    if(/\s/.test(char)&&depth===0){
      if(chord){chords.push(chord);chord='';}
    }else{
      chord+=char;
      if(char==='(')depth++;
      else if(char===')')depth=Math.max(0,depth-1);
    }
  }
  if(chord)chords.push(chord);
  return chords.length?chords:['—'];
}

// Build measures from explicit bar lines. Never guess a bar from an unmeasured chord list.
export function irealMeasures(raw){
  const sections=[];let section={name:'',measures:[]},measure=newMeasure(),barOpen=false;
  function newMeasure(){return {chords:[],marks:[],notes:[],startRepeat:false,endRepeat:false,final:false};}
  const populated=()=>measure.chords.length||measure.marks.length||measure.notes.length;
  function flush(empty=false){if(populated()||empty){section.measures.push(measure);measure=newMeasure();}}
  function endSection(){flush();if(section.measures.length)sections.push(section);}
  let remaining=raw,time='',lastChord='';
  while(remaining){
    const match=remaining.match(chartToken);
    if(!match){measure.notes.push(remaining[0]);remaining=remaining.slice(1);continue;}
    const token=match[0];remaining=remaining.slice(token.length);
    if(token==='XyQ'||/^[slY,\s]$/.test(token))continue;
    if(token.startsWith('*')){const repeat=measure.startRepeat,pendingTime=measure.chords.length?undefined:measure.time;endSection();section={name:token.slice(1),measures:[]};measure=newMeasure();measure.startRepeat=repeat;if(pendingTime)measure.time=pendingTime;barOpen=false;}
    else if(/^T\d/.test(token)){time=token==='T12'?'12/8':token[1]+'/'+token[2];measure.time=time;}
    else if(token==='['||token==='{'){flush();barOpen=true;if(token==='{')measure.startRepeat=true;}
    else if(token.startsWith('LZ')||token==='|'){flush(barOpen&&!populated());barOpen=true;}
    else if(token===']'||token==='}'||token==='Z'){
      if(populated())flush();
      const last=section.measures.at(-1);if(last){if(token==='}')last.endRepeat=true;if(token==='Z')last.final=true;}
      barOpen=false;
    }
    else if(/^N\d/.test(token))measure.marks.push(token.slice(1)+'.');
    else if(token.startsWith('<'))measure.notes.push(token.slice(1,-1).replace(/^\*\d{2}/,''));
    else if(token==='Kcl'){flush();measure.chords.push('%');flush();barOpen=false;}
    else if(['Q','S','f'].includes(token))measure.marks.push(({Q:'𝄌',S:'𝄋',f:'𝄐'})[token]);
    else if(['x','r','p','n'].includes(token))measure.chords.push(({x:'%',r:'%%',p:'/',n:'N.C.'})[token]);
    else {
      let chord=token;if(chord.startsWith('W'))chord=(lastChord||'W')+chord.slice(1);
      else if(!chord.startsWith('('))lastChord=chord.split('/')[0];
      measure.chords.push(chord);
    }
  }
  endSection();return sections;
}
export function songGrid(song){
  if(song.irealUrl)try{
    const chart=parseIreal(song.irealUrl);
    return {sections:irealMeasures(chart.raw),key:chart.key,tempo:chart.tempo,source:chart.source,warnings:chart.warnings,unmeasured:[],origin:'iReal Pro'};
  }catch(e){return {sections:[],unmeasured:[],warnings:[e.message],origin:'iReal Pro'};}
  const sections=[],unmeasured=[];
  const fields=chordSections.filter(([field])=>song[field]?.trim());
  for(const [field,label] of fields.length?fields:[['chords','Accords']]){
    const text=song[field]?.trim();if(!text)continue;
    if(!text.includes('|')){unmeasured.push({name:label,text});continue;}
    const parts=text.split('|');if(!parts[0].trim())parts.shift();if(!parts.at(-1)?.trim())parts.pop();
    sections.push({name:label,measures:parts.map(text=>({chords:measureChords(text),marks:[],notes:[],startRepeat:false,endRepeat:false,final:false}))});
  }
  return {sections,unmeasured,warnings:[],origin:'Accords par section'};
}

// Use the same bars as the full chart; section letters remain source labels.
export function songPreview(song){
  if(song.irealUrl){
    const grid=songGrid(song);
    const sections=grid.sections.filter(section=>section.measures.length);
    const section=sections.find(s=>/^[Vv]$/.test(s.name))||sections.find(s=>s.name==='A')||sections.find(s=>s.name==='B')||sections.find(s=>!/^i$/i.test(s.name))||sections[0];
    if(section)return measurePreview(section,section.name?'Section '+section.name+' · iReal':'Grille iReal');
  }
  const fields=[chordSections[1],chordSections[2],...chordSections.filter(([key])=>!['chordsVerse','chordsChorus'].includes(key))];
  const field=fields.find(([key])=>song[key]?.trim());
  if(field){
    const [key,label]=field;
    const grid=songGrid({[key]:song[key]});
    if(grid.sections.length)return measurePreview(grid.sections[0],label);
    return textPreview(song[key],label);
  }
  return song.chords?.trim()?textPreview(song.chords,'Ancien relevé'):{label:'',text:'',truncated:false};
}
function measurePreview(section,label){
  return {label,text:section.measures.slice(0,4).map(m=>m.chords.join(' ')||'—').join(' | '),truncated:section.measures.length>4};
}
function textPreview(text,label){
  // Keep extensions such as C7(b9 #11) intact and never infer bar lengths.
  const tokens=measureChords(text.replace(/\s+-\s+/g,' ').replace(/\s*\|\s*/g,' '));
  return {label,text:tokens.slice(0,8).join(' '),truncated:tokens.length>8};
}
export function renderGrid(grid){
  let index=0;
  const meta=[grid.origin,grid.key?'Tonalité '+grid.key:'',grid.tempo?'♩ '+grid.tempo:''].filter(Boolean).join(' · ');
  return `<div class="measure-chart"><p class="grid-meta">${escape(meta)}</p>${grid.warnings?.length?`<p class="grid-warning">${escape(grid.warnings.join(' '))}</p>`:''}${grid.sections.map(section=>`<section class="grid-section"><h3>${escape(section.name?(grid.origin==='iReal Pro'?'Section ':'')+section.name:'Grille')}</h3><ol class="measure-system">${section.measures.map(measure=>`<li class="measure ${measure.startRepeat?'repeat-start':''} ${measure.endRepeat?'repeat-end':''} ${measure.final?'bar-final':''}" aria-label="Mesure ${++index}"><small class="measure-number">${index}</small><div class="measure-marks">${escape([measure.time,...measure.marks].filter(Boolean).join(' · '))}</div><div class="measure-chords">${measure.chords.map(chord=>`<span class="${chord.startsWith('(')?'alternate-chord':''}">${escape(chord)}</span>`).join(' ')||'<span>—</span>'}</div>${measure.startRepeat?'<span class="repeat-sign start" aria-label="Début de reprise">𝄆</span>':''}${measure.endRepeat?'<span class="repeat-sign end" aria-label="Fin de reprise">𝄇</span>':''}${measure.notes.length?`<p class="measure-note">${escape(measure.notes.join(' '))}</p>`:''}</li>`).join('')}</ol></section>`).join('')}${grid.unmeasured?.length?`<div class="unmeasured-sections"><p>Ces accords n’ont pas encore de découpage en mesures. Dans la fiche, sépare les mesures avec <strong>|</strong>, par exemple <strong>C G | Am | F | G</strong>.</p>${grid.unmeasured.map(section=>`<p><strong>${escape(section.name)}</strong> · ${escape(section.text)}</p>`).join('')}</div>`:''}${!grid.sections.length&&!grid.unmeasured?.length?'<p>Aucune grille renseignée. Importe un lien iReal Pro ou saisis les mesures dans les accords par section.</p>':''}</div>`;
}
