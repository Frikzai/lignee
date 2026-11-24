# Lignée — Direction artistique et scène animée

*Spec de conception — 24/11/2026 — équipe visuels*

## 1. Contexte et objectif

Lignée est un jeu incrémental inspiré de Progress Knight (HTML/CSS/JS pur, sans dépendance ni build). Le jeu de base est sur `develop`. Notre équipe s'occupe **uniquement des visuels**.

Objectifs :

1. Donner au jeu une direction artistique **dark fantasy** cohérente (palette, typographie, matières).
2. Ajouter une **scène animée** qui montre ce que fait le personnage : s'il exerce le métier d'Artisan, on le voit frapper sur une enclume.

Hors périmètre (branches ultérieures) : refonte visuelle de chaque onglet (Métiers, Compétences, Boutique, Héritage, Défis, Hauts faits), écran de mort / transmission, cartes d'événement.

**Contrainte d'équipe** : on ne modifie pas les règles du jeu (`js/data.js`, `js/game.js`) et on touche le moins possible aux fichiers partagés (`index.html`, `js/ui.js`) pour limiter les conflits de merge avec l'autre équipe.

## 2. Décisions validées

| Sujet | Décision |
|---|---|
| Technique graphique | Silhouettes SVG + animations CSS, tout en code, aucune image matricielle |
| Contenu de la scène | Métier en cours = scène principale ; compétence en cours = médaillon animé |
| Granularité | Kit réutilisable : 4 décors (un par voie) + 11 gestes + objets tenus + éléments de décor |
| Emplacement | Bandeau pleine largeur au-dessus des onglets |
| Ambiance | « Braise & suie » : noir fumé, orange de forge, or ancien ; titres en IM Fell English SC |
| Réactions | Pause, changement de métier/compétence, montée de niveau, vieillissement, corruption |
| Architecture | Un « théâtre » SVG chargé dans la page, piloté par `js/scene.js` via attributs et classes |

## 3. Direction artistique (`feature/direction-artistique`)

### 3.1 Palette

On **garde les noms** des variables CSS existantes dans `css/style.css` et on change leurs valeurs : tout le jeu change d'ambiance sans toucher au HTML ni au JS.

| Variable | Avant | Après | Usage |
|---|---|---|---|
| `--bg` | `#15120f` | `#14100d` | fond (suie) |
| `--panel` | `#1f1a16` | `#1f1813` | cartes |
| `--panel2` | `#29221c` | `#2a2019` | cartes secondaires, survol |
| `--border` | `#3b3128` | `#3d2f24` | contours |
| `--text` | `#ecdfc9` | `#ead9bd` | texte (parchemin) |
| `--muted` | `#9c8c76` | `#9a8670` | texte secondaire |
| `--accent` | `#d4a64a` | `#d9973a` | or ancien : titres, onglet actif, chiffres clés |
| `--ember` | — (nouvelle) | `#e0561f` | orange de forge : actions fortes et dangereuses |
| `--good` | `#7fb069` | `#8fa86a` | positif |
| `--bad` | `#e06456` | `#c4452f` | négatif |
| `--event` | `#5aa9c8` | `#6f9fb0` | événements |
| `--radius` | `8px` | `3px` | coins presque droits (fer forgé) |

Exigence : contraste ≥ 4,5:1 pour `--text` et `--muted` sur `--bg`, `--panel` et `--panel2` (à mesurer, ajuster `--muted` si besoin).

Les couleurs de catégories (`JOB_CATS`, `SKILL_CATS` dans `data.js`) sont appliquées en style inline par `ui.js` : **on n'y touche pas**. Si elles détonnent, on le signale à l'autre équipe.

### 3.2 Typographie

- **IM Fell English SC** (licence OFL) pour : `.brand`, `h2`, `h3`, `h4`, boutons d'onglets, noms de métiers et compétences dans les tableaux, boutons.
- Fichier de police hébergé dans le dépôt (`fonts/`) avec sa licence `fonts/OFL.txt`, déclaré par `@font-face` avec `font-display: swap` et Georgia en secours. Pas de Google Fonts : le jeu doit fonctionner hors-ligne.
- Texte courant et **chiffres** : police système inchangée, `font-variant-numeric: tabular-nums` sur les valeurs numériques (lisibilité des tableaux).

### 3.3 Matières et composants

