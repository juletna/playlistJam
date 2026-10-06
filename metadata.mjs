const userAgent='PlaylistJam/1.0 (local repertoire app)';
export function searchTerms(params){
  const title=params.get('title')?.trim(),artist=params.get('artist')?.trim();
  if(!title||!artist||title.length>200||artist.length>200)throw Error('Renseigne un titre et un artiste (200 caractères maximum chacun).');
  return {title,artist};
}
export function createMetadataService(fetcher=fetch,interval=1100){
  const cache=new Map();let queue=Promise.resolve(),last=0;
  async function remote(url,provider){
    const cached=cache.get(url);if(cached&&Date.now()-cached.time<600000)return cached.promise;
    const work=async()=>{
      if(provider==='MusicBrainz'){const delay=interval-(Date.now()-last);if(delay>0)await new Promise(r=>setTimeout(r,delay));last=Date.now();}
      try{
        const response=await fetcher(url,{headers:{'User-Agent':userAgent,Accept:'application/json'},signal:AbortSignal.timeout(12000)});
        if(!response.ok)throw Error(response.status===429?'Trop de demandes, réessaie dans un instant.':'Le service ne répond pas correctement.');
        return await response.json();
      }catch(e){throw Error(provider+' : '+(e.name==='TimeoutError'?'délai dépassé, réessaie.':e.message));}
    };
    const promise=provider==='MusicBrainz'?queue.then(work):work();
    if(provider==='MusicBrainz')queue=promise.catch(()=>{});
    if(cache.size>=100)cache.delete(cache.keys().next().value);
    cache.set(url,{time:Date.now(),promise});
    promise.catch(()=>cache.delete(url));return promise;
  }
  return {
    async search(params){
      const {title,artist}=searchTerms(params);
      const quote=s=>'"'+s.replace(/[\\"]/g,'\\$&')+'"';
      const url=new URL('https://musicbrainz.org/ws/2/recording/');
      url.search=new URLSearchParams({query:'recording:'+quote(title)+' AND artist:'+quote(artist),fmt:'json',limit:'12'});
      const data=await remote(url.href,'MusicBrainz');
      return {recordings:(data.recordings||[]).map(r=>{
        const date=r['first-release-date']||'',year=Number(date.slice(0,4));
        const releases=[...(r.releases||[])].sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
        return {id:r.id,title:r.title,artist:(r['artist-credit']||[]).map(a=>(a.name||a.artist?.name||'')+(a.joinphrase||'')).join(''),album:releases[0]?.title||'',date,year:year>=1900&&year<=2100?year:null,duration:r.length?Math.round(r.length/1000):null,description:r.disambiguation||'',source:'https://musicbrainz.org/recording/'+r.id};
      })};
    },
    async lyrics(params){
      const {title,artist}=searchTerms(params);
      const url=new URL('https://lrclib.net/api/search');url.search=new URLSearchParams({track_name:title,artist_name:artist});
      const data=await remote(url.href,'LRCLIB');
      return {lyrics:(Array.isArray(data)?data:[]).filter(r=>r.plainLyrics).slice(0,15).map(r=>({id:r.id,title:r.trackName,artist:r.artistName,album:r.albumName||'',duration:r.duration||null,text:r.plainLyrics.slice(0,160000),source:'https://lrclib.net/api/get/'+r.id}))};
    }
  };
}
