import {test,expect} from '@playwright/test';
import {mkdtemp,mkdir,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
let dir,server;
test.beforeAll(async()=>{
  dir=await mkdtemp(join(tmpdir(),'song-workspace-'));await mkdir(join(dir,'songs'));
  for(const [id,title] of [['a','Alpha'],['b','Beta']])await writeFile(join(dir,'songs',id+'.md'),`---\ntitle: ${title}\nartist: Groupe\nyear: 2001\ndecade: 2000\nstyle: Pop\nchordsVerse: C | G | Am | F\nchordsChorus: C | G | Am | F\nyoutubeUrl: https://www.youtube.com/watch?v=dQw4w9WgXcQ\nnote: Note personnelle\nlyricsUrl: ''\n---\n\n## Couplet\nParoles ${title}\n`);
  await writeFile(join(dir,'setlists.json'),JSON.stringify([{id:'set',name:'Concert',songIds:['b','a']}]));
  server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4342',DATA_DIR:dir},stdio:'pipe'});
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
});
test.afterAll(async()=>{server?.kill();await rm(dir,{recursive:true,force:true});});
test.beforeEach(async({page})=>{await page.route('https://www.youtube-nocookie.com/**',r=>r.fulfill({body:'<html>Lecteur test</html>',contentType:'text/html'}));await page.goto('http://localhost:4342');});
test('lecture, contexte de liste, navigation, URL et répétition',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.locator('#search').fill('Groupe');await page.locator('#sort').selectOption('title');
  await page.locator('[data-open=a]').click();
  await expect(page.locator('#song-heading')).toHaveText('Alpha');await expect(page.locator('#library-page')).toBeHidden();
  await expect(page.locator('#song-form [type=submit]')).toBeHidden();await expect(page.locator('#song-tools')).toBeHidden();
  await expect(page.locator('#song-chart .measure')).toHaveCount(8);await page.screenshot({path:'/tmp/song-page-desktop.png',fullPage:true});
  await page.locator('#song-listen').click();const src=await page.locator('#quick-video iframe').getAttribute('src');
  await page.locator('#tab-lyrics').click();await expect(page.locator('#song-lyrics-read')).toContainText('Paroles Alpha');await expect(page.locator('#quick-video iframe')).toHaveAttribute('src',src);
  await page.locator('#quick-fold').click();await expect(page.locator('#quick-listen')).toHaveClass(/collapsed/);await expect(page.locator('#quick-video iframe')).toHaveCount(1);
  await page.locator('#song-rehearse').click();await expect(page.locator('.sidebar')).toBeHidden();await expect(page.locator('#panel-play')).toBeVisible();await expect(page.locator('#panel-lyrics')).toBeVisible();
  await page.locator('#song-rehearse').click();await page.locator('#song-next').click();await expect(page.locator('#song-heading')).toHaveText('Beta');
  await page.goBack();await expect(page.locator('#library-page')).toBeVisible();await expect(page.locator('#search')).toHaveValue('Groupe');await expect(page.locator('#sort')).toHaveValue('title');
  await page.goForward();await expect(page.locator('#song-heading')).toHaveText('Beta');await page.reload();await expect(page.locator('#song-heading')).toHaveText('Beta');expect(errors).toEqual([]);
});
test('édition entre onglets, garde de navigation, annulation et persistance',async({page})=>{
  await page.locator('[data-edit=a]').click();await page.locator('[name=chordsVerse]').fill('Dm | G');
  await page.locator('#tab-info').click();await page.locator('[name=note]').fill('Note modifiée');
  page.once('dialog',d=>d.dismiss());await page.locator('#song-next').click();await expect(page.locator('#song-heading')).toHaveText('Alpha');
  await page.locator('#tab-play').click();await expect(page.locator('[name=chordsVerse]')).toHaveValue('Dm | G');
  await page.locator('#song-form [type=submit]').click();await expect(page.locator('#song-form [type=submit]')).toBeHidden();await expect(page.locator('#song-chart')).toContainText('Dm');
  await page.reload();await page.locator('#tab-info').click();await expect(page.locator('#song-info-read')).toContainText('Note modifiée');
  await page.locator('#song-edit').click();await page.locator('[name=note]').fill('Brouillon');page.once('dialog',d=>d.accept());await page.locator('#cancel-song').click();await page.locator('#tab-info').click();await expect(page.locator('#song-info-read')).toContainText('Note modifiée');
});
test('setlists immédiates, recherche, création et indépendance du brouillon',async({page})=>{
  await page.locator('[data-open=a]').click();await page.locator('#song-edit').click();await page.locator('#tab-info').click();await page.locator('[name=note]').fill('Ne pas enregistrer');
  await page.locator('#song-set-menu summary').click();await page.locator('[data-song-set=set]').uncheck();await expect(page.locator('#song-memberships')).toBeEmpty();
  await page.locator('[data-song-set=set]').check();await expect(page.locator('#song-memberships')).toContainText('Concert');
  await page.locator('#song-set-search').fill('inconnu');await expect(page.locator('#song-set-options label')).toHaveCount(0);
  await page.locator('#song-create-set').click();await page.locator('#set-name').fill('Session');await page.locator('#name-form [type=submit]').click();await expect(page.locator('#song-heading')).toHaveText('Alpha');await expect(page.locator('#song-memberships')).toContainText('Session');
  expect(await readFile(join(dir,'songs/a.md'),'utf8')).not.toContain('Ne pas enregistrer');
  const sets=JSON.parse(await readFile(join(dir,'setlists.json'),'utf8'));expect(sets.find(s=>s.name==='Session').songIds).toEqual(['a']);
});
test('import iReal contextuel et mobile, nouveau morceau et validation des onglets',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.locator('[data-open=b]').click();await expect(page.locator('.sidebar')).toBeHidden();
  await page.locator('#song-edit').click();await page.locator('[data-tool=chords]').click();await expect(page.locator('#song-tools')).toBeVisible();
  const link=(await readFile(new URL('./fixtures/petes-waltz.txt',import.meta.url),'utf8')).trim();await page.locator('#ireal-input').fill(link);await page.locator('#ireal-analyze').click();await page.locator('#ireal-apply').click();
  await page.locator('#song-tools-close').click();await page.locator('#song-form [type=submit]').click();await expect(page.locator('#song-chart')).toContainText('3/4');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'/tmp/song-page-mobile.png',fullPage:true});
  await page.locator('#close-song').click();await page.locator('#new-song').click();await expect(page.locator('#panel-info')).toBeVisible();await page.locator('[name=title]').fill('Nouveau');await page.locator('[name=artist]').fill('Artiste');
  await page.locator('#tab-play').click();await page.locator('#song-form [type=submit]').click();await expect(page.locator('#song-edit')).toBeVisible();await expect(page.locator('#song-heading')).toHaveText('Nouveau');
});