- **Fond** : grain léger généré en CSS (SVG `feTurbulence` en data-URI, aucune image) + vignettage sombre sur les bords.
- **Cartes** (`.card`, panneaux) : double filet — bordure `--border` + liseré intérieur (`box-shadow: inset`) plus sombre.
- **Barres** (`.bar`) : gorge creusée (ombre intérieure) ; remplissage avec léger dégradé vertical.
- **Boutons** (`.btn`) : fond transparent, bordure `--accent`, police IM Fell ; survol = lueur `--ember`. `.btn.danger` en `--ember`.
- **Onglets** : IM Fell ; onglet actif souligné `--accent` avec une légère lueur.
- Les transitions d'interface restent courtes (≤ 150 ms) et sont désactivées sous `prefers-reduced-motion: reduce`.

### 3.4 Fichiers touchés

`css/style.css`, `fonts/` (police + licence). Rien d'autre.

## 4. Scène animée (`feature/scene-animee` puis branches de voie)

### 4.1 Bandeau

- `<div id="scene" aria-hidden="true">` placé dans `<main>`, juste avant `<nav class="tabs">`, visible sur tous les onglets.
- Hauteur fixe **160 px** (120 px sous 900 px de large), largeur 100 % de la colonne principale, bordure et coins de la DA.
- Contient : le SVG de la scène (plein cadre) et, en surimpression HTML en bas à droite, le **médaillon** de la compétence (48 px, 40 px sur mobile) avec une infobulle `title` = nom de la compétence.
- Pas d'étiquette texte du métier : la carte « en cours » de la barre latérale l'affiche déjà.

### 4.2 `img/scene.svg` — le théâtre

- `viewBox="0 0 480 110"`, `preserveAspectRatio="xMidYMax slice"` (recadrage ancré en bas).
- **Zone sûre** : tout ce qui doit rester visible (personnage, objet, élément de décor) tient dans `x ∈ [90, 390]`, `y ∈ [38, 110]`. Les décors débordent sur toute la largeur pour les écrans larges. Sol à `y = 100`.
- Personnage centré vers `x = 220`, éléments de décor à sa droite.

Couches, dans l'ordre :

```
<svg>
  <g id="ciel">            dégradé + lune ; teinte par voie (variables CSS)
  <g id="decors">          <g class="decor" data-voie="paysannerie|milice|arcanes|ombre|neutre">
  <g id="elements">        <g class="element" data-element="enclume|billot|riviere|…">
  <g id="perso">
     <g class="jambe-arriere"> <g class="jambe-avant">
     <g class="haut">   (pivot hanche : se penche avec l'âge)
        <g class="bras-arriere"><g class="avant-bras-arriere"><g class="main-arriere">
        <g class="torse">
        <g class="tete">  (dont <g class="barbe">, <g class="yeux">)
        <g class="bras-avant"><g class="avant-bras-avant"><g class="main-avant">
             <g class="objet" data-objet="marteau|hache|…">
  <g id="effets">          étincelles, éclat de niveau, fumée de corruption
</svg>
```

- Chaque membre articulé a un **pivot fixe** (épaule, coude, hanche, cou). Les coordonnées des pivots sont listées en commentaire en tête de `scene.svg` et utilisées comme `transform-origin` (en unités du viewBox) dans `css/scene.css`.
- Toutes les silhouettes utilisent `fill: var(--sil)` ; les lumières (feu, métal chaud, étincelles, lune) utilisent les variables de la palette pour pouvoir être reteintées par voie et par la corruption.
- Le SVG est écrit à la main, groupes nommés, sans attributs parasites d'éditeur.

### 4.3 `img/medaillons.svg`

- `viewBox="0 0 40 40"` : un cadre circulaire commun + un `<g class="med" data-skill="<id>">` par compétence, chacun avec une petite animation en boucle.
- **Repli** : si l'icône d'une compétence n'existe pas, on affiche son **initiale** en IM Fell dans le cercle, bordure à la couleur de sa catégorie (`SKILL_CATS`). Les 16 icônes peuvent donc arriver progressivement.

### 4.4 Gestes

