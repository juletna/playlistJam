import {editSong,openTool,saveAndReturn} from './song-page-helpers.mjs';
import {test,expect} from '@playwright/test';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
let dir,server;
test.beforeAll(async()=>{
  dir=await mkdtemp(path.join(os.tmpdir(),'playlist-chords-'));
  await mkdir(path.join(dir,'songs'));
  for(const id of ['first','second'])await writeFile(path.join(dir,'songs',id+'.md'),`---
title: ${id}
artist: Test
year: null
decade: 2020
style: ""
loop: unknown
chords: ""
note: ""
lyricsUrl: ""
---
`);
  server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4326',DATA_DIR:dir},stdio:'pipe'});
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
});
test.afterAll(async()=>{server?.kill();await rm(dir,{recursive:true,force:true});});
test('sections persist, empty sections stay hidden and forms reset between songs',async({page})=>{
  await page.goto('http://localhost:4326');
  await page.locator('[data-open="first"]').click();await editSong(page);
  for(const name of ['chordsIntro','chordsVerse','chordsChorus','chordsBridge1','chordsBridge2','chordsOutro'])await expect(page.locator(`[name=${name}]`)).toHaveValue('');
  await page.locator('[name=chordsVerse]').fill('A Em B A');
  await page.locator('[name=chordsChorus]').fill('B D B Em');
  await page.locator('[name=chordsOutro]').fill('F#m7 C#7');
  await saveAndReturn(page);
  await expect(page.locator('#song-dialog')).not.toBeVisible();
  const saved=await readFile(path.join(dir,'songs/first.md'),'utf8');
  expect(saved).toContain('chordsVerse: A Em B A');
  await page.reload();
  const sections=page.locator('tr[data-id="first"] .chord-section');
  await expect(sections).toHaveCount(0);
  await expect(page.locator('tr[data-id="first"] .chord-col')).toHaveText('CoupletA Em B A');
  await page.locator('#show-lyrics').check();
  await expect(page.locator('.lyrics-sheet').first().locator('.chord-section')).toHaveCount(3);
  await page.emulateMedia({media:'print'});
  await expect(page.locator('tr[data-id="first"] .chord-col')).toBeVisible();
  await page.emulateMedia({media:'screen'});
  await page.locator('#search').fill('F#m7');
  await expect(page.locator('#rows tr')).toHaveCount(1);
  await page.locator('#search').fill('');
  await page.locator('[data-open="first"]').click();await editSong(page);
  await expect(page.locator('[name=chordsOutro]')).toHaveValue('F#m7 C#7');
  await page.locator('#close-song').click();
  await page.locator('[data-open="second"]').click();await editSong(page);
  await expect(page.locator('[name=chordsOutro]')).toHaveValue('');
  await page.setViewportSize({width:390,height:844});
  await page.locator('[name=chordsOutro]').scrollIntoViewIfNeeded();
  expect(await page.locator('.song-dialog-content').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await page.screenshot({path:'/tmp/playlist-chord-sections-mobile.png'});
});

test('boucle automatique : aperçu insuffisant, cycle commun, exception et persistance',async({page})=>{
  await page.goto('http://localhost:4326');
  await page.locator('[data-open="second"]').click();await editSong(page);
  await expect(page.locator('select[name=loop]')).toHaveCount(0);
  await expect(page.locator('#loop-result')).toHaveText('À vérifier');
  await expect(page.locator('[name=chords]')).toHaveCount(0);
  await expect(page.locator('#loop-result')).toHaveText('À vérifier');
  await page.locator('[name=chordsVerse]').fill('C G Am F');
  await page.locator('[name=chordsChorus]').fill('C G Am F C G Am F');
  await expect(page.locator('[name=loop]')).toHaveValue('yes');
  await page.locator('[name=chordsBridge1]').fill('Am F C G');
  await expect(page.locator('[name=loop]')).toHaveValue('no');
  await saveAndReturn(page);
  await expect(page.locator('#song-dialog')).not.toBeVisible();
  expect(await readFile(path.join(dir,'songs/second.md'),'utf8')).toContain('loop: no');
  await page.reload();
  await expect(page.locator('tr[data-id="second"] .status')).toHaveClass('status no');
  await page.locator('#loop').selectOption('no');
  await expect(page.locator('tr[data-id="second"]')).toBeVisible();
  await page.locator('[data-open="second"]').click();await editSong(page);
  await page.locator('[name=chordsBridge1]').fill('');
  await expect(page.locator('[name=loop]')).toHaveValue('yes');
  await saveAndReturn(page);
  await expect(page.locator('#song-dialog')).not.toBeVisible();
  await page.locator('#loop').selectOption('yes');
  await expect(page.locator('tr[data-id="second"]')).toBeVisible();
});
