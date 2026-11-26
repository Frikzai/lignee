# Lignée

Jeu web réalisé en groupe : un jeu incrémental de simulation de vie. Travaillez, apprenez, vieillissez… puis transmettez votre héritage à la génération suivante.

**Jouer en ligne : <https://frikzai.github.io/lignee/>** (la version de `main`).

## Lancer le jeu

Le jeu est en HTML/CSS/JavaScript pur, sans dépendance. Il doit être servi par un petit serveur local (ouvrir `index.html` directement ne charge pas les scripts) :

```bash
python -m http.server 8765
```

Puis ouvrir <http://localhost:8765>.

### Tests

```bash
node --test
```

Il faut Node 20 ou plus récent. Écrivez bien `node --test` sans dossier : `node --test tests/` échoue avec les versions récentes de Node.

### Outils

- **Panneau de debug** : **Ctrl + Maj + D** en jeu, ou <http://localhost:8765/?debug>. Il permet d'accélérer le temps (×10 à ×1000), de donner des écus ou des points d'héritage, de monter des niveaux, de tout débloquer, de vieillir, de mourir, de lancer un événement, ou de tester la fin de partie (foi, graines, sommets atteints, Floraison, arbre couronné). Le code est dans `js/debug.js`.
- **Démo de la scène** : <http://localhost:8765/outils/scene-demo.html>. On y choisit le métier, la compétence, le logement, les possessions, l'âge, la corruption, la saison et la santé, et la bannière animée réagit en direct.
- **Planches** : <http://localhost:8765/outils/icones.html> affiche toutes les icônes du sprite, `outils/kit.html` les cadres et boutons du kit.
- **Arbre de l'accueil** : `python3 outils/arbre.py` régénère `img/accueil.svg` (même graine, même arbre).
- **Simulation d'équilibrage** : `node outils/simulation.js` joue 4 parties complètes avec un joueur automatique et affiche, pour chaque jalon (sommets, voies fleuries, épilogue, 100 %), le temps de jeu médian (min–max). `node outils/simulation.js 1h 2` joue 2 parties à 1 h par jour, hors-ligne compris, et compte en jours. À relancer après chaque changement d'équilibrage ; les durées sont celles d'un joueur parfait, compter 1,5 à 2 fois plus pour un humain.

## Contenu

- **5 voies de métiers** : Paysannerie, Milice, Arcanes, Ombre (avec sa jauge de corruption) et Clergé (avec sa jauge de foi, le contrepoids de la corruption).
- **19 compétences** qui donnent des bonus pour la vie en cours.
- **Boutique** : 9 logements (bonheur) et 14 possessions. À la mort, on lègue une possession à l'enfant : la **relique de famille** agit sans entretien.
- **La lignée** : une maison qu'on nomme, un prénom par génération et l'arbre aux lanternes des ancêtres.
- **Alliances** : vers 20 ans, trois maisons proposent un conjoint. Son destin s'ajoute à celui de la vie en cours, et l'enfant pourra en hériter (il est proposé parmi les destins de naissance). L'alliance entre dans la chronique.
- **Héritage** : à la mort, les meilleurs niveaux deviennent des multiplicateurs d'XP et rapportent des points à dépenser en talents (dont l'automatisation, et la Veille des ancêtres, sans limite).
- **Floraison** (fin de partie) : une fois le sommet d'une grande voie atteint (Connétable, Gardien du Temps, Seigneur des ombres, Saint), l'arbre peut fleurir. L'héritage repart de zéro contre des graines, qui achètent des racines permanentes. Une seule voie fleurit à chaque Floraison (au choix si plusieurs sommets sont atteints) : faire fleurir les quatre couronne l'arbre et déclenche l'épilogue ; la partie continue ensuite. Chaque voie fleurie débloque un **don de l'arbre** (un destin de naissance exclusif, toujours proposé), et l'arbre aux lanternes se couvre de fleurs à ses couleurs.
- **Espérance de vie** : au-delà de 100 ans, chaque année gagnée compte de moins en moins (`LIFESPAN_SOFTCAP`, `js/game.js`).
- **Santé** et **saisons** (modules `js/sante.js` et `js/saisons.js`).
- **Traits de naissance**, **défis** (deux paliers), **61 événements à choix** (par âge, par voie, par logis, par fortune, par lignée, et en chaîne via `G.suite` ; les 5 derniers tirés ne reviennent pas tout de suite), hauts faits, progression hors-ligne et tutoriel.

## Direction artistique

Dark fantasy « Braise & suie ». Le fil conducteur est **l'Arbre aux Lanternes** : chaque vie est une lanterne accrochée à l'arbre de la maison.

- **Palette et polices** : variables CSS en tête de `css/style.css`. Les polices sont IM Fell English et IM Fell English SC (licence libre, voir `fonts/OFL.txt`).
- **Kit** (`css/kit.css`) : cadres « Brindilles » (`.cadre`) pour les éléments courants, « Enluminure » (`.cadre-noble`) pour les éléments importants, plus les lanternes, séparateurs, inscriptions gravées et interrupteurs-lanternes.
- **Icônes** : un sprite SVG (`img/icones.svg`), utilisé avec `<svg class="icone"><use href="img/icones.svg#i-nom"/></svg>` ou `icone('nom')` en JavaScript. Elles prennent la couleur du texte.
- **Scène animée** : la bannière au-dessus des onglets (`js/scene.js`, `img/scene.svg`, `css/scene.css`). Le personnage fait le geste de son métier dans le décor de sa voie. Elle montre aussi le logement et les possessions achetés, l'âge, la corruption, la saison et la santé. Le médaillon en bas à droite anime la compétence en cours.
- **Règles** : on n'anime que `transform` et `opacity`, et tout respecte le réglage « animations réduites » du système.

