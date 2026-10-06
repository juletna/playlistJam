import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {irealMeasures,songGrid,renderGrid} from '../public/grid.js';
const link=(await readFile(new URL('./fixtures/petes-waltz.txt',import.meta.url),'utf8')).trim();
test('vraies mesures du lien fourni et plusieurs accords dans une seule case',()=>{
  const grid=songGrid({irealUrl:link});assert.deepEqual(grid.sections.map(s=>s.name),['A','B','C']);
  assert.equal(grid.sections[0].measures.length,16);assert.equal(grid.sections[1].measures.length,16);
  assert.deepEqual(grid.sections[0].measures[0].chords,['Eb']);assert.equal(grid.sections[0].measures[0].time,'3/4');
  assert.deepEqual(irealMeasures('[C G |A-7 Z')[0].measures.map(m=>m.chords),[['C','G'],['A-7']]);
});
test('reprises, mesures vides, fins, indications et accords alternatifs',()=>{
  const [a,b]=irealMeasures('T44*A{C |x |N1D-7 |G7 }|N2C6 (Db^7/F) n ]*B[|r |<D.S. al Coda>QF^7 Z');
  assert.equal(a.measures[0].time,'4/4');assert.ok(a.measures[0].startRepeat);assert.ok(a.measures[3].endRepeat);assert.deepEqual(a.measures[2].marks,['1.']);assert.deepEqual(a.measures[4].marks,['2.']);
  assert.deepEqual(a.measures[4].chords,['C6','(Db^7/F)','N.C.']);assert.deepEqual(b.measures[0].chords,[]);assert.ok(b.measures.at(-1).final);assert.deepEqual(b.measures.at(-1).notes,['D.S. al Coda']);
});
test('pas de mesures inventées ; basses et échappement des sources',()=>{
  const grid=songGrid({chordsVerse:'C G Am F',chordsChorus:'| F G | Am | | C/G |'});
  assert.equal(grid.unmeasured.length,1);assert.equal(grid.sections[0].measures.length,4);assert.deepEqual(grid.sections[0].measures.at(-1).chords,['C/G']);
  const html=renderGrid({sections:[{name:'<script>',measures:[{chords:['<img>'],marks:[],notes:['<iframe>']}]}],origin:'Test'});
  assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;img&gt;'));assert.ok(html.includes('&lt;iframe&gt;'));
});

test('accords textuels séparés dans la mesure, extensions et basses conservées',()=>{
  const grid=songGrid({chordsVerse:'C G | Am F | C7(b9 #11) F#m7/C# | | %'});
  assert.deepEqual(grid.sections[0].measures.map(m=>m.chords),[
    ['C','G'],['Am','F'],['C7(b9 #11)','F#m7/C#'],['—'],['%']
  ]);
});
