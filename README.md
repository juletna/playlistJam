# Playlist Jam

Un répertoire personnel dans le navigateur. Sans base de données, sans compte, sans service distant.

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

Les 120 titres initiaux reprennent uniquement les informations fournies : accords et décennies. Les années exactes, styles et paroles restent à renseigner. Toutes les boucles originales sont **à vérifier**. Une boucle constante désigne la même progression dans la version originale, indépendamment du nombre d’accords. Les exceptions peuvent être indiquées dans les notes.

L’application fonctionne hors ligne après installation. Les dépendances de rendu Markdown sont servies localement. Les sauvegardes se font au clic sur Enregistrer, pas automatiquement pendant la saisie.

## Vérifications

```sh
npm test
```
