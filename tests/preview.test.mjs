import test from 'node:test';
import assert from 'node:assert/strict';
import {songPreview} from '../public/grid.js';
import {validateSong} from '../server.mjs';

test('aperçu : couplet avant intro et ancien relevé, mesures vides et extensions intactes',()=>{
  const song={chords:'D A',chordsIntro:'Dm | G',chordsVerse:'| C7(b9 #11) G/B | | Am | F | G |'};
  assert.deepEqual(songPreview(song),{label:'Couplet',text:'C7(b9 #11) G/B | — | Am | F',truncated:true});
  assert.equal(songPreview({...song,chordsVerse:'',chordsChorus:'F G Am'}).label,'Refrain');
  assert.equal(songPreview({...song,chordsVerse:''}).label,'Intro');
});
test('aperçu iReal : source prioritaire, intro évitée, lettres sans affectation inventée',()=>{
  const irealUrl='irealbook://Titre=Artiste=Swing=C=n=*i[C |G ]*A[A-7 |x |D-7 |G7 |C^7 Z';
  assert.deepEqual(songPreview({irealUrl,chordsVerse:'D A',chords:'E B'}),{label:'Section A · iReal',text:'A-7 | % | D-7 | G7',truncated:true});
  assert.equal(songPreview({irealUrl:'irealbook://Titre=Artiste=Swing=C=n=[C |G Z'}).label,'Grille iReal');
  assert.equal(songPreview({irealUrl:'invalid',chordsChorus:'F C'}).label,'Refrain');
});
test('aperçu non mesuré et ancien relevé : limite de huit symboles, aucune mesure inventée',()=>{
  assert.deepEqual(songPreview({chordsVerse:'C7(b9 #11) G/B Am F G C Dm G C'}),{label:'Couplet',text:'C7(b9 #11) G/B Am F G C Dm G',truncated:true});
  assert.deepEqual(songPreview({chords:'C - G - Am - F'}),{label:'Ancien relevé',text:'C G Am F',truncated:false});
  assert.deepEqual(songPreview({}),{label:'',text:'',truncated:false});
});
test('sauvegarde sans aperçu : champ facultatif, valeurs historiques conservées',()=>{
  const song={title:'Test',artist:'Test',year:null,decade:2020,style:'',note:'Personnel',lyrics:'Paroles',lyricsUrl:''};
  assert.ok(!('chords' in validateSong(song)));
  assert.ok(!('chords' in validateSong({...song,chords:''})));
  assert.equal(validateSong({...song,chords:'C G'}).chords,'C G');
  assert.throws(()=>validateSong({...song,chords:42}));
});
