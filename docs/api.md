# API et services utilisés par Playlist Jam

Inventaire établi à partir du code le 7 octobre 2026. Cette documentation sert aussi de procédure pour les agents qui ajoutent ou complètent des morceaux.

## Sources externes intégrées

| Source | Accès utilisé par le code | Données utilisées | Module |
| --- | --- | --- | --- |
| MusicBrainz | `GET https://musicbrainz.org/ws/2/recording/` avec `query`, `fmt=json`, `limit=12` | Enregistrements, artiste, album, première date de sortie connue, durée, distinction des versions | `metadata.mjs` |
| LRCLIB | `GET https://lrclib.net/api/search` avec `track_name` et `artist_name` | Paroles simples, titre, artiste, album, durée, identifiant source | `metadata.mjs` |
| iReal Pro | Lien `irealb://…` ou `irealbook://…`, décodé localement | Grille complète, compositeur, style, tonalité, tempo si présent, aperçu rapide et sections | `public/ireal.js`, `public/ireal-import.js` |
| Chords-and-tabs.net | `GET https://www.chords-and-tabs.net/song/name/:slug` | Grille HTML parsée : accords par section, variantes, paroles identifiées, informations de jeu, avertissements | `chord-import.mjs` |

MusicBrainz et LRCLIB sont des API JSON. Chords-and-tabs est un import HTML ciblé depuis une URL connue : aucune recherche automatique de grilles par titre n’est intégrée au serveur.

Les trois services HTTP MusicBrainz, LRCLIB et Chords-and-tabs fonctionnent sans clé dans l’intégration actuelle. Les services serveur ajoutent un User-Agent `PlaylistJam/1.0 (local repertoire app)` et un délai maximal de 12 secondes. Le cache dure 10 minutes ; les échecs en sont retirés pour permettre une nouvelle tentative. MusicBrainz espace ses requêtes de 1,1 seconde et l’import d’accords de 1 seconde. Ce dernier limite la page à 1 Mo et contrôle les redirections vers le même domaine et le même type de chemin.

### YouTube et recherches externes

| Accès | Usage dans l’application |
| --- | --- |
| `https://www.youtube-nocookie.com/embed/:videoId` | Lecteur intégré dans une iframe ; aucune API de recherche ou de métadonnées YouTube n’est appelée par le code de l’application. |
| `https://i.ytimg.com/vi/:videoId/mqdefault.jpg` | Miniature de la vidéo associée au morceau. |
| `https://www.youtube.com/results?search_query=…` | Lien ouvrant une recherche titre/artiste sur YouTube. |
| `https://www.google.com/search?q=site:chords-and-tabs.net/song/name/…` | Lien ouvrant une recherche de grille ; il ne récupère pas automatiquement ses résultats. |

Le README et les relevés de recherche mentionnent une vérification des vidéos via YouTube oEmbed. Un agent peut appeler manuellement `https://www.youtube.com/oembed` avec `url` (URL de vidéo) et `format=json`, puis comparer `title`, `author_name` et `author_url` à la version recherchée. Cette vérification ne constitue pas une intégration active dans le serveur ou l’interface et ne garantit ni le contenu audio ni la lecture intégrée. Une URL valide syntaxiquement ne garantit pas que sa vidéo existe. Préciser le niveau de vérification effectué dans les notes ou le relevé de recherche.

### iReal Pro et Real Book

