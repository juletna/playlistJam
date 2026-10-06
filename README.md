# Playlist Jam

[Voir le projet sur GitHub](https://github.com/juletna/playlistJam)

Un répertoire personnel dans le navigateur. Données stockées localement, sans base de données ni compte. Les recherches facultatives de métadonnées, paroles et accords utilisent des sources externes.

[API utilisées et procédure pour ajouter ou compléter un morceau](docs/api.md). Les consignes persistantes pour les agents figurent dans [AGENTS.md](AGENTS.md).

## Ouvrir le carnet

Avec Node.js 20 ou supérieur :

```sh
npm install
npm start
```

Ouvrir http://localhost:4317. Le serveur écoute uniquement sur l’ordinateur local. Pour arrêter : Ctrl+C dans le terminal. Le fichier `Lancer Playlist Jam.command` permet aussi de démarrer sur Mac par double-clic (Node.js doit être installé).

## Utilisation

- Rechercher un titre, un artiste ou une suite d’accords. Combiner décennie, année exacte, style et statut de boucle.
- Cliquer sur un titre pour modifier sa fiche, saisir ses paroles en Markdown et consulter l’aperçu. Cliquer sur **Enregistrer** pour écrire sur disque.
- Cocher des morceaux ou utiliser **+** sur une ligne, puis les ajouter à une setlist existante ou nouvelle.
- Dans une setlist, glisser les lignes (en ordre de setlist) ou utiliser les boutons ↑ ↓. Les changements sont sauvegardés immédiatement. Retirer un morceau d’une setlist ne supprime pas sa fiche.
- **Accords** affiche ou masque les accords ; **Fiches paroles** ajoute les fiches sous la liste. **Imprimer la liste** imprime les résultats visibles, dans leur ordre actuel. Après avoir coché des morceaux, **Imprimer la sélection (N)** imprime uniquement ces morceaux, y compris ceux masqués par un filtre ajouté ensuite, dans l’ordre de tri choisi. Les options accords et paroles s’appliquent aux deux modes.
- Les paroles absentes restent signalées comme telles. Les liens externes ne sont pas téléchargés automatiquement.

## Les fichiers sont les données

`data/songs/` contient une fiche `.md` par chanson. L’en-tête YAML stocke les métadonnées, puis le corps contient les paroles/notes en Markdown. Ces fichiers peuvent être lus et modifiés ailleurs ; actualiser le navigateur après une modification externe. Garder le nom du fichier pour conserver ses liens avec les setlists.

`data/setlists.json` contient les noms des setlists et les identifiants des morceaux dans l’ordre choisi. Pour sauvegarder ou déplacer le répertoire, copier le dossier `data/`. Le bouton **Exporter la collection** produit aussi une copie JSON complète des chansons et setlists.

Les 120 titres initiaux reprennent les accords et décennies fournis ; Jamiroquai — *Alright* complète la collection. Les années exactes, styles et paroles restent à compléter selon les fiches.

Le champ **Ça boucle** est désormais calculé automatiquement depuis les progressions des sections : même cycle ordonné (y compris ses répétitions) → **Ça boucle**, progressions différentes → **Ça change**, données insuffisantes ou symboles non reconnus → **À vérifier**. Un aperçu ou une seule section ne suffit pas. Renseigner au moins couplet et refrain, puis tous les ponts, intro et outro présents ; le résultat porte sur les sections renseignées. Le calcul utilise aussi les sections de la grille iReal Pro et se met à jour après une saisie ou un import. Les anciennes valeurs manuelles sont recalculées à la lecture et à la sauvegarde.

Historiquement, le champ **boucle** a fait l’objet d’une revue documentaire le 3 octobre 2026 : **40 « Ça boucle », 75 « Ça change », 6 « À vérifier »**. Une boucle constante désigne la même progression dans le même ordre et la même tonalité sur les différentes sections de la version publiée par l’artiste indiqué, indépendamment du nombre d’accords. Un pont différent ou une modulation suffit à classer le morceau dans « Ça change » ; les renversements, enrichissements et coupures d’accompagnement ne constituent pas à eux seuls une nouvelle grille.

Chaque fiche contient l’explication et ses sources dans **Notes**. Le [relevé complet](research/loop-review.json) conserve le critère et les conclusions de cette revue. Il repose sur des grilles, analyses et leçons, sans écoute systématique des enregistrements : certaines transcriptions sont simplifiées. Les six cas non tranchés sont *I Will Survive*, *A Horse With No Name*, *Rapper’s Delight*, *Love Will Tear Us Apart*, *Paper Planes* et *Calm Down*. Les accords importés n’ont pas été corrigés lors de cette revue et ne constituent pas nécessairement une grille complète.

L’application fonctionne hors ligne après installation. Les dépendances de rendu Markdown sont servies localement. Les sauvegardes se font au clic sur Enregistrer, pas automatiquement pendant la saisie.

## Vérifications

```sh
npm test
```

### Écouter avec YouTube

Cliquer sur le titre du morceau pour ouvrir sa fiche, puis renseigner le champ **Lien YouTube** pour choisir sa version. Le raccourci **Chercher sur YouTube** utilise son titre et son artiste. Coller un lien de vidéo (`youtube.com/watch`, `youtu.be`, Shorts ou live), puis enregistrer la fiche. Le lien est conservé dans le champ `youtubeUrl` du fichier Markdown et dans les exports.

Dans la liste et les fiches paroles, seuls les morceaux ayant une vidéo associée affichent **Écouter sur YouTube**. Ce bouton lance le lecteur YouTube flottant sans bloquer la navigation. La lecture reste en place pendant les recherches et les changements de setlist ; cliquer sur un autre morceau remplace la vidéo. Si le navigateur bloque le démarrage automatique, cliquer sur lecture dans la vidéo. **Accords & paroles** déplie la fiche sous le lecteur sans interrompre la vidéo. La croix arrête la lecture. Ouvrir une fiche en édition ou une boîte de création de setlist arrête également le lecteur pour garder ses commandes accessibles.

Le bouton Écouter dans la fiche en édition permet de tester un lien avant de l’enregistrer, dans une fenêtre avec la vidéo et les paroles. Fermer cette fenêtre ou appuyer sur Échap arrête la lecture.

Une connexion Internet est nécessaire. Certaines vidéos refusent la lecture intégrée : le lien **Ouvrir sur YouTube** reste disponible. Aucun lecteur externe n’est chargé tant que la fenêtre d’écoute n’est pas ouverte.

Le lanceur démarre le serveur avec rechargement automatique : les modifications du code serveur sont prises en compte sans fermer l’application. Actualiser la page pour charger les changements d’interface.

La liste affiche la miniature YouTube des morceaux associés à une vidéo. Un visuel neutre remplace les images absentes ou impossibles à charger.

### Compléter une fiche

Dans la fenêtre d’édition, saisir le titre et l’artiste puis cliquer sur **Rechercher les infos**. MusicBrainz propose plusieurs enregistrements avec album, date et durée : choisir la version souhaitée, notamment pour distinguer studio, live et rééditions. L’année proposée correspond à la première sortie connue de cet enregistrement.

LRCLIB recherche ensuite les paroles. Choisir leur version et vérifier l’aperçu. Les cases permettent d’importer l’année (et sa décennie), les paroles et leur lien source. Seuls les champs vides sont cochés par défaut ; remplacer une information existante exige de cocher son champ. **Appliquer à la fiche** remplit le formulaire sans enregistrer. **Enregistrer** sauvegarde ensuite dans le fichier Markdown et ferme la fenêtre. Les accords peuvent être importés depuis une grille (voir ci-dessous) ; les styles restent manuels.

**Chercher uniquement les paroles** fonctionne indépendamment de MusicBrainz. Les erreurs de service et absences de résultat laissent la saisie intacte. Les recherches utilisent Internet, sans clé API, avec délai maximal, cache temporaire et espacement des requêtes MusicBrainz. Aucune recherche ne démarre automatiquement à l’ouverture d’une fiche.

### Accords par section

La fiche propose six champs facultatifs : **Intro**, **Couplet**, **Refrain**, **Bridge 1**, **Bridge 2** et **Outro**. Saisir librement une progression, par exemple `A Em B A`. Seules les sections remplies apparaissent dans la liste, les fiches paroles, les lecteurs et à l’impression. La boucle d’accords existante reste disponible. Ces champs sont sauvegardés dans les fichiers Markdown et les exports ; la recherche inclut leurs accords.

### Import d’une grille d’accords

Dans une fiche, **Importer une grille d’accords** accepte une URL `https://www.chords-and-tabs.net/song/name/…`. **Chercher une grille** ouvre une recherche à partir du titre et de l’artiste ; sélectionner une version « chords », puis coller son URL et cliquer sur **Analyser la grille**.

L’aperçu propose les sections reconnues (intro, couplet, refrain, bridges et outro), avec un choix de variante quand elles diffèrent. Seuls les champs vides sont cochés par défaut. Les instrumentaux intermédiaires et les sections non reconnues restent consultables dans **Voir la grille complète** ; le statut de boucle est recalculé depuis les sections appliquées, avec les mêmes réserves pour les grilles partielles. Les accords sont conservés dans leur ordre, sans simplification ni transposition. Vérifier la version, la tonalité, le capo et les répétitions avant d’appliquer.

Les paroles identifiées dans la grille peuvent être importées séparément en cochant leur case : cela remplace aussi leur lien source. Elles peuvent être incomplètes ; la recherche LRCLIB reste disponible. L’ajout de la source et des informations de jeu aux notes conserve les notes personnelles. **Appliquer à la fiche** remplit les champs cochés sans sauvegarder ; **Enregistrer** écrit ensuite la fiche Markdown.

Cette première version prend uniquement en charge Chords-and-tabs.net. Les erreurs, pages sans grille et autres domaines laissent la fiche intacte. Les requêtes passent par le serveur local, avec délai maximal, taille limitée, redirections contrôlées, cache temporaire et espacement des requêtes.

### Import iReal Pro

Dans une fiche, **Grille iReal Pro** accepte le lien d’un seul morceau (`irealb://…` ou `irealbook://…`). Sur le forum iReal Pro, copier l’adresse du lien, la coller puis cliquer sur **Analyser le lien iReal Pro**. L’analyse se fait localement, hors ligne. L’aperçu affiche le titre, le compositeur, le style, la tonalité, le tempo si disponible, et la grille avec ses mesures, sections et repères de reprise. La notation jazz est conservée (`-` mineur, `^` majeur, `h` demi-diminué, `o` diminué).

**Appliquer la grille iReal Pro** conserve la grille complète et propose de remplir en parallèle les champs d’accords : A dans Couplet, B dans Refrain, C/D dans les bridges et i dans Intro. Les destinations sont modifiables dans l’aperçu. Seuls les champs vides sont cochés par défaut ; cocher un champ rempli pour le remplacer. Les progressions gardent l’ordre des accords et les séparateurs de mesures ; le statut de boucle est recalculé depuis la grille et les sections renseignées. Le titre, le compositeur (comme artiste) et le style sont proposés séparément ; seuls les champs vides sont cochés par défaut. Cliquer ensuite sur **Enregistrer** pour sauvegarder. La grille apparaît dans les listes, fiches et lecteurs, ainsi qu’à l’impression lorsque les accords sont affichés. Le lien original est stocké dans `irealUrl`, conservé dans les exports et permet **Ouvrir dans iReal Pro**. **Retirer la grille** prend effet à l’enregistrement.

Cette version importe un seul morceau par lien, sans transposition ni accompagnement audio. Les reprises restent des repères visuels et ne sont pas déroulées. Les symboles non reconnus sont conservés et signalés dans l’aperçu ; vérifier la grille dans iReal Pro en cas de doute. Les playlists, MusicXML et fichiers HTML ne sont pas encore acceptés.

### Vue grille

**Vue grille**, dans une fiche ou via l’icône de grille sur une ligne, ouvre les mesures en cases, quatre par ligne, avec les sections, reprises et indications de jeu. Les imports iReal Pro présentent cette vue dans leur aperçu et après application. La grille se retrouve aussi dans les fiches et les lecteurs, et à l’impression lorsque les accords sont affichés.

Sans iReal Pro, saisir les barres de mesure dans les champs d’accords : `C G | Am | F | G`. Chaque case correspond à une mesure ; plusieurs accords peuvent partager la même case. Une suite sans `|` reste signalée comme non mesurée. L’ouverture de la grille depuis la fiche utilise les changements en cours sans les enregistrer. Les reprises ne sont pas déroulées et les durées exactes des accords ne sont pas représentées.

Les listes calculent leur aperçu depuis la grille iReal (V/v, A, B, puis première section hors intro) ou les champs de section (couplet, refrain, puis première section disponible). Le nom de la section est affiché, avec quatre mesures maximum ou huit accords lorsque les mesures ne sont pas renseignées. La grille complète s’ouvre à la demande. Aucun aperçu n’est à saisir ou à synchroniser. Les anciens relevés sans grille restent consultables comme secours, sans affectation ni mesures inventées.

### Fiche morceau

Un clic sur un titre ouvre sa page dédiée : **Jouer**, **Paroles**, **Informations**. Le bouton **Modifier** active l’édition ; **Enregistrer** revient à la lecture. Les imports iReal Pro / Chords-and-tabs et les recherches de métadonnées ou de paroles s’ouvrent à la demande depuis l’onglet concerné.

- **+ Setlist** : ajouter ou retirer immédiatement le morceau, rechercher une setlist ou en créer une sans quitter la fiche.
- **Mode répétition** : masquer la navigation et lire la grille avec les paroles côte à côte sur grand écran.
- **← Collection / nom de la setlist** : retrouver la liste, ses filtres et sa position. Les flèches parcourent les résultats dans leur ordre.
- La fiche possède une adresse `#song/:id`, utilisable après actualisation ou avec les boutons précédent/suivant du navigateur.
