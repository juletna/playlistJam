import {expect} from '@playwright/test';
export async function editSong(page,tab='play'){
  if(await page.locator('#song-edit').isVisible())await page.locator('#song-edit').click();
  await page.locator('#tab-'+tab).click();
}
export async function openTool(page,name){
  if(await page.locator('#song-tools').isVisible())await page.locator('#song-tools-close').click();
  await page.locator('#tab-'+(name==='metadata'?'info':name==='lyrics'?'lyrics':'play')).click();
  await page.locator('[data-tool="'+(name==='ireal'?'chords':name)+'"]').click();
  if(name==='chords')await page.locator('[data-import-source=chords]').click();
}
export async function saveAndReturn(page){
  if(await page.locator('#song-tools').isVisible())await page.locator('#song-tools-close').click();
  await page.locator('#song-form [type=submit]').click();
  await expect(page.locator('#song-edit')).toBeVisible();
  await page.locator('#close-song').click();
}
