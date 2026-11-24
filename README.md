# Lignée

Jeu web réalisé en groupe : un jeu incrémental de simulation de vie. Travaillez, apprenez, vieillissez… puis transmettez votre héritage à la génération suivante.

## Lancer le jeu

Le jeu est en HTML/CSS/JavaScript pur, sans dépendance. Il doit être servi par un petit serveur local (ouvrir `index.html` directement ne charge pas les scripts) :

```bash
python -m http.server 8765
```

Puis ouvrir <http://localhost:8765>.

## Contenu

- **4 voies de métiers** : Paysannerie, Milice, Arcanes et Ombre (avec sa jauge de corruption).
- **16 compétences** qui donnent des bonus pour la vie en cours.
- **Boutique** : logements (bonheur) et possessions.
- **Héritage** : à la mort, les meilleurs niveaux deviennent des multiplicateurs d'XP et rapportent des points à dépenser en talents (dont l'automatisation).
- **Traits de naissance**, **défis**, **événements à choix**, hauts faits, progression hors-ligne et tutoriel.

## Structure du code

| Fichier | Rôle |
|---|---|
| `index.html` | Page du jeu |
| `css/style.css` | Styles |
| `js/data.js` | Contenu et équilibrage (métiers, compétences, boutique, talents, traits, défis) |
| `js/game.js` | Moteur : boucle, calculs, sauvegarde, événements |
| `js/ui.js` | Interface et tutoriel |

## Branches

- `main` : version stable du jeu. On ne code jamais directement dessus.
- `develop` : version en cours, où on rassemble le travail de tout le monde.
- `feature/<nom>` : une branche par fonctionnalité, créée depuis `develop`.

## Comment travailler

```bash
git switch develop && git pull          # partir de la dernière version
git switch -c feature/menu-principal    # créer sa branche
# ... coder, puis :
git add . && git commit -m "Ajout du menu principal"
git push -u origin feature/menu-principal
```

Ensuite, ouvrir une **Pull Request vers `develop`** sur GitHub. Quand `develop` est stable, on fait une Pull Request de `develop` vers `main`.
