import test from 'node:test';
import assert from 'node:assert/strict';
import {createMetadataService} from '../metadata.mjs';
test('recherche : dates des enregistrements, cache et champs limités',async()=>{
 let calls=0;const service=createMetadataService(async url=>{calls++;assert.ok(url.startsWith('https://musicbrainz.org/'));return {ok:true,json:async()=>({recordings:[{id:'abc',title:'Titre','artist-credit':[{name:'Artiste'}],'first-release-date':'1974-05',length:240000,releases:[{title:'Réédition',date:'2001'},{title:'Original',date:'1974'}]}]})};},0);
 const params=new URLSearchParams({title:'Titre',artist:'Artiste'});const result=await service.search(params);assert.equal(result.recordings[0].year,1974);assert.equal(result.recordings[0].album,'Original');assert.equal(result.recordings[0].duration,240);await service.search(params);assert.equal(calls,1);
 await assert.rejects(()=>service.search(new URLSearchParams({title:'a'})),/titre et un artiste/);
});
test('paroles : texte simple, absence et erreurs récupérables',async()=>{
 let calls=0;const service=createMetadataService(async()=>{calls++;return calls===1?{ok:false,status:429}:{ok:true,json:async()=>[{id:10,trackName:'Titre',artistName:'Artiste',plainLyrics:'Texte de test'},{id:11,instrumental:true}]};},0);
 const params=new URLSearchParams({title:'Titre',artist:'Artiste'});await assert.rejects(()=>service.lyrics(params),/LRCLIB.*Trop de demandes/);const result=await service.lyrics(params);assert.equal(result.lyrics.length,1);assert.equal(result.lyrics[0].text,'Texte de test');assert.equal(result.lyrics[0].source,'https://lrclib.net/api/get/10');
});
