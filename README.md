# Lignée

Jeu web réalisé en groupe.

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
