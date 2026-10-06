// Format reference: https://www.irealpro.com/ireal-pro-custom-chord-chart-protocol/
// irealb permutes 50-character blocks; the last block (and a 51-character tail) stays intact.
export function unscramble(value) {
  let result='';
  for(let offset=0;offset<value.length;offset+=50){
    const block=value.slice(offset,offset+50).split('');
    if(value.length-offset>51)for(const index of [0,1,2,3,4,10,11,12,13,14,15,16,17,18,19,20,21,22,23]){
      const opposite=49-index;[block[index],block[opposite]]=[block[opposite],block[index]];
    }
    result+=block.join('');
  }
  return result;
}
export const chartToken=/^(XyQ|Kcl|LZ\|?|\*[A-Za-z]|T\d{2}|N\d|<[^>]*>|\([A-G][^)]*\)|[A-GW](?:[#b])?(?:(?:maj|min|add|sus|alt)|[-+^ho\d#b]|\([^)]*\))*(?:\/[A-G][#b]?)?|[\[\]{}|ZQSnxrpfs lY,\s])/;
export function formatChart(raw) {
  const lines=[],unknown=new Set();let cells=[],bars=0,hasChord=false;
  const add=value=>cells.push(value);
  const flush=()=>{if(cells.length){lines.push(cells.join(' ').trim());cells=[];bars=0;}};
  let remaining=raw;
  while(remaining){
    const match=remaining.match(chartToken);
    if(!match){unknown.add(remaining[0]);add(remaining[0]);remaining=remaining.slice(1);continue;}
    const token=match[0];remaining=remaining.slice(token.length);
    if(token==='XyQ'||/^[slY,\s]$/.test(token))continue;
    if(token.startsWith('*')){flush();add('Section '+token.slice(1));flush();}
    else if(/^T\d/.test(token)){add(token==='T12'?'12/8':token[1]+'/'+token[2]);}
    else if(token.startsWith('LZ')||token==='|'){add('|');if(++bars===4)flush();}
    else if(token==='Z'){add('‖');flush();}
    else if(token==='[')add('‖');else if(token===']'){add('‖');flush();}
    else if(token==='{')add('𝄆');else if(token==='}'){add('𝄇');flush();}
    else if(/^N\d/.test(token))add(token.slice(1)+'.');
    else if(token.startsWith('<'))add(token.slice(1,-1));
    else if(['Q','S','f','n','x','r','p','Kcl'].includes(token))add(({Q:'𝄌',S:'𝄋',f:'𝄐',n:'N.C.',x:'%',r:'%%',p:'/',Kcl:'% |'})[token]);
    else {hasChord=true;add(token);}
  }
  flush();
  if(!hasChord)throw Error('Ce lien ne contient pas de grille d’accords lisible.');
  return {text:lines.join('\n'),warnings:unknown.size?['Symboles non reconnus conservés : '+[...unknown].join(' ')]:[]};
}
// Compact progressions keep written order and repeat symbols, without inferring a global loop.
export function quickChords(raw){
  const sections=[];let name='',measures=[],measure=[];
  const endMeasure=()=>{if(measure.length){measures.push(measure.join(' '));measure=[];}};
  const endSection=()=>{endMeasure();if(measures.length)sections.push({name,chords:measures.join(' | '),measures});measures=[];};
  let remaining=raw;
  while(remaining){
    const match=remaining.match(chartToken);if(!match){remaining=remaining.slice(1);continue;}
    const token=match[0];remaining=remaining.slice(token.length);
    if(token.startsWith('*')){endSection();name=token.slice(1);}
    else if(/^(?:LZ\|?|[|\[\]{}Z])$/.test(token))endMeasure();
    else if(token==='Kcl'){measure.push('%');endMeasure();}
    else if(/^[A-G]/.test(token)||/^\([A-G]/.test(token))measure.push(token);
    else if(['x','r','p','n'].includes(token))measure.push(({x:'%',r:'%%',p:'/',n:'N.C.'})[token]);
  }
  endSection();
  return {summary:sections[0]?.measures.slice(0,4).join(' | ')||'',sections};
}
export function parseIreal(value) {
  if(typeof value!=='string'||value.length>50000)throw Error('Lien iReal Pro invalide ou trop volumineux.');
  const source=value.trim(),match=source.match(/^(irealb|irealbook):\/\/(.+)$/is);
  if(!match)throw Error('Colle un lien commençant par irealb:// ou irealbook://.');
  let decoded;try{decoded=decodeURIComponent(match[2]);}catch{throw Error('Encodage du lien iReal Pro invalide.');}
  if(/[\u0000-\u001f]/.test(decoded))throw Error('Lien iReal Pro invalide.');
  const fields=decoded.split('=');
  if(decoded.includes('==='))throw Error('Ce lien contient une playlist. Exporte un seul morceau pour cette fiche.');
  const modern=match[1].toLowerCase()==='irealb';
  if(modern?(fields.length<7||fields.length>10):fields.length!==6)throw Error('Format iReal Pro non reconnu. Colle le lien d’un seul morceau.');
  const [title,composer]=fields;const style=fields[modern?3:2],key=fields[modern?4:3];
  if(!title.trim()||!fields[modern?6:5])throw Error('Titre ou grille manquant dans le lien.');
  let raw=fields[modern?6:5];
  if(modern){if(!raw.startsWith('1r34LbKcu7'))throw Error('Version d’encodage iReal Pro non prise en charge.');raw=unscramble(raw.slice(10));}
  const chart=formatChart(raw);
  return {source,title,composer,style,key,tempo:modern?fields[8]||'':'',raw,...chart,...quickChords(raw)};
}
