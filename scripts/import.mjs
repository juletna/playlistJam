import {readFile,writeFile,mkdir} from 'node:fs/promises';
import YAML from 'yaml';
const source=process.argv[2];if(!source)throw Error('Fichier source requis');
await mkdir('data/songs',{recursive:true});let decade=1970,count=0;
for(const line of (await readFile(source,'utf8')).split('\n')){if(line.startsWith('Années')){const n=Number(line.match(/\d+/)[0]);decade=n<100?1900+n:n;}const m=line.match(/^\* (.*?) — (.*) \(([^()]*)\)$/);if(!m)continue;const [,artist,title,chords]=m;const id=String(++count).padStart(3,'0')+'-'+title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');const song={title,artist,year:null,decade,style:'',loop:'unknown',chords,note:'Accords et décennie importés de la liste de départ ; boucle originale à vérifier.',lyricsUrl:''};await writeFile('data/songs/'+id+'.md','---\n'+YAML.stringify(song)+'---\n\n');}
await writeFile('data/setlists.json','[]\n');console.log(count+' morceaux importés');