| Geste | Description |
|---|---|
| `repos` | pose par défaut : respiration lente, regard qui balaye |
| `ramasser` | se pencher, ramasser au sol, déposer dans le panier |
| `hacher` | coup de hache diagonal sur un billot, éclats de bois |
| `pecher` | lancer la ligne, attendre, petite touche du bouchon |
| `frapper` | coup vertical (marteau sur enclume, pioche sur paroi), étincelles à l'impact |
| `marchander` | pièces qui passent d'une main à l'autre au-dessus de l'étal |
| `veiller` | debout avec la lance, respiration, tête qui tourne, torche vacillante |
| `ferrailler` | estoc et parade avec l'épée |
| `commander` | bras tendu vers l'avant, cape / étendard qui flotte |
| `lire` | pages qui tournent, tête qui suit les lignes |
| `incanter` | objet levé, lueur ou runes qui montent |
| `sefaufiler` | accroupi, pas lents, cape |

(11 gestes + `repos`.)

### 4.5 Correspondance métier → scène (point de départ)

Les branches de voie peuvent ajuster cette table.

| Métier (`id`) | Voie | Geste | Objet | Élément |
|---|---|---|---|---|
| `glaneur` | paysannerie | ramasser | panier | gerbes |
| `bucheron` | paysannerie | hacher | hache | billot |
| `pecheur` | paysannerie | pecher | canne | riviere |
| `mineur` | paysannerie | frapper | pioche | paroi |
| `artisan` | paysannerie | frapper | marteau | enclume |
| `negociant` | paysannerie | marchander | bourse | etal |
| `recrue` | milice | veiller | lance | — |
| `garde` | milice | veiller | lance | torche |
| `veteran` | milice | ferrailler | epee | mannequin |
| `chevalier` | milice | ferrailler | epee-bouclier | mannequin |
| `capitaine` | milice | commander | epee | — |
| `general` | milice | commander | carte | table |
| `connetable` | milice | commander | etendard | — |
| `novice` | arcanes | lire | grimoire | pupitre |
| `alchimiste` | arcanes | incanter | fiole | chaudron |
| `enchanteur` | arcanes | incanter | baton | — |
| `sage` | arcanes | lire | grimoire | pupitre |
| `archimage` | arcanes | incanter | baton-orbe | — |
| `gardien` | arcanes | incanter | sablier | — |
| `tirelaine` | ombre | sefaufiler | bourse | — |
| `contrebandier` | ombre | sefaufiler | sac | — |
| `voleur` | ombre | sefaufiler | grappin | — |
| `assassin` | ombre | sefaufiler | dague | — |
| `chefguilde` | ombre | commander | dague | — |
| `necromancien` | ombre | incanter | crane | tombe |
| `seigneur` | ombre | incanter | orbe-noir | — |

