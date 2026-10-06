import test from 'node:test';
import assert from 'node:assert/strict';
import {inferLoop} from '../public/chords.js';
import {parseSong,validateSong} from '../server.mjs';

test('un aperçu ou une seule section ne certifie pas une boucle',()=>{
  for(const song of [{},{loop:'yes',chords:'C G Am F'},{chordsVerse:'C G Am F'},{chordsIntro:'C G',chordsOutro:'C G'}])assert.equal(inferLoop(song).loop,'unknown');
});
test('compare les cycles ordonnés et leurs répétitions, en incluant les exceptions',()=>{
  const song={chords:'Autre aperçu',chordsVerse:'C - G - Am - F',chordsChorus:'C G Am F C G Am F'};
  assert.equal(inferLoop(song).loop,'yes');
  assert.equal(inferLoop({...song,chordsBridge1:'C Am G F'}).loop,'no');
  assert.equal(inferLoop({...song,chordsOutro:'Dm G'}).loop,'no');
  assert.equal(inferLoop({...song,chordsIntro:'C | G | Am | F'}).loop,'yes');
  assert.equal(inferLoop({chordsVerse:'C C G',chordsChorus:'C G'}).loop,'no');
});
test('conserve les qualités, basses et symboles incertains',()=>{
  assert.equal(inferLoop({chordsVerse:'Am7 F G/B',chordsChorus:'Am F G'}).loop,'no');
  assert.equal(inferLoop({chordsVerse:'F♯m7 C♯7',chordsChorus:'F#m7 C#7'}).loop,'yes');
  for(const text of ['C | % | G','C G x2','C G (à vérifier)','Repères : C G','C / G'])assert.equal(inferLoop({chordsVerse:'C G',chordsChorus:text}).loop,'unknown');
});
test('analyse toutes les sections iReal et ne devine pas les reprises',()=>{
  const link=raw=>'irealbook://'+encodeURIComponent('Test=Artist=Pop=C=n='+raw);
  assert.equal(inferLoop({irealUrl:link('*A[C|G]*B[C|G]')}).loop,'yes');
  assert.equal(inferLoop({irealUrl:link('*A[C|G]*B[C|Am]')}).loop,'no');
  assert.equal(inferLoop({irealUrl:link('*A[C|G]*B[C|x]')}).loop,'unknown');
  assert.equal(inferLoop({irealUrl:link('[C|G]')}).loop,'unknown');
});
test('lecture et sauvegarde recalculent une ancienne valeur manuelle',()=>{
  assert.equal(parseSong('---\ntitle: Test\nloop: yes\nchords: C G\n---\n','test').loop,'unknown');
  const song={title:'Test',artist:'Test',year:null,decade:2020,style:'',chords:'',lyrics:'',lyricsUrl:'',note:'',loop:'yes',chordsVerse:'C G',chordsChorus:'Am F'};
  assert.equal(validateSong(song).loop,'no');
});
