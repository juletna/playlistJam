# Playlist Jam — consignes pour les agents

## Ajouter ou compléter un morceau

Quand l’utilisateur demande d’ajouter ou de compléter une chanson, effectuer les recherches et enregistrer le résultat dans le répertoire. Utiliser les API et services existants décrits dans [docs/api.md](docs/api.md), sans demander à l’utilisateur de faire les recherches ou de manipuler les boutons d’import.

- Lire la collection via `GET /api/library` pour retrouver la fiche et éviter les doublons titre/artiste/version. Conserver l’identifiant d’une fiche existante.
- Utiliser MusicBrainz via `GET /api/metadata/search` pour identifier l’enregistrement et sa première année de sortie connue ; utiliser LRCLIB via `GET /api/metadata/lyrics` pour les paroles.
- Pour les accords, rechercher une page Chords-and-tabs correspondant au morceau, puis utiliser `GET /api/chords/import` avec son URL. Ce service parse du HTML ; ce n’est pas une API publique de la source. Vérifier les sections, variantes, tonalité, capo et avertissements renvoyés.
- Pour iReal Pro, récupérer le lien d’un morceau (`irealb://` ou `irealbook://`) fourni par l’utilisateur, déjà stocké dans la fiche ou trouvé dans le forum officiel / un export HTML. Le décoder avec `parseIreal()` de `public/ireal.js` ; il n’existe pas d’API HTTP locale d’import iReal Pro. Conserver `irealUrl` et consulter `warnings` avant d’appliquer.
- Pour la vue grille, `public/grid.js` dérive les mesures du lien iReal ; hors iReal, `|` signifie une véritable barre de mesure dans les champs d’accords. Ne pas l’utiliser seulement comme séparateur de cycles, ni deviner une mesure par accord. Vérifier le découpage avant de le renseigner. Les progressions sans mesures restent consultables et signalées comme telles.
- L’aperçu est dérivé automatiquement de la grille iReal, sinon du couplet, du refrain ou de la première section renseignée. Lors d’un import, conserver `irealUrl` et remplir les sections pertinentes après vérification de leur affectation. Ne plus remplir `chords` : ce champ facultatif est réservé aux anciens relevés sans grille, à préserver lors des sauvegardes. Il ne prouve jamais une boucle.
- Les destinations iReal proposées sont i/I → Intro, V/v/A → Couplet, B → Refrain, C/D → Bridges. Vérifier la forme : A/B/C ne signifient pas nécessairement couplet/refrain/pont. Documenter les affectations incertaines dans les notes ; départager les variantes et les sections répétées au lieu de les concaténer ou d’écraser par la dernière. Préserver la notation, les basses et l’ordre des accords.
- Respecter la version demandée. Sans précision, privilégier l’enregistrement studio original de l’artiste indiqué. Si plusieurs résultats restent impossibles à départager, conserver les informations sûres et signaler l’incertitude ; ne pas inventer les champs manquants.
- Une demande de complément autorise à remplir les champs vides et à sauvegarder. Préserver les paroles, notes, accords et liens déjà présents, sauf demande de remplacement ou correction fondée sur une source vérifiée. Ajouter les sources et réserves utiles aux notes, sans supprimer les notes personnelles.
- Le statut `loop` est calculé par `inferLoop()` dans `public/chords.js`, à la lecture et à la sauvegarde ; une valeur envoyée au serveur ne le force pas. Compléter les progressions ordonnées de toutes les sections connues, signaler les sections manquantes et ne pas certifier une boucle globale sur la seule base de l’aperçu ou d’une liste de repères. Ne pas transformer un inventaire d’accords en grille ordonnée.
- Pour YouTube, rechercher une vidéo de la version retenue et vérifier son titre et sa chaîne (oEmbed manuel possible, voir `docs/api.md`). Distinguer disponibilité et lecture intégrée ; ne pas annoncer une écoute ou un contrôle de lecture non effectué. Vérifier les styles séparément ; ne pas remplacer l’artiste interprète par le compositeur d’une grille iReal.
- Pour le Real Book, aucune API ni import PDF n’est intégré : conserver une référence vérifiée (volume, édition, instrument et page) dans les notes. Ne pas présenter une grille de forum comme issue du Real Book sans preuve.
- Juste avant une sauvegarde, relire la fiche et intégrer les changements intervenus pendant la recherche. Ne pas envoyer une copie ancienne par-dessus les modifications de l’utilisateur. Conserver aussi `irealUrl` lors de tout autre complément.
- Sauvegarder une fiche complète via `PUT /api/songs/:id`, puis relire la collection pour vérifier la persistance. Cette route remplace la fiche : toujours fusionner les données existantes avant l’envoi. Ne modifier les setlists que si la demande le prévoit.
- Si le serveur est arrêté, démarrer `node server.mjs` depuis ce projet (port par défaut 4317), en respectant `PORT` et `DATA_DIR` si configurés. Réutiliser les services exportés côté Node si cela facilite un traitement en lot, en conservant leurs délais et caches.
- Un service indisponible ne doit ni vider une fiche ni interrompre les autres recherches utiles. Rapporter les champs complétés et ceux restés à vérifier. Pour les lots, garder un relevé des sources et résultats dans `research/`.

## Supprimer un morceau

- Une suppression explicitement demandée utilise `DELETE /api/songs/:id` : cette route supprime la fiche et retire ses références de toutes les setlists. Ne pas confondre avec le retrait d’une seule setlist.

## Repères du projet

- `server.mjs` : routes locales, validation et persistance Markdown. La route PUT remplace la fiche et ignore les propriétés hors schéma ; conserver les informations sans champ dédié dans `note`.
- `metadata.mjs` : recherches MusicBrainz et LRCLIB ; `chord-import.mjs` : import HTML Chords-and-tabs ; `public/ireal.js` : décodage et extraction des accords iReal Pro.
- `data/songs/` et `data/setlists.json` : état actuel ; `research/` : provenance et réserves des enrichissements précédents. Lire les recherches existantes pour éviter de refaire le même travail, puis vérifier les sources si nécessaire.
- Ne pas utiliser `scripts/import.mjs` pour enrichir des fiches existantes : c’est l’import initial de la liste, susceptible d’écraser des fichiers.
- Lors d’un changement de route, de champ ou d’import, mettre à jour `docs/api.md` et ces consignes si la procédure change. Les exemples exécutables et le code actuel font référence pour les formats ; ne pas inventer une API absente.

## Vérifications

Pour un changement de code : `npm test`, puis les tests Playwright concernés si l’interface change. Pour un enrichissement de données : vérifier les fiches sauvegardées et les liens avec les setlists ; ne pas ajouter de tests de code pour une simple modification de chanson.
