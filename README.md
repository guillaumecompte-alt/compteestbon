# Le compte est bon — suivi des classes

Petite application web pour projeter les exercices « Le compte est bon » en classe et mémoriser les validations par classe.

## Contenu

| Fichier | Rôle |
| --- | --- |
| `index.html` | Structure de la page |
| `styles.css` | Mise en forme |
| `app.js` | Logique de l'application (données, séance, projection, minuteur, sauvegarde) |

L'application est autonome : aucune installation, aucune dépendance externe, aucun serveur.

## Fonctionnalités

- 36 niveaux préchargés, proposés dans l'ordre, avec leurs solutions.
- Création, renommage et suppression de classes ; progression indépendante pour chaque classe.
- Affichage des six nombres, puis de la cible ; validation manuelle d'une réussite.
- **Historique par classe** : chaque validation est datée et listée dans la page de la classe.
- **Mode projection** plein écran avec commandes intégrées et **minuteur** (30 s à 3 min, signal sonore désactivable).
  Raccourcis : `N` nombres · `C` cible · `Espace` lancer / mettre en pause le minuteur · `R` remise à zéro · `Échap` quitter.
- Ajout de niveaux personnalisés depuis « Gérer les niveaux » (placés après les niveaux préchargés).
- **Export / import** de toutes les données dans un fichier `.json`.

## Lancer en local

Ouvre simplement `index.html` dans un navigateur récent.

## Publier avec GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` déploie automatiquement le site lors d'une mise à jour de la branche `main`. Une première activation manuelle est nécessaire :

1. Ouvre [les paramètres GitHub Pages](https://github.com/guillaumecompte-alt/compteestbon/settings/pages).
2. Dans **Build and deployment**, choisis **GitHub Actions** comme source.
3. Enregistre si GitHub le demande.
4. Ouvre [les exécutions Actions](https://github.com/guillaumecompte-alt/compteestbon/actions) et relance le workflow **Deploy static app to GitHub Pages**.
5. Une fois le déploiement réussi, l'adresse publique est généralement `https://guillaumecompte-alt.github.io/compteestbon/`.

## À savoir sur les données

Les données (classes, progression, historique, niveaux ajoutés, réglages du minuteur) sont enregistrées dans le `localStorage` du navigateur et de l'appareil utilisés. Elles ne sont pas partagées entre ordinateurs ou navigateurs et peuvent être perdues si le stockage local est effacé.

Pour les sauvegarder ou les transférer, utilise le bloc **Sauvegarde** de la page d'accueil :

- **Exporter** télécharge un fichier `compte-est-bon-sauvegarde-AAAA-MM-JJ.json`.
- **Importer…** recharge un tel fichier. L'import **remplace** les données actuelles du navigateur, après confirmation. Un fichier abîmé est refusé sans rien modifier.

Les données enregistrées par les versions précédentes de l'application sont migrées automatiquement au premier chargement. Si elles étaient illisibles, elles sont mises de côté sous la clé `compte-est-bon-v1-illisible` plutôt qu'écrasées.

### Format des données (version 3)

```json
{
  "schemaVersion": 3,
  "settings": { "timerSeconds": 60, "timerSound": true, "lastExportAt": null },
  "levels": [
    { "id": "n1", "name": "Niveau 1", "numbers": [25, 5, 3, 1, 2, 8], "target": 399, "order": 1, "builtin": true }
  ],
  "classes": [
    {
      "id": "c-…", "name": "CM1 A",
      "completed": ["n1"],
      "history": [{ "levelId": "n1", "levelName": "Niveau 1", "at": "2026-10-31T17:05:00.000Z" }]
    }
  ]
}
```

L'ordre des niveaux est fixé par le champ `order`, et non par l'identifiant.