## Structure du code

| Fichier | Rôle |
|---|---|
| `index.html` | Page du jeu (ordre de chargement des scripts en bas) |
| `js/data.js` | Contenu et équilibrage : métiers, compétences, boutique, talents, traits, défis |
| `js/game.js` | Moteur : boucle, calculs, sauvegarde, événements, hauts faits, `HOOKS` |
| `js/sante.js`, `js/saisons.js`, `js/foi.js` | Modules de jeu : santé, saisons, foi |
| `js/evenements.js` | Événements supplémentaires et alliances |
| `js/debug.js` | Panneau de debug |
| `js/ui.js` | Interface : construction et mise à jour des écrans, tutoriel, API pour les modules |
| `js/emblemes.js` | Icône de chaque métier, compétence, catégorie, objet, défi et haut fait |
| `js/lignee.js` | Maison, prénoms, mémoire des vies passées (`G.lignee`) |
| `js/accueil.js` | Écran d'accueil et arbre aux lanternes (partagé avec l'onglet Héritage) |
| `js/rituel.js` | Mort, transmission et naissance (choix du destin) |
| `js/heritage.js` | Onglet Héritage : en-tête de la maison, arbre, chronique |
| `js/ambiance.js` | Particules de saison sur toute la page |
| `js/scene.js` | Bannière animée |
| `css/style.css`, `css/kit.css` | Base, palette, polices et kit de composants |
| `css/*.css` (un fichier par écran) | `accueil`, `rituel`, `scene`, `ambiance`, `heritage`, `colonne`, `registres`, `boutique`, `secondaires`, `finitions` |
| `img/` | `icones.svg` (sprite), `scene.svg` et `medaillons.svg` (bannière), `accueil.svg` (arbre), `logis.svg` (boutique), `favicon.svg` |
| `outils/` | Démo de la scène, planches d'icônes et du kit, générateur de l'arbre |
| `tests/` | Tests (`node --test`) |
| `docs/` | Feuille de route de la refonte visuelle et specs |

## Qui fait quoi

- **Moteur** (`js/game.js`, `js/data.js`, modules `sante.js`, `saisons.js`, `foi.js`, `evenements.js`, `debug.js`) : les règles du jeu et l'équilibrage.
- **Interface** (`index.html`, `js/ui.js` et les autres fichiers de `js/`, `css/`, `img/`) : l'affichage. Elle lit l'état du jeu (`G`) et ne change jamais les règles.

Un module peut s'afficher sans toucher à l'interface, grâce à l'API de `js/ui.js` :

- `UI.ajouterRessource({ id, icone, libelle, valeur })` : une inscription dans la barre du haut ;
- `UI.ajouterJauge({ id, icone, libelle, etat })` : une jauge dans la colonne du personnage (`etat()` peut renvoyer `cache: true` pour la masquer) ;
- `UI.ajouterMarque({ cible: 'job' | 'housing' | 'item', id, icone, … })` : une marque sur une ligne ou une carte.

`js/sante.js`, `js/saisons.js` et `js/foi.js` servent d'exemples.

## Ajouter du contenu

Les tests vérifient que chaque élément du jeu a son visuel. Si vous ajoutez du contenu dans `data.js` ou `game.js`, `node --test` vous dira ce qui manque :

| Vous ajoutez… | Il faut aussi… |
|---|---|
| un métier | son icône dans `ICONES_METIERS` (`js/emblemes.js`) et sa scène dans `SCENES` (`js/scene.js`) |
| une compétence | son icône dans `ICONES_COMPETENCES` et son médaillon dans `img/medaillons.svg` |
| une catégorie | son emblème dans `ICONES_CATEGORIES` |
| un talent ou une racine | son emblème dans `EMBLEMES_TALENTS` (`js/heritage.js`) |
| une voie | son décor (`data-voie`) dans `img/scene.svg`, ses couleurs dans `css/scene.css`, et l'ajouter à `VOIES_DESSINEES` (`js/scene.js`) ; son sommet dans `SOMMETS` (`js/data.js`) si elle compte pour la Floraison |
| un trait de naissance | son destin dans `DESTINS` (`js/rituel.js`) |
| un logement | sa silhouette dans `img/logis.svg` et son dessin dans `img/scene.svg` |
| une possession | son icône dans `ICONES_OBJETS` et son dessin dans `img/scene.svg` |
| un défi, un haut fait | son icône dans `ICONES_DEFIS` ou `ICONES_HAUTS_FAITS` |

Chaque icône doit exister dans `img/icones.svg` (un `<symbol id="i-nom">`). Si aucune ne convient, réutilisez-en une existante en attendant que l'équipe interface dessine la bonne.

## Branches

- `main` : version stable, publiée sur GitHub Pages. On ne code jamais directement dessus.
- `develop` : version en cours (branche par défaut), où on rassemble le travail de tout le monde.
- `feature/<nom>` : une branche par fonctionnalité, créée depuis `develop`. Elle est supprimée automatiquement après le merge de sa Pull Request.

## Comment travailler

```bash
git switch develop && git pull          # partir de la dernière version
git switch -c feature/menu-principal    # créer sa branche
# ... coder, lancer node --test, puis :
git add . && git commit -m "Ajout du menu principal"
git push -u origin feature/menu-principal
```

Ensuite, ouvrir une **Pull Request vers `develop`** sur GitHub. Quand `develop` est stable, on fait une Pull Request de `develop` vers `main` pour mettre le jeu en ligne.
