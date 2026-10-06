import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSong,validateSong} from '../server.mjs';
test('Markdown : conserve les paroles multilignes et les métadonnées',()=>{const s=parseSong('---\ntitle: "Titre : été"\nartist: Test\nyear: null\nloop: unknown\n---\n\n## Couplet\nUne ligne\nUne autre\n','test');assert.equal(s.title,'Titre : été');assert.equal(s.lyrics,'## Couplet\nUne ligne\nUne autre');});
test('Validation : année, boucle et URL, décennie dérivée de l’année',()=>{const s={title:'Test',artist:'Artiste',year:1979,decade:1980,loop:'yes',style:'Rock',note:'',lyrics:'',lyricsUrl:'',chords:'A - D'};assert.equal(validateSong(s).decade,1970);assert.throws(()=>validateSong({...s,lyricsUrl:'javascript:alert(1)'}));assert.throws(()=>validateSong({...s,year:1979.5}));assert.equal(validateSong({...s,loop:'yes'}).loop,'unknown');assert.equal(validateSong({...s,loop:undefined,chordsVerse:'C G',chordsChorus:'C G'}).loop,'yes');});

test('YouTube : anciens fichiers, liens autorisés et refus des fausses origines',async()=>{
  const {youtubeVideoId}=await import('../public/youtube.js');
  for(const url of ['https://youtu.be/dQw4w9WgXcQ?si=abc','https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=foo','https://m.youtube.com/shorts/dQw4w9WgXcQ','https://youtube.com/live/dQw4w9WgXcQ'])assert.equal(youtubeVideoId(url),'dQw4w9WgXcQ');
  for(const url of ['https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ','javascript:alert(1)','https://youtube.com/playlist?list=foo','https://youtu.be/invalid','https://user@youtube.com/watch?v=dQw4w9WgXcQ'])assert.equal(youtubeVideoId(url),null);
  const song={title:'Test',artist:'Artiste',year:null,decade:2020,loop:'yes',style:'',note:'',lyrics:'',lyricsUrl:'',chords:''};
  assert.equal(validateSong(song).youtubeUrl,'');
  assert.equal(validateSong({...song,youtubeUrl:' https://youtu.be/dQw4w9WgXcQ '}).youtubeUrl,'https://youtu.be/dQw4w9WgXcQ');
  assert.throws(()=>validateSong({...song,youtubeUrl:'https://example.com'}));
});
