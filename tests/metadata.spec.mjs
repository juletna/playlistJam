import {editSong,openTool,saveAndReturn} from './song-page-helpers.mjs';
import {test,expect} from '@playwright/test';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';
let dir,server;
test.beforeAll(async()=>{
 dir=await mkdtemp(path.join(os.tmpdir(),'playlist-metadata-'));await mkdir(path.join(dir,'songs'));
 for(const id of ['filled','empty'])await writeFile(path.join(dir,'songs',id+'.md'),`---\ntitle: ${id}\nartist: Test Artist\nyear: ${id==='filled'?'2020':'null'}\ndecade: 2020\nstyle: Pop\nloop: yes\nchords: C - G\nnote: Notes personnelles\nlyricsUrl: "${id==='filled'?'https://example.com/source':''}"\n---\n\n${id==='filled'?'Paroles personnelles':''}\n`);
 server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4324',DATA_DIR:dir},stdio:'pipe'});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
});
test.afterAll(async()=>{server?.kill();await rm(dir,{recursive:true,force:true});});
const recording={id:'abc',title:'Version studio',artist:'Test Artist',album:'Original',date:'1974-01-01',year:1974,duration:240,source:'https://musicbrainz.org/recording/abc'};
async function mock(page){
 await page.route('**/api/metadata/search?*',r=>r.fulfill({json:{recordings:[recording,{...recording,id:'def',title:'Version live',year:1980}]}}));
 await page.route('**/api/metadata/lyrics?*',r=>r.fulfill({json:{lyrics:[{id:10,title:'Version studio',artist:'Test Artist',album:'Original',duration:240,text:'Paroles de test\nDeuxième ligne',source:'https://lrclib.net/api/get/10'}]}}));
}
test('choix, import sélectif, sauvegarde et persistance',async({page})=>{
 await mock(page);await page.goto('http://localhost:4324');await page.locator('[data-open="filled"]').click();await openTool(page,'metadata');await page.locator('#metadata-search').click();await expect(page.locator('.metadata-result')).toHaveCount(2);await page.locator('.metadata-result').first().click();await expect(page.locator('#metadata-lyrics-text')).toContainText('Paroles de test');
 for(const id of ['import-year','import-lyrics','import-source'])await expect(page.locator('#'+id)).not.toBeChecked();
 await expect(page.locator('#metadata-apply')).toBeDisabled();await page.locator('#import-year').check();await page.locator('#metadata-apply').click();
 await expect(page.locator('[name=year]')).toHaveValue('1974');await expect(page.locator('[name=decade]')).toHaveValue('1970');await expect(page.locator('[name=lyrics]')).toHaveValue('Paroles personnelles');await expect(page.locator('[name=lyricsUrl]')).toHaveValue('https://example.com/source');
 await saveAndReturn(page);await expect(page.locator('#song-dialog')).not.toBeVisible();expect(await readFile(path.join(dir,'songs/filled.md'),'utf8')).toContain('year: 1974');
 await page.locator('[data-open="empty"]').click();await openTool(page,'metadata');await page.locator('#metadata-search').click();await page.locator('.metadata-result').first().click();await expect(page.locator('#import-lyrics')).toBeChecked();await expect(page.locator('#import-year')).toBeChecked();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/playlist-metadata-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#metadata-apply').click();await saveAndReturn(page);await expect(page.locator('#song-dialog')).not.toBeVisible();await page.reload();await page.locator('[data-open="empty"]').click();await openTool(page,'metadata');await expect(page.locator('[name=lyrics]')).toHaveValue('Paroles de test\nDeuxième ligne');await expect(page.locator('[name=lyricsUrl]')).toHaveValue('https://lrclib.net/api/get/10');
});
test('erreur des paroles conserve l’année, recherche annulée et fiche intacte',async({page})=>{
 await mock(page);await page.unroute('**/api/metadata/lyrics?*');await page.route('**/api/metadata/lyrics?*',r=>r.fulfill({status:503,json:{error:'LRCLIB indisponible'}}));
 await page.goto('http://localhost:4324');await page.locator('[data-open="filled"]').click();await openTool(page,'metadata');await page.locator('#metadata-search').click();await page.locator('.metadata-result').first().click();await expect(page.locator('#metadata-lyrics-status')).toContainText('LRCLIB indisponible');await expect(page.locator('[name=lyrics]')).toHaveValue('Paroles personnelles');await page.locator('#import-year').check();await expect(page.locator('#metadata-apply')).toBeEnabled();
 await page.locator('#song-tools-close').click();await editSong(page,'info');await page.locator('[name=title]').fill('Autre titre');await openTool(page,'metadata');await expect(page.locator('#metadata-preview')).toBeHidden();await expect(page.locator('.metadata-result')).toHaveCount(0);
 await page.unroute('**/api/metadata/search?*');await page.route('**/api/metadata/search?*',r=>r.fulfill({json:{recordings:[]}}));await page.locator('#metadata-search').click();await expect(page.locator('#metadata-status')).toContainText('Aucune version trouvée');await page.locator('#metadata-lyrics-only').click();await expect(page.locator('#metadata-lyrics-status')).toContainText('LRCLIB indisponible');
});
