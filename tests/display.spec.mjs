import {test,expect} from '@playwright/test';
import {mkdtemp,cp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
let dir,server;
test.beforeAll(async()=>{
  dir=await mkdtemp(path.join(os.tmpdir(),'playlist-display-'));
  await cp('data',dir,{recursive:true});
  server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4323',DATA_DIR:dir},stdio:'pipe'});
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited: '+code)));});
});
test.afterAll(async()=>{server?.kill();await rm(dir,{recursive:true,force:true});});
test('density switching preserves filters and selection, artist selection saves to a setlist',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://localhost:4323');
  await expect(page.locator('#count')).not.toHaveText('—');
  const total=Number(await page.locator('#count').textContent());
  await page.locator('button[data-display=compact]').click();
  await expect(page.locator('#rows .song-thumbnail').first()).toBeHidden();
  await expect(page.locator('td.compact-artist').first()).toBeVisible();
  await page.screenshot({path:'/tmp/playlist-compact.png'});
  await page.locator('#search').fill('Bob Marley');
  await page.locator('#rows [data-select]').first().check();
  const selected=await page.locator('#rows [data-select]:checked').getAttribute('data-select');
  await page.locator('button[data-display=artists]').click();
  await expect(page.locator('#search')).toHaveValue('Bob Marley');
  await expect(page.locator('#artist-grid .artist-group')).toHaveCount(1);
  await expect(page.locator('#artist-grid [data-select]:checked')).toHaveAttribute('data-select',selected);
  await expect(page.locator('#sort')).toBeHidden();
  await page.locator('#select-all-artists').check();
  await expect(page.locator('#artist-grid [data-select]:checked')).toHaveCount(2);
  await page.locator('#target-set').selectOption('new');
  await page.locator('#add-selected').click();
  await page.locator('#set-name').fill('Test vues artistes');
  await page.locator('#name-form [type=submit]').click();
  await expect(page.locator('#view-title')).toContainText('Test vues artistes');
  await expect(page.locator('body')).toHaveAttribute('data-display','compact');
  await expect(page.locator('button[data-display=artists]')).toBeHidden();
  const saved=JSON.parse(await readFile(path.join(dir,'setlists.json'),'utf8')).find(s=>s.name==='Test vues artistes');
  expect(saved.songIds).toHaveLength(2);expect(saved.songIds).toContain(selected);
  await page.locator('#library').click();
  await expect(page.locator('body')).toHaveAttribute('data-display','artists');
  await expect(page.locator('#artist-grid .artist-title')).toHaveCount(total);
  const names=await page.locator('.artist-group h2>span').allTextContents();
  expect(names).toEqual([...names].sort(new Intl.Collator('fr',{sensitivity:'base',numeric:true}).compare));
  for(const group of await page.locator('.artist-group').all()){
    const titles=await group.locator('.artist-title').allTextContents();
    expect(titles).toEqual([...titles].sort(new Intl.Collator('fr',{sensitivity:'base',numeric:true}).compare));
  }
  await page.screenshot({path:'/tmp/playlist-artists.png'});
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-display','artists');
  await page.locator('#artist-grid .artist-title').first().click();
  await expect(page.locator('#song-dialog')).toBeVisible();
  await page.locator('#close-song').click();
  await page.locator('#search').fill('zzzzzzzz-no-match');
  await expect(page.locator('#empty')).toBeVisible();
  await expect(page.locator('.artist-group')).toHaveCount(0);
  await page.locator('#reset').click();
  await page.emulateMedia({media:'print'});
  await expect(page.locator('#artist-grid')).toBeHidden();
  await expect(page.locator('.table-wrap')).toBeVisible();
  await page.emulateMedia({media:'screen'});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'/tmp/playlist-artists-mobile.png'});
  for(const mode of ['artists','compact','detailed']){
    await page.locator(`button[data-display=${mode}]`).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),mode).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('column and menu sorting: both directions, missing values, filters and original order',async({page})=>{
  const songs=[
    {id:'a',title:'Zulu',artist:'Alpha',year:2001,decade:2000,style:'Rock',loop:'yes',chords:'G'},
    {id:'b',title:'Bravo',artist:'Zulu',year:1999,decade:1990,style:'Blues',loop:'no',chords:'C'},
    {id:'c',title:'Alpha',artist:'Écho',year:null,decade:1980,style:'',loop:'unknown',chords:''}
  ].map(s=>({...s,note:'',lyrics:'',lyricsUrl:''}));
  await page.route('**/api/library',route=>route.fulfill({json:{songs,setlists:[]}}));
  await page.goto('http://localhost:4323');
  const titles=page.locator('#rows .song-open strong');
  await expect(titles).toHaveText(['Zulu','Bravo','Alpha']);
  await page.locator('[data-sort=title]').click();
  await expect(titles).toHaveText(['Alpha','Bravo','Zulu']);
  await expect(page.locator('[data-sort=title]').locator('..')).toHaveAttribute('aria-sort','ascending');
  await page.locator('[data-sort=title]').click();
  await expect(titles).toHaveText(['Zulu','Bravo','Alpha']);
  await expect(page.locator('[data-sort=title]').locator('..')).toHaveAttribute('aria-sort','descending');
  await page.locator('.detailed-label [data-sort=artist]').click();
  await expect(titles).toHaveText(['Zulu','Alpha','Bravo']);
  await page.locator('#rows [data-select="a"]').check();
  await page.locator('button[data-display=compact]').click();
  await page.locator('.compact-artist [data-sort=artist]').click();
  await expect(titles).toHaveText(['Bravo','Alpha','Zulu']);
  await expect(page.locator('#rows [data-select="a"]')).toBeChecked();
  await page.locator('[data-sort=decade]').click();
  await expect(titles).toHaveText(['Alpha','Bravo','Zulu']);
  await page.locator('#sort-direction').click();
  await expect(titles).toHaveText(['Zulu','Bravo','Alpha']);
  await page.locator('#sort').selectOption('style');
  await expect(titles).toHaveText(['Bravo','Zulu','Alpha']);
  await page.locator('#sort-direction').click();
  await expect(titles).toHaveText(['Zulu','Bravo','Alpha']);
  await page.locator('#sort').selectOption('loop');
  await expect(titles).toHaveText(['Zulu','Bravo','Alpha']);
  await page.locator('#sort-direction').click();
  await expect(titles).toHaveText(['Bravo','Zulu','Alpha']);
  await page.locator('#sort').selectOption('chords');
  await expect(titles).toHaveText(['Bravo','Zulu','Alpha']);
  await page.locator('#search').fill('Zulu');
  await expect(titles).toHaveText(['Bravo','Zulu']);
  await page.locator('#reset').click();
  await page.locator('[data-sort=source]').click();
  await expect(titles).toHaveText(['Zulu','Bravo','Alpha']);
  await expect(page.locator('#sort-direction')).toBeHidden();
  await page.setViewportSize({width:390,height:844});
  await page.locator('#sort').selectOption('artist');
  await page.locator('#sort-direction').click();
  await expect(titles).toHaveText(['Bravo','Alpha','Zulu']);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
