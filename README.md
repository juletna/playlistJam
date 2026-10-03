# Playlist Jam

[Voir le projet sur GitHub](https://github.com/juletna/playlistJam)

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

Les 120 titres initiaux reprennent les accords et décennies fournis ; Jamiroquai — *Alright* complète la collection. Les années exactes, styles et paroles restent à compléter selon les fiches.

Le champ **boucle** a fait l’objet d’une revue documentaire le 3 octobre 2026 : **40 « Ça boucle », 75 « Ça change », 6 « À vérifier »**. Une boucle constante désigne la même progression dans le même ordre et la même tonalité sur les différentes sections de la version publiée par l’artiste indiqué, indépendamment du nombre d’accords. Un pont différent ou une modulation suffit à classer le morceau dans « Ça change » ; les renversements, enrichissements et coupures d’accompagnement ne constituent pas à eux seuls une nouvelle grille.

Chaque fiche contient l’explication et ses sources dans **Notes**. Le [relevé complet](research/loop-review.json) conserve le critère et les conclusions de cette revue. Il repose sur des grilles, analyses et leçons, sans écoute systématique des enregistrements : certaines transcriptions sont simplifiées. Les six cas non tranchés sont *I Will Survive*, *A Horse With No Name*, *Rapper’s Delight*, *Love Will Tear Us Apart*, *Paper Planes* et *Calm Down*. Les accords importés n’ont pas été corrigés lors de cette revue et ne constituent pas nécessairement une grille complète.

L’application fonctionne hors ligne après installation. Les dépendances de rendu Markdown sont servies localement. Les sauvegardes se font au clic sur Enregistrer, pas automatiquement pendant la saisie.

## Vérifications

```sh
npm test
```
