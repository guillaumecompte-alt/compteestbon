# Le compte est bon — suivi des classes

Petite application web pour projeter les exercices « Le compte est bon » en classe et mémoriser les validations par classe.

## Contenu

- `index.html` : application autonome, sans installation ni dépendance externe.
- Trois niveaux préchargés :
  - Niveau 1 : `25, 5, 3, 1, 2, 8` → cible `399`
  - Niveau 2 : `50, 3, 7, 9, 8, 7` → cible `578`
  - Niveau 3 : `25, 2, 5, 3, 10, 8` → cible `980`
- Création, renommage et suppression de classes.
- Affichage progressif des nombres, puis de la cible.
- Validation manuelle d'une réussite et progression indépendante pour chaque classe.
- Ajout de niveaux ultérieurs depuis « Gérer les niveaux ».

## Lancer en local

Ouvre simplement `index.html` dans un navigateur récent.

## Publier avec GitHub Pages

1. Ouvre les paramètres du dépôt : https://github.com/guillaumecompte-alt/compteestbon/settings/pages
2. Dans **Build and deployment**, choisis **Deploy from a branch**.
3. Sélectionne la branche `main` et le dossier `/(root)`, puis enregistre.
4. Attends la fin du déploiement. L'adresse du site apparaîtra dans les paramètres GitHub Pages.

## À savoir sur les données

La progression est sauvegardée dans `localStorage` du navigateur et de l'appareil utilisés. Les données ne sont donc pas partagées entre ordinateurs ou navigateurs et peuvent être perdues si le stockage local est effacé. Pour une synchronisation entre appareils, il faudra ajouter une base de données et une authentification.

Les niveaux ajoutés sont également enregistrés dans le navigateur local : ils ne sont pas automatiquement partagés avec d'autres appareils.