- **iReal Pro** : rechercher le titre et le compositeur dans le [forum officiel](https://forums.irealpro.com/), ou utiliser le lien fourni par l’utilisateur. Lire le message et sa pièce jointe HTML éventuelle pour trouver le véritable `href` `irealb://…` ou `irealbook://…`. Le protocole `irealb://` contient les données : ne pas tenter de le télécharger avec HTTP et ne pas utiliser `new URL()` pour réécrire son contenu. Conserver le lien original et décoder avec `parseIreal()`.
- L’application n’a **aucune route HTTP de recherche ou d’import iReal Pro**. L’analyse se fait dans `public/ireal.js`, utilisable directement depuis Node. Le bouton d’import est une commodité pour l’utilisateur ; l’agent peut appeler le module puis sauvegarder la fiche sans manipuler l’interface.
- Lien moderne : `irealb://`, grille préfixée `1r34LbKcu7`. Protocole ouvert : `irealbook://`. Limite : 50 000 caractères. Un seul morceau est accepté ; playlists et autres versions d’encodage peuvent être refusées. Les fichiers HTML doivent être parsés pour en extraire le lien d’un morceau, sans exécuter leur contenu. MusicXML et PDF ne sont pas pris en charge par ce parseur.
- Les liens `irealb://search?…` ouvrent une recherche dans l’application iReal Pro ; ils ne contiennent pas une grille importable. Voir la [documentation développeur](https://www.irealpro.com/developer-docs/) et le [protocole ouvert](https://www.irealpro.com/ireal-pro-custom-chord-chart-protocol/).
- **Real Book** : aucune API ni extraction PDF n’est intégrée. On peut conserver volume, édition, instrument/tonalité et page dans `note`, avec une référence vérifiée. Une grille iReal Pro n’est pas automatiquement une transcription de l’édition Real Book. Pour intégrer ou redistribuer le catalogue éditorial, vérifier les autorisations auprès de l’éditeur ([licences Hal Leonard](https://www.halleonard.com/licensing/zendesk/submitRequest.action)).

### Résultat du parseur iReal Pro

`parseIreal(link)` renvoie `{ source, title, composer, style, key, tempo, raw, text, warnings, summary, sections }` et lève une erreur si le lien est invalide. `raw` est la grille décodée ; `text` son rendu lisible ; `summary` contient jusqu’aux quatre premières mesures non vides de la première section. Une section est `{ name, chords, measures }` : `name` est un repère comme `A`, `B`, `C`, `i` ou une chaîne vide ; `measures` est un tableau de progressions, et `chords` les joint avec ` | `.

Les symboles jazz sont conservés : `-` mineur, `^` majeur, `h` demi-diminué, `o` diminué. Les reprises compactes apparaissent comme `%`, `%%` ou `/`, et les silences harmoniques comme `N.C.`. Les reprises ne sont pas déroulées ; l’aperçu ne restitue pas toutes les indications de jeu ni les durées exactes des accords. Des symboles inconnus peuvent être omis du résumé tout en restant dans le rendu complet : consulter `warnings` et la source avant d’appliquer.

| Donnée importée | Champ de fiche | Règle |
| --- | --- | --- |
| Lien original | `irealUrl` | Conserver le lien complet d’un morceau validé. |
| Section `i` / `I` | `chordsIntro` | Intro, si ce repère correspond à la version. |
| Section `V` / `v` ou `A` | `chordsVerse` | Proposition à vérifier : A ne signifie pas toujours couplet. |
| Section `B` | `chordsChorus` | Proposition à vérifier : B peut être un pont dans une forme jazz. |
| Sections `C` / `D` | `chordsBridge1` / `chordsBridge2` | Propositions modifiables ; ne pas inventer les sections absentes. |
| Compositeur | `note` | Ne pas remplacer automatiquement l’artiste interprète par le compositeur. |
| Style, tonalité, tempo et réserves | `style` / `note` | Style si approprié à l’enregistrement ; tonalité et tempo de la grille dans les notes. |

L’interface propose ces destinations et coche les champs vides. L’agent doit effectuer la même fusion explicitement : **sauvegarder seulement `irealUrl` ne remplit pas les champs d’accords côté serveur**. Si plusieurs occurrences ou variantes visent le même champ, choisir celle qui représente la section travaillée ; ne pas concaténer automatiquement, ne pas remplacer silencieusement par la dernière. Une section non nommée n’a pas de destination automatique ; conserver la grille ; son aperçu est calculé automatiquement. Le champ `chordsOutro` reste à renseigner sur preuve d’une outro identifiée.

## API locale de l’application

Base par défaut : `http://localhost:4317`. Le serveur écoute sur `127.0.0.1` et accepte les hôtes `localhost:PORT` et `127.0.0.1:PORT`. `PORT` et `DATA_DIR` peuvent modifier le port et le dossier de données. Les routes de recherche renvoient du JSON ; une erreur est renvoyée sous la forme `{ "error": "message" }`.

| Méthode et route | Paramètres / corps | Résultat / effet |
| --- | --- | --- |
| `GET /api/library` | Aucun | `{ songs, setlists }` : collection et setlists courantes. |
| `GET /api/metadata/search` | Query `title`, `artist` | `{ recordings }` : jusqu’à 12 candidats MusicBrainz. |
| `GET /api/metadata/lyrics` | Query `title`, `artist` | `{ lyrics }` : jusqu’à 15 candidats LRCLIB disposant de paroles simples. |
| `GET /api/chords/import` | Query `url` | `{ title, source, sections, lyrics, text, notes, warnings }` : aperçu de la grille ; aucun enregistrement. |
| `PUT /api/songs/:id` | Fiche complète en JSON | Crée ou remplace `data/songs/:id.md`, puis renvoie la fiche sauvegardée avec son identifiant. |
| `DELETE /api/songs/:id` | Aucun corps | Supprime le fichier du morceau et ses références dans toutes les setlists ; renvoie `{ id, setlists }`. Identifiant absent : 404. |
| `PUT /api/setlists` | Tableau complet de setlists en JSON | Remplace `data/setlists.json`, puis renvoie le tableau enregistré. |

`title` et `artist` sont obligatoires pour les recherches, avec une limite de 200 caractères chacun. Encoder les query parameters avec `URLSearchParams` ou `curl --data-urlencode`.

Exemples de requêtes en lecture :

```sh
curl --get 'http://localhost:4317/api/metadata/search' \
  --data-urlencode 'title=Lovesong' --data-urlencode 'artist=The Cure'

curl --get 'http://localhost:4317/api/metadata/lyrics' \
  --data-urlencode 'title=Lovesong' --data-urlencode 'artist=The Cure'

curl --get 'http://localhost:4317/api/chords/import' \
  --data-urlencode 'url=https://www.chords-and-tabs.net/song/name/the-cure-lovesong-24'
```

### Champs renvoyés par les recherches

- Un enregistrement MusicBrainz : `id`, `title`, `artist`, `album`, `date`, `year`, `duration` (secondes ou `null`), `description`, `source` (URL MusicBrainz).
- Un candidat LRCLIB : `id`, `title`, `artist`, `album`, `duration`, `text` (paroles simples), `source` (URL `https://lrclib.net/api/get/:id`). Cette URL est conservée comme source ; l’application ne l’appelle pas pour son import actuel.
- Une section d’accords : `heading` (nom dans la source), `field` (champ cible), `chords` (séquence). Plusieurs sections peuvent cibler le même champ : sélectionner la variante appropriée, sans les concaténer automatiquement. Les avertissements indiquent notamment les sections non affectées ; `text` permet de consulter la grille complète. Les paroles de cette source peuvent être partielles.

### Fiche sauvegardée

Le corps de `PUT /api/songs/:id` doit contenir la fiche complète, avec `Content-Type: application/json` :

```json
{
  "title": "Titre",
  "artist": "Artiste",
  "year": null,
  "decade": 2020,
  "style": "",
  "loop": "unknown",
  "chordsIntro": "",
  "chordsVerse": "",
  "chordsChorus": "",
  "chordsBridge1": "",
  "chordsBridge2": "",
  "chordsOutro": "",
  "note": "",
  "lyricsUrl": "",
  "youtubeUrl": "",
  "irealUrl": "",
  "lyrics": ""
}
```

`year` vaut `null` ou un entier de 1900 à 2100 ; `decade` est un multiple de 10 dans cet intervalle et est recalculé depuis `year` quand l’année est connue. `loop` est calculé à la lecture et à la sauvegarde (`unknown`, `yes` ou `no`) ; une valeur envoyée par le client est ignorée. Le calcul compare les progressions ordonnées des sections et réduit leurs répétitions exactes. Un aperçu seul ne suffit pas ; sans grille iReal multi-section, il faut au moins couplet et refrain. « Oui » concerne toutes les sections renseignées : les sections manquantes doivent encore être complétées. Les symboles de reprise non résolus ou les textes non reconnus laissent le résultat à vérifier. Les champs de section, `youtubeUrl` et `irealUrl` sont facultatifs pour compatibilité avec les anciennes fiches, mais doivent être conservés lors d’un complément. Un identifiant comporte 1 à 100 caractères minuscules, chiffres ou tirets ; un UUID convient pour une nouvelle fiche.

`chords` est facultatif et déprécié : il conserve uniquement les anciens relevés, sans champ de saisie ni destination d’import. Omettre ce champ pour une nouvelle fiche ; préserver une valeur existante lors d’une modification. Les valeurs vides ne sont plus persistées. Il ne participe pas au calcul de boucle.

Les seuls champs persistés sont ceux validés dans `server.mjs` : les albums, identifiants MusicBrainz, sources d’accords, capo et tonalité n’ont pas de champs dédiés. Conserver les informations utiles dans `note`, le lien des paroles choisies dans `lyricsUrl` et la grille iReal Pro dans `irealUrl`. Une valeur `irealUrl` non vide est validée avec `parseIreal()` lors de la sauvegarde ; ses métadonnées et accords ne sont pas copiés automatiquement par la route PUT. Le corps du fichier Markdown contient `lyrics` ; les autres champs sont stockés dans l’en-tête YAML.

Pour enregistrer un résultat préparé dans un fichier JSON :

```sh
curl --fail-with-body --request PUT \
  'http://localhost:4317/api/songs/IDENTIFIANT' \
  --header 'Content-Type: application/json' --data-binary @fiche.json
```

La route remplace la fiche, elle ne fait pas un PATCH : commencer par la fiche existante, fusionner les champs enrichis, puis envoyer l’ensemble. Les écritures sont sérialisées et utilisent un fichier temporaire suivi d’un renommage. Les identifiants des morceaux référencés dans les setlists doivent rester inchangés.

## Procédure d’ajout ou de complément

1. Lire `/api/library`. Retrouver la fiche titre/artiste/version ; pour un ajout, vérifier qu’elle n’existe pas déjà et choisir un nouvel identifiant.
2. Appeler `/api/metadata/search` avec le titre et l’artiste. Comparer les versions, dates, albums et durées ; privilégier la version demandée, sinon la version studio originale. L’année est celle de l’enregistrement sélectionné, pas nécessairement celle de la composition.
3. Appeler `/api/metadata/lyrics`. Comparer les candidats à l’enregistrement retenu, notamment leur artiste, titre, album et durée. Remplir `lyrics` et `lyricsUrl` ensemble si le texte est pertinent et si ces champs sont à compléter.
4. Pour les accords, privilégier la source demandée et la bonne version. Si un lien iReal Pro est fourni ou déjà présent, le décoder avec `parseIreal()` ; sinon rechercher une grille sur le forum iReal Pro (titre/compositeur) ou une URL Chords-and-tabs (titre/artiste), puis utiliser le module ou `/api/chords/import` correspondant. Compléter les champs de section pertinents selon les variantes de la source ; conserver le lien iReal quand il existe. L’aperçu est dérivé automatiquement : ne pas remplir `chords`. Conserver source, version, capo, tonalité, repères d’affectation et réserves dans les notes. Ne pas extrapoler une boucle globale à partir d’une grille partielle.
5. Pour un lien d’écoute à compléter, trouver et vérifier une vidéo YouTube de la bonne version, puis renseigner `youtubeUrl`. L’application n’offre actuellement aucune API de recherche vidéo. Les styles demandent également une vérification séparée : ils ne sont pas renvoyés par le service actuel.
6. Préparer la fusion avec la fiche existante. Juste avant l’écriture, relire la fiche pour détecter les modifications concurrentes et intégrer les nouvelles données sans écraser les changements de l’utilisateur. Préserver les champs renseignés hors du périmètre demandé, puis enregistrer via `/api/songs/:id`. Une demande d’ajout ou de complément autorise cette sauvegarde sans imposer une validation manuelle dans l’interface.
7. Relire `/api/library` et vérifier les champs enregistrés. Rapporter brièvement les données complétées, les sources et les champs non résolus. Modifier les setlists uniquement si la demande le prévoit.

Si le serveur est arrêté, le démarrer depuis la racine du projet avec `node server.mjs`. Les exports `createMetadataService()` de `metadata.mjs` et `createChordImportService()` de `chord-import.mjs` peuvent aussi être appelés directement depuis Node pour les recherches, en réutilisant une instance par traitement afin de garder les caches et l’espacement des requêtes. Ils ne sauvegardent aucune fiche.


### Exemple Node : compléter une fiche avec un lien iReal Pro

Exécuter depuis la racine du dépôt. Remplacer `IDENTIFIANT` et préparer `lien-ireal.txt` contenant uniquement le lien du morceau. Cet exemple **écrit la fiche** ; l’utiliser lorsqu’un complément a été demandé. Il préserve les champs déjà remplis et vérifie la persistance. Les destinations ci-dessous sont à adapter après lecture de la grille et identification de la forme.

```sh
node --input-type=module - IDENTIFIANT lien-ireal.txt <<'JS'
import {readFile} from 'node:fs/promises';
import {parseIreal} from './public/ireal.js';
const [id,linkFile]=process.argv.slice(2);
if(!id||!linkFile)throw Error('Identifiant et fichier de lien requis.');
const base=`http://localhost:${process.env.PORT||4317}`;
async function request(route,options){
  const response=await fetch(base+route,options);
  const data=await response.json();
  if(!response.ok)throw Error(data.error||`HTTP ${response.status}`);
  return data;
}
const before=(await request('/api/library')).songs.find(song=>song.id===id);
if(!before)throw Error('Fiche introuvable.');
const chart=parseIreal((await readFile(linkFile,'utf8')).trim());
// Vérifier ces propositions : A/B/C/D ne décrivent pas toujours couplet/refrain/ponts.
const destinations={i:'chordsIntro',I:'chordsIntro',V:'chordsVerse',v:'chordsVerse',
  A:'chordsVerse',B:'chordsChorus',C:'chordsBridge1',D:'chordsBridge2'};
const patch={};
if(!before.irealUrl)patch.irealUrl=chart.source;
else if(before.irealUrl!==chart.source)throw Error('Une autre grille existe : choisir la version avant de remplacer.');
const groups=new Map();
for(const section of chart.sections){
  const field=destinations[section.name];if(!field)continue;
  if(!groups.has(field))groups.set(field,new Set());
  groups.get(field).add(section.chords);
}
for(const [field,variants] of groups){
  if(variants.size===1&&!before[field]?.trim())patch[field]=[...variants][0];
  else if(variants.size>1)console.log('Variantes à départager :',field);
}
const provenance=`Grille iReal Pro : ${chart.title} — ${chart.composer}. Tonalité : ${chart.key}.`+
  (chart.tempo?` Tempo : ${chart.tempo}.`:'')+
  ' Aperçu : premières mesures, sans certification de boucle. Affectation A/B/C/D à vérifier.'+
  (chart.warnings.length?' '+chart.warnings.join(' '):'');
if(!before.note?.includes(provenance))patch.note=[before.note,provenance].filter(Boolean).join('\n\n');
const current=(await request('/api/library')).songs.find(song=>song.id===id);
if(JSON.stringify(current)!==JSON.stringify(before))throw Error('Fiche modifiée pendant la recherche : refaire la fusion.');
const saved=await request('/api/songs/'+encodeURIComponent(id),{
  method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...current,...patch})
});
const after=(await request('/api/library')).songs.find(song=>song.id===id);
for(const [key,value] of Object.entries(saved)){
  if(JSON.stringify(after?.[key])!==JSON.stringify(value))throw Error('Persistance non vérifiée : '+key);
}
console.log('Fiche complétée :',id,Object.keys(patch));
JS
```

Pour les recherches MusicBrainz/LRCLIB en Node, réutiliser une instance :

```js
import {createMetadataService} from './metadata.mjs';
import {createChordImportService} from './chord-import.mjs';
const metadata=createMetadataService();
const importChords=createChordImportService();
const params=new URLSearchParams({title:'Lovesong',artist:'The Cure'});
const recordings=await metadata.search(params);
const lyrics=await metadata.lyrics(params);
// Appeler seulement après avoir trouvé et vérifié l’URL de la version souhaitée :
// const grid=await importChords(url);
```

### Qualité des recherches et compte rendu

Une fiche contient des données de **version**, pas seulement de composition. Distinguer artiste interprète et compositeur ; préciser les transpositions, le capo et les accords de position. Ne pas fusionner les paroles d’un live, l’année d’une réédition et une grille d’une reprise sans l’indiquer. Une tonalité de grille différente peut être intentionnelle : ne pas transposer silencieusement.

Si une recherche échoue, essayer une variante raisonnable du titre ou du nom de l’artiste, puis une autre source vérifiable. Respecter les délais des services ; ne pas contourner un refus ou inventer des résultats. La consultation du forum, d’un export HTML ou d’une source complémentaire se fait avec les outils web disponibles, en gardant les liens et la provenance. Une absence de paroles dans LRCLIB ne prouve pas qu’un morceau est instrumental.

Pour un lot, conserver dans `research/` un relevé daté avec identifiant de fiche, version recherchée, URLs, champs complétés, affectations de sections, vérifications vidéo et incertitudes. Les relevés existants (`loop-review.json`, `pop-2020-additions.json`, `jazz-funk-additions.json`, `youtube-links-completion.json`) servent de contexte ; relire les fiches pour connaître l’état actuel. Ne pas relancer `scripts/import.mjs` pour compléter une collection : il importe la liste initiale, génère des noms séquentiels et peut écraser des fichiers existants.

Une modification documentaire ne nécessite pas de test d’application. Pour un enrichissement, vérifier la relecture des fiches, les champs protégés et les références des setlists. Pour une modification de code, suivre les vérifications de `AGENTS.md`.

## Vue grille par mesures

Le bouton **Vue grille** ouvre une lecture en cases : quatre mesures par ligne (deux dans les vues étroites), sections, numéros de mesure, accords multiples dans une mesure, repères de reprise, fins et indications de jeu. Il est disponible depuis la fiche et les accords affichés dans la collection / les lecteurs. La fiche utilise les valeurs du formulaire, même avant enregistrement ; consulter la grille ne sauvegarde pas et ne modifie pas les champs.

`public/grid.js` exporte `irealMeasures(raw)`, `songGrid(song)`, `songPreview(song)` et `renderGrid(grid)`. La grille structurée est dérivée au rendu : aucun nouveau champ persistant ni route API. Avec `irealUrl`, les barres de la source font référence ; les sections textuelles d’aperçu ne remplacent pas le découpage original. Les reprises restent écrites, sans déroulement ni accompagnement audio ; l’espacement des accords dans une case n’est pas une notation rythmique précise.

Sans lien iReal, **chaque `|` sépare deux mesures** dans les champs de section (ou dans `chords` si aucune section n’est renseignée). Exemple : `C G | Am | F | G` signifie deux accords répartis dans la première mesure, puis trois mesures. Les espaces séparent les symboles d’accord ; les basses (`C/G`) et les extensions entre parenthèses (`C7(b9 #11)`) restent groupées. Les champs sans séparateur sont signalés comme non mesurés et ne sont pas convertis automatiquement en une case par accord. Une ancienne utilisation de `|` pour séparer des cycles doit être vérifiée avant de présenter ces cycles comme des mesures. Ne pas inventer le découpage ou la durée des accords lors d’un complément ; documenter la source utilisée.

Dans les listes de collection et de setlist, `songPreview(song)` calcule un aperçu court (quatre mesures ou huit symboles maximum) avec le nom de la section. Une grille iReal fait référence : V/v, A, B, première section hors intro, puis intro seule. Les lettres sont affichées telles quelles, sans prétendre identifier un couplet. Sans grille iReal exploitable : couplet, refrain, puis première section renseignée. Les mesures vides, basses et extensions restent conservées. Un ancien relevé `chords` sert uniquement de secours sans section et ne devient pas une grille ordonnée. Seuls cet aperçu et le bouton Vue grille sont affichés. Les sections complètes et la grille ne sont pas dépliées dans les lignes.

### Nettoyage des anciens aperçus

`node scripts/clean-chord-overviews.mjs` prévisualise le nettoyage sur le serveur courant (`PORT` respecté). Avec `--apply`, il archive les valeurs retirées dans `research/`, supprime les champs `chords` vides ou remplacés par une grille, puis vérifie les sauvegardes et les setlists. Les relevés sans grille restent conservés. Chaque fiche est relue avant son PUT ; toute modification concurrente détectée arrête le traitement.

### Navigation de la fiche

L’interface ouvre chaque morceau dans une page `#song/:id` (sans nouvelle route HTTP), avec les onglets Jouer, Paroles et Informations. « Modifier » active les champs ; Enregistrer revient à la lecture sur la même page. Le retour à la liste conserve les filtres, le tri et le défilement. Les recherches et imports sont accessibles uniquement en mode modification, depuis les actions de chaque onglet, et conservent l’étape d’application avant sauvegarde. En modification, l’onglet Jouer devient Accords et les champs remplacent la grille et les notes de lecture. Annuler ou Enregistrer rétablit la lecture.

Le menu « + Setlist » ajoute ou retire immédiatement le morceau via `PUT /api/setlists`, indépendamment du brouillon de la fiche. Un nouveau morceau doit être enregistré avant de pouvoir rejoindre une setlist. La création d’une setlist depuis ce menu y ajoute le morceau sans quitter la fiche.
