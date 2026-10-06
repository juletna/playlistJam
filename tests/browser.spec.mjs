import {editSong,openTool,saveAndReturn} from './song-page-helpers.mjs';
import {test,expect} from '@playwright/test';
import {mkdtemp,cp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
let dir,server,library;
test.beforeAll(async()=>{dir=await mkdtemp(path.join(os.tmpdir(),'playlist-jam-'));await cp('data',dir,{recursive:true});server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4318',DATA_DIR:dir},stdio:'pipe'});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});library=await (await fetch('http://localhost:4318/api/library')).json();});
test.afterAll(async()=>{server?.kill();await rm(dir,{recursive:true,force:true});});
test('collection, filtres, sauvegarde Markdown, setlist, impression et mobile',async({page})=>{const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:4318');await expect(page.locator('#rows tr')).toHaveCount(library.songs.length);await page.locator('#decade').selectOption('1990');await expect(page.locator('#rows tr')).toHaveCount(library.songs.filter(s=>s.decade===1990).length);await page.locator('#search').fill('Zombie');await expect(page.locator('#rows tr')).toHaveCount(1);await page.locator('#loop').selectOption('yes');await expect(page.locator('#rows tr')).toHaveCount(0);await page.locator('#reset').click();await page.locator('#search').fill('No Woman');await page.locator('[data-open]').click();await editSong(page,'info');await page.locator('[name=year]').fill('1974');await page.locator('[name=style]').fill('Reggae');await page.locator('#tab-lyrics').click();await page.locator('[name=lyrics]').fill('## Essai personnel\nPremière ligne\nDeuxième ligne\n\n<script>window.bad=true</script>');await page.locator('#preview-tab').click();await expect(page.locator('#markdown-preview h2')).toHaveText('Essai personnel');expect(await page.evaluate(()=>window.bad)).toBeUndefined();await saveAndReturn(page);await expect(page.locator('#song-dialog')).not.toBeVisible();await page.reload();await page.locator('#search').fill('No Woman');await expect(page.locator('#rows')).toContainText('1974');await expect(page.locator('#rows')).toContainText('Reggae');expect(await readFile(path.join(dir,'songs/001-no-woman-no-cry.md'),'utf8')).toContain('Première ligne');await page.locator('#search').fill('Bob Marley');await page.locator('#select-all').check();await page.locator('#add-selected').click();await page.locator('#set-name').fill('Session test');await page.locator('#name-form [type=submit]').click();await expect(page.locator('#view-title')).toContainText('Session test');await expect(page.locator('#rows tr')).toHaveCount(2);await page.locator('[data-move="1"]').first().click();await expect(page.locator('#rows tr').first()).toContainText('Stir It Up');await page.reload();await page.locator('#setlists button').filter({hasText:'Session test'}).click();await expect(page.locator('#rows tr').first()).toContainText('Stir It Up');await page.locator('#show-chords').uncheck();await expect(page.locator('td.chord-col').first()).toBeHidden();await page.locator('#show-lyrics').check();await expect(page.locator('.lyrics-sheet')).toHaveCount(2);await page.emulateMedia({media:'print'});await expect(page.locator('.sidebar')).toBeHidden();await expect(page.locator('td.chord-col').first()).toBeHidden();await page.pdf({path:'/tmp/playlist-jam-print.pdf',format:'A4'});await page.emulateMedia({media:'screen'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/playlist-jam-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);});

test('imprimer la sélection respecte le tri et restaure la liste après impression',async({page})=>{
  await page.goto('http://localhost:4318');
  await expect(page.locator('#rows tr')).toHaveCount(library.songs.length);
  await page.locator('#search').fill('Bob Marley');
  await page.locator('#select-all').check();
  await expect(page.locator('#print-selected')).toHaveText('Imprimer la sélection (2)');
  await page.locator('#search').fill('Stir It Up');
  await page.locator('#show-lyrics').check();
  await page.locator('#show-chords').uncheck();
  await page.locator('#sort').selectOption('title');
  await page.evaluate(()=>{window.print=()=>{
    window.dispatchEvent(new Event('beforeprint'));
    window.printed={titles:[...document.querySelectorAll('#rows .song-open strong')].map(e=>e.textContent),lyrics:document.querySelectorAll('.lyrics-sheet').length,hideChords:document.body.classList.contains('hide-chords')};
    window.dispatchEvent(new Event('afterprint'));
  };});
  await page.locator('#print-selected').click();
  expect(await page.evaluate(()=>window.printed)).toEqual({titles:['No Woman, No Cry','Stir It Up'],lyrics:2,hideChords:true});
  await expect(page.locator('#rows tr')).toHaveCount(1);
  await expect(page.locator('#print-selected')).toHaveText('Imprimer la sélection (2)');
  await page.locator('#print').click();
  expect(await page.evaluate(()=>window.printed.titles)).toEqual(['Stir It Up']);
  await page.locator('#clear-selection').click();
  await expect(page.locator('#print-selected')).toBeHidden();
});