Tout métier absent de la table (ou dont la voie n'est pas encore dessinée) → `{ voie: 'neutre', geste: 'repos', objet: null, element: null }`.

### 4.6 `js/scene.js` — fonctionnement

Chargé dans `index.html` juste après `<script src="js/ui.js">` (l'ordre importe peu : la boucle attend que `G` existe). **N'écrit jamais dans `G`** ; lit `G`, `ageYears()`, `lifespanYears()`, `SKILL_BY_ID`, `SKILL_CATS`.

**Fonctions pures** (exportées pour les tests) :

- `sceneFor(jobId) → { voie, geste, objet, element }` — table + repli.
- `ageStage(age, lifespan) → 'jeune' | 'adulte' | 'vieux'` — `jeune` si `age < 25`, `vieux` si `age >= 0.75 × lifespan`, sinon `adulte`. (`vieux` l'emporte si les deux conditions sont vraies.)
- `isLevelUp(prev, cur) → bool` — `prev` et `cur` sont `{ id, level }` ; vrai seulement si même `id` et `cur.level > prev.level`.

**Boucle** : au chargement, `fetch` de `img/scene.svg` et `img/medaillons.svg` — URLs résolues par rapport à `scene.js` lui-même (`new URL('../img/…', document.currentScript.src)`) pour fonctionner aussi depuis `outils/scene-demo.html` — injection dans `#scene`, puis `setInterval(update, 100)`. `update()` ne fait rien tant que `G` n'existe pas et ne modifie le DOM **que si une valeur a changé**.

| État lu | Effet |
|---|---|
| `G.currentJob` | Changement → classe `fondu` (opacité → 0 en 250 ms), puis bascule : classe `actif` sur le seul `.decor`, `.element`, `.objet` correspondants ; attributs `data-voie` et `data-geste` sur `#scene` ; retrait de `fondu`. |
| `G.currentSkill` | Classe `actif` sur le `.med` correspondant, sinon mode initiale (`data-fallback`) ; infobulle mise à jour. |
| Niveau du métier / de la compétence | `isLevelUp` vrai → classe `eclat` (métier) ou `eclat-med` (compétence) pendant 900 ms. Un seul éclat même si plusieurs niveaux sont gagnés d'un coup. |
| `G.paused \|\| G.dead` | `data-pause` → `animation-play-state: paused` sur tout le bandeau. |
| `ageYears()`, `lifespanYears()` | `data-age` = `ageStage(...)`. `jeune` : silhouette plus fine ; `vieux` : torse penché, tête basse, barbe visible, gestes ralentis (variable `--tempo`). |
| `G.corruption` | Variable `--corruption` (0 → 1) : décor refroidi (filtre statique), fumée noire dont l'opacité suit la valeur ; `data-corrompu` à partir de 50 → yeux rouges. Visible quel que soit le métier, comme la jauge de la barre latérale. |

### 4.7 `css/scene.css`

- Dimensions du bandeau et du médaillon, responsive.
- Visibilité : `.decor, .element, .objet, .med { display: none }`, `.actif { display: inline }`.
- Un bloc par geste : `#scene[data-geste="frapper"] .bras-avant { animation: frapper-bras … }`, etc. Toutes les durées sont multipliées par `var(--tempo, 1)`.
- Teintes par voie via variables (`#scene[data-voie="arcanes"] { --ciel-1: … }`).
- **Uniquement `transform` et `opacity` animés** ; les filtres (corruption) sont statiques.
- `@media (prefers-reduced-motion: reduce)` : toutes les animations du bandeau à l'arrêt (pose clé), pas d'éclat, changement de métier en coupe nette (pas de fondu).

### 4.8 Modifications des fichiers partagés

- `index.html` : 3 ajouts (le `<div id="scene">`, `<link>` vers `css/scene.css`, `<script>` vers `js/scene.js`).
- `js/ui.js`, `js/game.js`, `js/data.js` : **aucune modification**.

### 4.9 Erreurs

- Échec du `fetch` (fichier absent, page ouverte en `file://`) → bandeau masqué (`hidden`), `console.warn`, le jeu continue.
- `scene.js` tourne dans sa propre boucle : une exception de la scène ne peut pas bloquer `tick()` ni `UI.update()`.
- Métier ou compétence inconnus (ajoutés plus tard par l'autre équipe) → repli `repos` / initiale, jamais d'erreur.

## 5. Vérification

- **Tests unitaires** : `tests/scene.test.js` lancé par `node --test tests/` (Node ≥ 18, aucune dépendance). Couvre `sceneFor` (métier connu, inconnu), `ageStage` (24, 25, seuil 75 %, chevauchement), `isLevelUp` (+1, +3, même niveau, autre id, niveau qui baisse). `scene.js` démarre sa boucle seulement si `document` existe et s'exporte via `module.exports` sous Node.
- **Page de démo** `outils/scene-demo.html` : bandeau seul + contrôles (métier, compétence, âge, espérance de vie, corruption, pause, bouton « niveau +1 ») sur un faux `G`. Ne touche jamais à la sauvegarde. Sert à toutes les branches de voie et aux captures de PR.
- **Avant chaque PR** : lancer le jeu (`python3 -m http.server 8765`), parcourir les 9 onglets, mesurer les contrastes, tester avec « réduire les animations » et en largeur < 900 px ; capture ou GIF joint à la PR.

## 6. Découpage en branches

1. `feature/direction-artistique` (depuis `develop`) : cette spec + §3.
2. `feature/scene-animee` (depuis `feature/direction-artistique`, ou `develop` si déjà mergée) : §4 complet — moteur, personnage et ses 3 âges, réactions, médaillons (repli initiale + icônes des 4 compétences *Fondamentaux*), décor **Paysannerie** et ses 6 métiers, décor `neutre`, page de démo, tests.
3. `feature/scene-milice`, `feature/scene-arcanes`, `feature/scene-ombre` (en parallèle) : un décor, ses gestes, objets et éléments, les lignes de la table §4.5, et les icônes de médaillon de la catégorie de compétences associée (Milice → *Combat*, Arcanes → *Mystique*, Ombre → *Ténèbres*).

Chaque branche se termine par une Pull Request vers `develop`.

## 7. Points ouverts

- Couleurs de catégories dans `data.js` : à harmoniser avec l'autre équipe si besoin.
