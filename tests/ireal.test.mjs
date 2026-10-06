import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseIreal,unscramble,formatChart,quickChords} from '../public/ireal.js';
import {parseSong,validateSong} from '../server.mjs';
import {chordText} from '../public/chords.js';
const example=(await readFile(new URL('./fixtures/petes-waltz.txt',import.meta.url),'utf8')).trim();
test('lien fourni : métadonnées, sections et accords décodés dans l’ordre',()=>{
  const song=parseIreal(example);
  assert.equal(song.title,"Pete's Waltz");assert.equal(song.composer,'Martin Peter');assert.equal(song.key,'Eb');assert.equal(song.tempo,'100');
  assert.ok(song.raw.startsWith('[*AT34EbLZC-LZAbLZBbLZ'));
  assert.ok(song.text.includes('3/4 Eb | C- | Ab | Bb |'));
  assert.ok(song.text.includes('Bb-7/Bb | Bb-7/A | Bb-7/Ab | Bb-7/G |'));
  assert.deepEqual(song.text.match(/Section [A-Z]/g),['Section A','Section B','Section C']);assert.deepEqual(song.warnings,[]);
});
test('protocole ouvert : reprises, variantes, indications et symboles conservés',()=>{
  const song=parseIreal('irealbook://'+encodeURIComponent('Test=Compositeur=Swing=C=n=T44*A{C^7 |A-7 |N1D-9 |G7#5 }|N2C6 (Db^7/F) n |x |r |<D.S. al Coda>QZ'));
  assert.ok(song.text.includes('C^7 | A-7 | 1. D-9 | G7#5 𝄇'));assert.ok(song.text.includes('(Db^7/F) N.C.'));assert.ok(song.text.includes('D.S. al Coda'));assert.ok(song.text.includes('%%'));
  assert.deepEqual(formatChart('[C@Z').warnings,['Symboles non reconnus conservés : @']);
});
test('blocs de 50 caractères et queue de 51 non permutée',()=>{
  const s='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwx';assert.equal(s.length,50);
  assert.equal(unscramble(s),s);assert.equal(unscramble(s+'!'),s+'!');assert.equal(unscramble(unscramble(s+'!!')),s+'!!');
});
test('liens invalides et playlists refusés, augmentation conservée',()=>{
  for(const input of ['',null,'https://example.com','javascript:alert(1)','irealb://%ZZ','irealb://A=B=C','irealb://A=B==Swing=C==bad','irealbook://A=B=Swing=C=n=XYZ','irealbook://A=B=Swing=C=n=[C===B=C=Swing=C=n=[D','irealbook://'+ 'a'.repeat(50000)])assert.throws(()=>parseIreal(input));
  assert.ok(parseIreal('irealbook://A=B=Swing=C=n=[C+ Z').text.includes('C+'));
});
test('persistance Markdown, validation serveur et recherche',()=>{
  const song={title:'Test',artist:'Artiste',year:null,decade:2020,loop:'unknown',style:'',note:'',lyrics:'',lyricsUrl:'',chords:'',irealUrl:example};
  assert.equal(validateSong(song).irealUrl,example);assert.equal(validateSong({...song,irealUrl:undefined}).irealUrl,'');assert.throws(()=>validateSong({...song,irealUrl:'javascript:alert(1)'}));
  assert.equal(parseSong('---\nirealUrl: '+JSON.stringify(example)+'\n---\n','test').irealUrl,example);
  assert.ok(chordText(song).includes('Bb-7/Ab'));
});

test('aperçu et sections : ordre, reprises, variantes et aucune déduction de boucle',()=>{
  const song=parseIreal(example);
  assert.equal(song.summary,'Eb | C- | Ab | Bb');assert.deepEqual(song.sections.map(s=>s.name),['A','B','C']);
  assert.ok(song.sections[0].chords.startsWith('Eb | C- | Ab | Bb | Ab | Bb'));
  const chart=quickChords('*i[C |G]*A{A-7 |x |N1D-7 |G7 }*A[C6 |n |<Coda>QF^7 Z');
  assert.deepEqual(chart.sections.map(s=>[s.name,s.chords]),[['i','C | G'],['A','A-7 | % | D-7 | G7'],['A','C6 | N.C. | F^7']]);
  assert.equal(quickChords('[C |G |A- |F |D- |G7 Z').summary,'C | G | A- | F');
});
