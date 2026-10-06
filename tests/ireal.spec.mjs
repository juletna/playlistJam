import {editSong,openTool,saveAndReturn} from './song-page-helpers.mjs';
import {test,expect} from '@playwright/test';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';
let dir,server;
const link=(await readFile(new URL('./fixtures/petes-waltz.txt',import.meta.url),'utf8')).trim();
test.beforeAll(async()=>{
  dir=await mkdtemp(path.join(os.tmpdir(),'playlist-ireal-'));await mkdir(path.join(dir,'songs'));
  await writeFile(path.join(dir,'songs/test.md'),'---\ntitle: Test\nartist: Artiste\nyear: null\ndecade: 2020\nstyle: ""\nloop: unknown\nchords: C G\nnote: Personnel\nlyricsUrl: ""\n---\n\nMes paroles\n');
  server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4338',DATA_DIR:dir},stdio:'pipe'});
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
});
test.afterAll(async()=>{server?.kill();await rm(dir,{recursive:true,force:true});});
test('import réel, sauvegarde, recherche, impression, retrait et fiche suivante',async({page})=>{
  await page.goto('http://localhost:4338');await page.locator('[data-open=test]').click();await openTool(page,'ireal');
  await openTool(page,'ireal');await page.locator('#ireal-input').fill(link);await page.locator('#ireal-analyze').click();
  await expect(page.locator('#ireal-info')).toContainText("Pete's Waltz");await expect(page.locator('#ireal-chart')).toContainText('Section C');
  await expect(page.locator('#ireal-title')).not.toBeChecked();await expect(page.locator('#ireal-artist')).not.toBeChecked();await expect(page.locator('#ireal-style')).toBeChecked();
  await page.setViewportSize({width:390,height:844});expect(await page.locator('.song-dialog-content').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await page.locator('#ireal-chart').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/playlist-ireal-mobile.png'});
  await page.locator('#ireal-apply').click();await expect(page.locator('[name=chords]')).toHaveCount(0);await expect(page.locator('[name=lyrics]')).toHaveValue('Mes paroles');await expect(page.locator('[name=note]')).toHaveValue('Personnel');await expect(page.locator('[name=style]')).toHaveValue('Waltz');
  await expect(page.locator('[name=chordsVerse]')).toHaveValue(/^Eb \| C-/);await expect(page.locator('[name=chordsChorus]')).toHaveValue(/^C- \| G7/);await expect(page.locator('[name=chordsBridge1]')).toHaveValue(/^Ab \| C-/);await expect(page.locator('[name=loop]')).toHaveValue('no');
  expect(await readFile(path.join(dir,'songs/test.md'),'utf8')).not.toContain('irealUrl');
  await saveAndReturn(page);await expect(page.locator('#song-dialog')).not.toBeVisible();expect(await readFile(path.join(dir,'songs/test.md'),'utf8')).toContain('chords: C G');await page.reload();
  await page.locator('#search').fill('Bb-7/Ab');await expect(page.locator('#rows tr')).toHaveCount(1);await expect(page.locator('#rows .measure-chart')).toHaveCount(0);await expect(page.locator('#rows .chord-col')).toHaveText('Section A · iRealEb | C- | Ab | Bb …');
  await page.locator('#rows [data-grid=test]').click();await expect(page.locator('#grid-content')).toContainText('3/4');await expect(page.locator('#grid-content')).toContainText('Section C');await page.locator('#close-grid').click();
  await page.emulateMedia({media:'print'});await expect(page.locator('#rows .chord-col')).toBeVisible();await page.emulateMedia({media:'screen'});
  await page.locator('[data-open=test]').click();await openTool(page,'ireal');await expect(page.locator('#ireal-saved')).toBeVisible();await expect(page.locator('[name=chordsVerse]')).toHaveValue(/^Eb \| C-/);await expect(page.locator('#ireal-open')).toHaveAttribute('href',link);
  await openTool(page,'ireal');await page.locator('#ireal-input').fill('irealb://%ZZ');await page.locator('#ireal-analyze').click();await expect(page.locator('#ireal-status')).toContainText('invalide');await expect(page.locator('[name=irealUrl]')).toHaveValue(link);
  await page.locator('#ireal-remove').click();await saveAndReturn(page);await page.locator('#search').fill('');await page.reload();await page.locator('[data-open=test]').click();await openTool(page,'ireal');await expect(page.locator('#ireal-saved')).toBeHidden();
  await page.locator('#song-tools-close').click();await page.locator('#close-song').click();await page.locator('#new-song').click();await expect(page.locator('[name=irealUrl]')).toHaveValue('');
});

test('accords : remplacement explicite, réaffectation et morceau sans sections',async({page})=>{
  await page.goto('http://localhost:4338');await page.locator('#new-song').click();
  await editSong(page);await page.locator('[name=chordsVerse]').fill('D A');
  await openTool(page,'ireal');await page.locator('#ireal-input').fill(link);await page.locator('#ireal-analyze').click();
  const rows=page.locator('#ireal-accord-fields .chord-import-choice');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0).locator('input')).not.toBeChecked();
  await rows.nth(0).locator('select').selectOption('chordsIntro');
  await expect(rows.nth(0).locator('input')).toBeChecked();
  await page.locator('#ireal-apply').click();
  await expect(page.locator('[name=chordsVerse]')).toHaveValue('D A');await expect(page.locator('[name=chordsIntro]')).toHaveValue(/^Eb \| C-/);
  await openTool(page,'ireal');await page.locator('#ireal-input').fill('irealbook://Titre=Artiste=Swing=C=n=[C |G |A- |F |D- |G7 Z');await page.locator('#ireal-analyze').click();
  await expect(rows).toHaveCount(1);await expect(rows.nth(0).locator('input')).not.toBeChecked();
  await page.locator('#ireal-apply').click();
  await expect(page.locator('[name=chordsVerse]')).toHaveValue('D A');
  if(await page.locator('#song-tools').isVisible())await page.locator('#song-tools-close').click();if(!await page.locator('#song-more').getAttribute('open')){if(!await page.locator('#song-grid-open').isVisible())await page.locator('#song-more summary').click();}await page.locator('#song-grid-open').click();
  await expect(page.locator('#grid-content .measure')).toHaveCount(6);
});

