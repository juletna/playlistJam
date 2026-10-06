import {parseDocument, DomUtils} from 'htmlparser2';

const host='www.chords-and-tabs.net';
const chord=/^[A-G](?:#|b|♯|♭)?(?:(?:maj|min|m|M|dim|aug|sus|add|ø|°|\+|-)?\d*)*(?:\([^\s()]+\))?(?:\/[A-G](?:#|b)?)?$/;
export function importUrl(value){
  let url;try{url=new URL(value);}catch{throw Error('Colle une URL de chanson Chords-and-tabs.net.');}
  if(!['https:','http:'].includes(url.protocol)||!['chords-and-tabs.net',host].includes(url.hostname)||url.username||url.password||url.port||!/^\/song\/name\/[a-z0-9-]+\/?$/i.test(url.pathname))throw Error('Seules les pages de chanson Chords-and-tabs.net sont prises en charge.');
  return 'https://'+host+url.pathname;
}
function sectionField(heading,started){
  const name=heading.toLowerCase();
  if(/^(intro|introduction)\b/.test(name)||(/^instrumental\b/.test(name)&&!started))return 'chordsIntro';
  if(/^(verse|couplet)\b/.test(name))return 'chordsVerse';
  if(/^(chorus|refrain)\b/.test(name))return 'chordsChorus';
  if(/^(bridge|pont)\b/.test(name))return /\b2\b/.test(name)?'chordsBridge2':'chordsBridge1';
  if(/^(outro|coda|ending)\b/.test(name))return 'chordsOutro';
  return null;
}
// Decode entities and preserve line breaks without executing source HTML.
function tabText(node){
  if(node.type==='text')return node.data;
  if(['script','style','iframe'].includes(node.name))return '';
  if(node.name==='br')return '\n';
  const text=(node.children||[]).map(tabText).join('');
  if(node.attribs?.class?.split(/\s+/).includes('song'))return '\n\uE000\n'+text+'\n\uE001\n';
  if(['sup','b','strong'].includes(node.name)&&chord.test(text.trim()))return '['+text.trim()+']';
  return ['div','p','pre'].includes(node.name)?'\n'+text+'\n':text;
}
function chordLine(line){
  const clean=line.replace(/\[([^\]]+)\]/g,'$1').split(/-->|\s;|\s\/\//)[0].trim();
  const repeat=clean.match(/\(?\b[x×]\s*(\d{1,2})\b\)?\s*$/i);
  const tokens=clean.replace(/\(?\b[x×]\s*\d{1,2}\b\)?/gi,'').split(/[\s|,]+/).filter(Boolean);
  if(!tokens.length||!tokens.every(t=>chord.test(t)||/^[-/]+$/.test(t)))return null;
  const sequence=tokens.filter(t=>chord.test(t));
  return sequence.length?Array.from({length:repeat?Math.min(16,Math.max(1,Number(repeat[1]))):1},()=>sequence).flat():null;
}
export function parseChordPage(html,source){
  const doc=parseDocument(html);
  const snippet=DomUtils.findOne(n=>n.attribs?.id==='snippet--snippetXteView',doc.children,true);
  if(!snippet)throw Error('Grille introuvable sur cette page. Choisis une version « chords » ou colle la grille manuellement.');
  const markedText=tabText(snippet).replace(/\r/g,'').replace(/\u00a0/g,' ').trim();
  const text=markedText.replace(/[\uE000\uE001]\n?/g,'');
  const titleNode=DomUtils.findOne(n=>n.name==='h1',doc.children,true);
  const title=titleNode?DomUtils.textContent(titleNode).replace(/\s+/g,' ').trim():'';
  const sections=[],lyrics=[],warnings=[];let current=null,started=false,hasHeading=false,inSong=false;
  const flush=()=>{if(current?.chords.length){const item={heading:current.heading,field:current.field,chords:current.chords.join(' ')};if(item.field)sections.push(item);else warnings.push('Section non affectée : '+item.heading+'.');}};
  for(const raw of markedText.split('\n')){
    const line=raw.trim();if(!line)continue;
    if(line==='\uE000'){inSong=true;continue;}if(line==='\uE001'){inSong=false;continue;}
    const heading=line.match(/^\[([^\]]+)\]\s*:?$/)||line.match(/^(Intro(?:duction)?|Verse(?:\s+\d+)?|Couplet(?:\s+\d+)?|Chorus(?:\s+\d+)?|Refrain(?:\s+\d+)?|Bridge(?:\s+\d+)?|Pont(?:\s+\d+)?|Outro|Coda|Instrumental)\s*:\s*$/i);
    if(heading&&!chord.test(heading[1])){
      flush();hasHeading=true;const field=sectionField(heading[1],started);
      current={heading:heading[1],field,chords:[]};if(field&&field!=='chordsIntro')started=true;
      lyrics.push('\n## '+heading[1]);continue;
    }
    if(!current){
      // Unlabelled grids are shown, but never guessed to be a repeating loop.
      if(!hasHeading&&chordLine(line))current={heading:'Sans section',field:null,chords:[]};else continue;
    }
    const standalone=chordLine(line);
    if(standalone){current.chords.push(...standalone);continue;}
    const inline=[...line.matchAll(/\[([^\]]+)\]/g)].map(m=>m[1]).filter(t=>chord.test(t));
    current.chords.push(...inline);
    const words=line.replace(/\[([^\]]+)\]/g,(all,t)=>chord.test(t)?'':all).trim();
    // Only lyrics explicitly marked by the site's song blocks are imported;
    // fingering charts and prose instructions remain in the raw preview.
    if(words&&inSong)lyrics.push(words);
  }
  flush();
  const unique=sections.filter((s,i)=>sections.findIndex(x=>x.field===s.field&&x.chords===s.chords)===i);
  if(!unique.length)warnings.push('Aucune section reconnue avec des accords. Consulte la grille ci-dessous.');
  if(unique.some(s=>unique.filter(x=>x.field===s.field).length>1))warnings.push('Plusieurs variantes : choisis celle à importer pour chaque section.');
  const info=[...text.matchAll(/^(?:Capo(?:dastre)?|Key|Tonalit[eé]|Tuning|Accordage)\s*:[^\n]+/gim)].map(m=>m[0]);
  for(const node of DomUtils.findAll(n=>['span','p'].includes(n.name),doc.children)){
    const value=DomUtils.textContent(node).trim();if(value.length<150&&/^(?:Capo(?:dastre)?|Key|Tonalit[eé]|Tuning|Accordage)\s*:/i.test(value))info.push(value);
  }
  return {title,source,sections:unique,lyrics:lyrics.some(l=>!l.startsWith('\n## '))?lyrics.join('\n').trim():'',text,notes:['Source des accords : '+source,...new Set(info)].join('\n'),warnings:[...new Set(warnings)]};
}
export function createChordImportService(fetcher=fetch,interval=1000){
  const cache=new Map();let queue=Promise.resolve(),last=0;
  return async value=>{
    const url=importUrl(value),cached=cache.get(url);if(cached&&Date.now()-cached.time<600000)return cached.promise;
    const work=async()=>{
      const delay=interval-(Date.now()-last);if(delay>0)await new Promise(r=>setTimeout(r,delay));last=Date.now();
      const signal=AbortSignal.timeout(12000);let target=url;
      try{
        for(let hop=0;hop<4;hop++){
          const response=await fetcher(target,{redirect:'manual',signal,headers:{'User-Agent':'PlaylistJam/1.0 (local repertoire app)',Accept:'text/html'}});
          if([301,302,303,307,308].includes(response.status)){
            await response.body?.cancel();const location=response.headers.get('location');if(!location)throw Error('Redirection invalide.');target=importUrl(new URL(location,target).href);continue;
          }
          if(!response.ok){await response.body?.cancel();throw Error(response.status===429?'Trop de demandes, réessaie dans un instant.':'La source ne répond pas correctement ('+response.status+').');}
          const type=response.headers.get('content-type');if(type&&!type.includes('text/html')){await response.body?.cancel();throw Error('La source n’a pas renvoyé une page HTML.');}
          const reader=response.body.getReader();let size=0;const chunks=[];
          try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1000000){await reader.cancel();throw Error('Page trop volumineuse.');}chunks.push(value);}}finally{reader.releaseLock();}
          return parseChordPage(Buffer.concat(chunks).toString('utf8'),target);
        }
        throw Error('Trop de redirections.');
      }catch(e){throw Error('Import des accords : '+(e.name==='TimeoutError'?'délai dépassé, réessaie.':e.message));}
    };
    const promise=queue.then(work);queue=promise.catch(()=>{});if(cache.size>=50)cache.delete(cache.keys().next().value);cache.set(url,{time:Date.now(),promise});promise.catch(()=>cache.delete(url));return promise;
  };
}
