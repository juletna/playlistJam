import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSong,validateSong} from '../server.mjs';
test('Markdown : conserve les paroles multilignes et les métadonnées',()=>{const s=parseSong('---\ntitle: "Titre : été"\nartist: Test\nyear: null\nloop: unknown\n---\n\n## Couplet\nUne ligne\nUne autre\n','test');assert.equal(s.title,'Titre : été');assert.equal(s.lyrics,'## Couplet\nUne ligne\nUne autre');});
test('Validation : année, boucle et URL, décennie dérivée de l’année',()=>{const s={title:'Test',artist:'Artiste',year:1979,decade:1980,loop:'yes',style:'Rock',note:'',lyrics:'',lyricsUrl:'',chords:'A - D'};assert.equal(validateSong(s).decade,1970);assert.throws(()=>validateSong({...s,lyricsUrl:'javascript:alert(1)'}));assert.throws(()=>validateSong({...s,year:1979.5}));assert.throws(()=>validateSong({...s,loop:'maybe'}));});
