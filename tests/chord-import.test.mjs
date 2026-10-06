import test from 'node:test';
import assert from 'node:assert/strict';
import {importUrl,parseChordPage,createChordImportService} from '../chord-import.mjs';

const url='https://www.chords-and-tabs.net/song/name/test-song-1';
const fixture=`<h1>Test &amp; Artiste — Morceau</h1><span>Tuning: E A D G B E</span>
<div id="snippet--snippetXteView">Accords et instructions
Capo: 2
CHORDS
C - x32010
[Instrumental]
<b>C</b> <b>G</b> (x2)
[Verse 1]
<div class="song"><sup>Am</sup>Texte &amp; test <sup>F</sup>suite
Une ligne sans accord</div>
[Verse 2]
<div class="song"><sup>Am7</sup>Autre <sup>F</sup>version</div>
[Chorus]
<div class="song"><sup>C</sup>Test <sup>G/B</sup>test</div>
[Chorus]
<div class="song"><sup>C</sup>Encore <sup>G/B</sup>test</div>
[Instrumental]
Dm E
[Bridge 2]
F#m7 C#7
[Outro]
C G C
<script>alert('ignored')</script></div>`;
test('sections, variantes, slash chords, paroles, source et informations de jeu',()=>{
  const r=parseChordPage(fixture,url);
  assert.deepEqual(r.sections,[
    {heading:'Instrumental',field:'chordsIntro',chords:'C G C G'},
    {heading:'Verse 1',field:'chordsVerse',chords:'Am F'},
    {heading:'Verse 2',field:'chordsVerse',chords:'Am7 F'},
    {heading:'Chorus',field:'chordsChorus',chords:'C G/B'},
    {heading:'Bridge 2',field:'chordsBridge2',chords:'F#m7 C#7'},
    {heading:'Outro',field:'chordsOutro',chords:'C G C'}
  ]);
  assert.match(r.lyrics,/Texte & test suite\nUne ligne sans accord/);
  assert.doesNotMatch(r.lyrics,/x32010|instructions|alert/);
  assert.match(r.notes,/Capo: 2/);assert.match(r.notes,/Tuning:/);assert.match(r.notes,/Source des accords/);
  assert.ok(r.warnings.some(w=>w.includes('Instrumental')));assert.ok(r.warnings.some(w=>w.includes('variantes')));
  assert.equal(r.title,'Test & Artiste — Morceau');
});
test('aucune boucle déduite d’une grille non structurée, page inconnue refusée',()=>{
  const r=parseChordPage('<div id="snippet--snippetXteView">Am G F Em</div>',url);
  assert.deepEqual(r.sections,[]);assert.equal(r.lyrics,'');assert.match(r.warnings.join(' '),/Aucune section/);
  assert.throws(()=>parseChordPage('<html>captcha</html>',url),/Grille introuvable/);
});
test('URL limitée à la source prise en charge, redirections externes refusées',async()=>{
  assert.equal(importUrl('http://chords-and-tabs.net/song/name/test-song-1?tracking=1#foo'),url);
  for(const value of ['https://localhost/song/name/test','https://www.chords-and-tabs.net.evil.test/song/name/a','https://user:pass@www.chords-and-tabs.net/song/name/a','https://www.chords-and-tabs.net:444/song/name/a','https://www.chords-and-tabs.net/search','file:///etc/passwd',null])assert.throws(()=>importUrl(value));
  let calls=0;const service=createChordImportService(async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://127.0.0.1/'}});},0);
  await assert.rejects(()=>service(url),/prises en charge/);assert.equal(calls,1);
});
test('cache, erreurs réessayables, taille et format de réponse limités',async()=>{
  let calls=0;const service=createChordImportService(async()=>{calls++;return calls===1?new Response('busy',{status:429}):new Response(fixture,{headers:{'content-type':'text/html'}});},0);
  await assert.rejects(()=>service(url),/Trop de demandes/);await service(url);await service(url);assert.equal(calls,2);
  await assert.rejects(()=>createChordImportService(async()=>new Response('x'.repeat(1000001),{headers:{'content-type':'text/html'}}),0)(url),/volumineuse/);
  await assert.rejects(()=>createChordImportService(async()=>new Response('{}',{headers:{'content-type':'application/json'}}),0)(url),/HTML/);
});
