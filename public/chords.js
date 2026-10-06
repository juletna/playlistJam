import {parseIreal} from './ireal.js';
export const chordSections = [
  ['chordsIntro', 'Intro'],
  ['chordsVerse', 'Couplet'],
  ['chordsChorus', 'Refrain'],
  ['chordsBridge1', 'Bridge 1'],
  ['chordsBridge2', 'Bridge 2'],
  ['chordsOutro', 'Outro']
];
export function chordText(song) {
  let ireal='';if(song.irealUrl)try{ireal=parseIreal(song.irealUrl).text;}catch{}
  return [ireal,song.chords, ...chordSections.map(([key]) => song[key])].filter(Boolean).join(' ');
}

// Only ordered section progressions are evidence; the overview is a chord inventory.
function progression(text) {
  const tokens=text.trim().replace(/[♯]/g,'#').replace(/[♭]/g,'b')
    .split(/\s*[|‖–—]\s*|\s+-\s+|[\s,]+/).filter(Boolean);
  const chord=/^[A-G][#b]?(?:(?:maj|min|m|dim|aug|add|sus|alt)|[-+^ho°ø\d#b]|\([\d#b,+-]+\))*(?:\/[A-G][#b]?)?$/;
  if(!tokens.length||tokens.some(token=>!chord.test(token)))return null;
  // A section can write the same cycle twice (or more).
  for(let size=1;size<=tokens.length;size++){
    if(tokens.length%size===0&&tokens.every((token,i)=>token===tokens[i%size]))return tokens.slice(0,size).join(' ');
  }
}
export function inferLoop(song) {
  const sections=chordSections.filter(([key])=>song[key]?.trim()).map(([key,label])=>({label,chords:song[key]}));
  let incomplete=false,completeChart=false;
  if(song.irealUrl)try{
    const chart=parseIreal(song.irealUrl);
    sections.push(...chart.sections.map(section=>({label:'iReal '+(section.name||'grille'),chords:section.chords})));
    incomplete=chart.warnings.length>0;
    completeChart=chart.sections.length>=2;
  }catch{incomplete=true;}
  const cycles=sections.map(section=>progression(section.chords));
  const known=cycles.filter(Boolean);
  if(new Set(known).size>1)return {loop:'no',reason:'Les sections présentent des progressions différentes.'};
  if(incomplete||cycles.some(cycle=>!cycle))return {loop:'unknown',reason:'Une partie de la grille ne peut pas être comparée automatiquement.'};
  if(known.length<2||(!completeChart&&(!song.chordsVerse?.trim()||!song.chordsChorus?.trim())))
    return {loop:'unknown',reason:'Renseigne au moins le couplet et le refrain, ainsi que les autres sections présentes dans le morceau.'};
  return {loop:'yes',reason:'Même cycle dans toutes les sections renseignées. Ajoute les éventuels ponts, intro et outro pour vérifier le morceau entier.'};
}