test('validation révèle les champs obligatoires et échec setlist conserve le brouillon',async({page})=>{
  await page.locator('#new-song').click();await page.locator('#tab-play').click();await page.locator('#song-form [type=submit]').click();await expect(page.locator('#panel-info')).toBeVisible();await expect(page.locator('[name=title]')).toBeFocused();
  await page.locator('#cancel-song').click();await page.locator('[data-open=b]').click();await page.locator('#song-edit').click();await page.locator('#tab-info').click();await page.locator('[name=note]').fill('Brouillon conservé');
  await page.route('**/api/setlists',r=>r.fulfill({status:500,json:{error:'Échec simulé'}}));
  await page.locator('#song-set-menu summary').click();await page.locator('[data-song-set=set]').click();await expect(page.locator('#toast')).toContainText('Échec simulé');await expect(page.locator('[data-song-set=set]')).toBeChecked();await expect(page.locator('[name=note]')).toHaveValue('Brouillon conservé');
  await page.locator('#song-set-menu summary').click();page.once('dialog',d=>d.dismiss());await page.goBack();await expect(page.locator('#song-heading')).toHaveText('Beta');await expect(page.locator('[name=note]')).toHaveValue('Brouillon conservé');
});

test('lecture et modification restent distinctes sur ordinateur et mobile',async({page})=>{
  await page.locator('[data-open=b]').click();
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});
    await expect(page.locator('#song-chart')).toBeVisible();
    await expect(page.locator('#song-play-notes')).toBeVisible();
    await expect(page.locator('[data-tool=chords]')).toBeHidden();
    await expect(page.locator('#song-chord-fields')).toBeHidden();
    await expect(page.locator('#song-form [type=submit]')).toBeHidden();
    await page.locator('#song-edit').click();
    await expect(page.locator('.song-identity .eyebrow')).toHaveText('MODIFICATION DU MORCEAU');
    await expect(page.locator('#tab-play')).toHaveText('Accords');
    await expect(page.locator('#song-chart')).toBeHidden();
    await expect(page.locator('#song-play-notes')).toBeHidden();
    await expect(page.locator('#song-rehearse')).toBeHidden();
    await expect(page.locator('#song-chord-fields')).toBeVisible();
    await expect(page.locator('[data-tool=chords]')).toBeVisible();
    await expect(page.locator('#song-form [type=submit]')).toBeVisible();
    await page.locator('#tab-lyrics').click();
    await expect(page.locator('#lyrics-editor')).toBeVisible();
    await expect(page.locator('#song-lyrics-read')).toBeHidden();
    await page.locator('#tab-info').click();
    await expect(page.locator('#song-info-fields')).toBeVisible();
    await expect(page.locator('#song-info-read')).toBeHidden();
    await page.locator('#cancel-song').click();
    await expect(page.locator('#tab-play')).toHaveText('Jouer');
    await expect(page.locator('#song-rehearse')).toBeVisible();
  }
});