test('vue grille : cases, lecture seule, retour à la fiche et mobile',async({page})=>{
  await page.goto('http://localhost:4338');await page.locator('#new-song').click();
  await page.locator('[name=title]').fill('Grille de test');await page.locator('[name=artist]').fill('Artiste');
  await editSong(page);await page.locator('[name=chordsVerse]').fill('C G | Am | F | G | C/G');
  if(await page.locator('#song-tools').isVisible())await page.locator('#song-tools-close').click();if(!await page.locator('#song-more').getAttribute('open')){if(!await page.locator('#song-grid-open').isVisible())await page.locator('#song-more summary').click();}await page.locator('#song-grid-open').click();await expect(page.locator('#grid-title')).toHaveText('Grille de test');await expect(page.locator('#grid-content .measure')).toHaveCount(5);await expect(page.locator('#grid-content .measure').first()).toContainText('C G');
  await page.setViewportSize({width:390,height:844});expect(await page.locator('.grid-dialog-content').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await page.screenshot({path:'/tmp/playlist-measure-grid-mobile.png'});await page.locator('#close-grid').click();await expect(page.locator('[name=chordsVerse]')).toHaveValue('C G | Am | F | G | C/G');
  await openTool(page,'ireal');await page.locator('#ireal-input').fill(link);await page.locator('#ireal-analyze').click();await expect(page.locator('#ireal-chart .grid-section')).toHaveCount(3);await page.locator('#ireal-apply').click();if(await page.locator('#song-tools').isVisible())await page.locator('#song-tools-close').click();if(!await page.locator('#song-more').getAttribute('open')){if(!await page.locator('#song-grid-open').isVisible())await page.locator('#song-more summary').click();}await page.locator('#song-grid-open').click();
  await expect(page.locator('#grid-content .grid-section').first().locator('.measure')).toHaveCount(16);await expect(page.locator('#grid-content .measure').first()).toContainText('3/4');
  await page.locator('#grid-dialog').press('Escape');await expect(page.locator('#grid-dialog')).toBeHidden();await expect(page.locator('#song-dialog')).toBeVisible();
});

test('accords multiples espacés, mesures denses et notation lisible sur petit écran',async({page})=>{
  await page.goto('http://localhost:4338');await page.locator('#new-song').click();
  await page.locator('[name=title]').fill('Accords multiples');
  const progression='C G | Am F | Dm7 G7 Cmaj7 A7 | F#m7/C# C7(b9 #11) | %';
  await editSong(page);await page.locator('[name=chordsVerse]').fill(progression);
  if(await page.locator('#song-tools').isVisible())await page.locator('#song-tools-close').click();if(!await page.locator('#song-more').getAttribute('open')){if(!await page.locator('#song-grid-open').isVisible())await page.locator('#song-more summary').click();}await page.locator('#song-grid-open').click();
  const bars=page.locator('#grid-content .measure');
  await expect(bars).toHaveCount(5);
  await expect(bars.first().locator('.measure-chords>span')).toHaveText(['C','G']);
  await expect(bars.nth(3).locator('.measure-chords>span')).toHaveText(['F#m7/C#','C7(b9 #11)']);
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});
    const first=await bars.first().boundingBox(),second=await bars.nth(1).boundingBox(),third=await bars.nth(2).boundingBox();
    expect(second.y).toBe(first.y);
    if(width>520)expect(third.y).toBe(first.y);else expect(third.y).toBeGreaterThan(first.y);
    const symbols=await bars.first().locator('.measure-chords>span').evaluateAll(nodes=>nodes.map(n=>{const r=document.createRange();r.selectNodeContents(n);return r.getBoundingClientRect().toJSON();}));
    expect(symbols[1].left-symbols[0].right).toBeGreaterThan(12);
    expect(await bars.evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth))).toBe(true);
    await page.screenshot({path:`/tmp/playlist-multiple-chords-${width}.png`});
  }
  await page.locator('#close-grid').click();
  await expect(page.locator('[name=chordsVerse]')).toHaveValue(progression);
});
