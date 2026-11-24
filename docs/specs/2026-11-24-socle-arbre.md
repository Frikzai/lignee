# Lignée — Socle « Arbre aux Lanternes »

*Spec de conception — 24/11/2026 — équipe visuels — branche `feature/socle-arbre`*

## 1. Objectif

Poser la grammaire visuelle de l'Arbre aux Lanternes et l'appliquer au **cadre général** du jeu, pour que les branches suivantes (écran d'accueil, naissance/mort, onglets…) n'aient plus qu'à composer avec des pièces prêtes.

Livré par cette branche :
1. le **kit** Brindilles / Enluminure (`css/kit.css`) ;
2. le **jeu d'icônes** de l'interface (`img/icones.svg`) et son helper ;
3. la **barre du haut** en inscriptions gravées, et le kit appliqué à tout le cadre (colonne, onglets, tableaux, fenêtres, tutoriel, notifications) ;
4. l'**API d'interface** pour les modules, avec la migration de `SeasonUI` et `HealthUI` ;
5. l'**ambiance de saison**.

Hors périmètre : le contenu des onglets, de la colonne du personnage, des fenêtres (branches suivantes), le nom de maison et les prénoms (branche `feature/lignee`).

Voir aussi `docs/feuille-de-route.md` (répartition des équipes et décisions de direction artistique).

## 2. Contraintes

- La couche d'interface (`index.html`, `js/ui.js`, `css/`, `img/`) appartient à l'équipe visuels. `js/game.js` et `js/data.js` ne sont **pas** modifiés.
- `js/sante.js` et `js/saisons.js` (équipe moteur) ne sont modifiés **que** dans leur partie « Interface » (migration vers l'API, §6) ; leur logique de jeu ne bouge pas. La PR le signale et demande leur relecture.
- `js/debug.js` continue de fonctionner : `UI.update()`, `UI.toast()` et `UI.closeModal()` gardent leur signature.
- Ids conservés (utilisés par `ui.js`, le tutoriel ou les modules) : tous les ids existants d'`index.html`, et les classes `.age-box`, `.sidebar`, `.tabs`.
- Aucune dépendance, aucun CDN. Seuls `transform` et `opacity` sont animés. `prefers-reduced-motion` coupe toute animation décorative.
- Le test de contraste (`tests/contrast.test.js`) reste vert ; toute nouvelle couleur de texte y est ajoutée.

## 3. Le kit (`css/kit.css`)

Chargé après `css/style.css`. Tout est piloté par des variables CSS déclarées en tête de fichier :
`--orne` (`#8a6326`, ornements discrets), `--orne-vif` (`#d9973a`, ornements accentués), `--filet` (`rgba(217,151,58,.45)`, filet intérieur), `--lanterne` (`#ffc861`), `--lanterne-halo` (`rgba(255,180,80,.35)`).

| Classe | Rendu | Usage |
|---|---|---|
| `.cadre` | fond `--panel`, filet `--border`, **brindilles** dans les coins haut-gauche et bas-droit (SVG en `background` de `::before` / `::after`) | panneaux courants : tableaux, cartes de talents/défis/hauts faits, journal, carte d'événement, automatisation, notifications |
| `.cadre-noble` | fond `--panel`, filet `--orne` + filet intérieur `--filet` (double filet), **filigranes** aux 4 coins | panneaux importants : colonne du personnage, fenêtres (`.modal-box`), tutoriel |
| `.lanterne` | petit élément HTML (`<span class="lanterne" aria-hidden="true">`) suspendu au milieu du bord haut d'un `.cadre-noble` ; corps SVG + halo dont l'opacité respire (3 s) | colonne du personnage, fenêtres |
| `.sep` / `.sep-noble` | séparateur : filet + feuille / filet + volutes + point de lumière | dans les panneaux |
| `.btn` | (existant) filet doré, lueur braise au survol | actions courantes |
| `.btn-noble` | double filet, texte `--accent` | actions importantes : Transmettre, Commencer une nouvelle vie, Confirmer d'une fenêtre |
| `.inscription` | colonne : `<small>` (icône 12 px + libellé en IM Fell SC, `--muted`) au-dessus de `<b>` (valeur, chiffres tabulaires) | ressources de la barre du haut |
| `.brin` | petit séparateur vertical en brindille (SVG en fond) | entre deux inscriptions |

Règle : **jamais d'aplat d'or**. L'or n'apparaît qu'en traits (filets, ornements, icônes) et en texte.

## 4. Les icônes (`img/icones.svg`)

- Un sprite : `<svg xmlns="http://www.w3.org/2000/svg">` contenant un `<symbol id="i-<nom>" viewBox="0 0 24 24">` par icône.
- Style **gravé au trait** : les symboles n'ont aucune couleur en dur ; ils héritent `fill: none; stroke: currentColor` de la classe `.icone`. Les détails pleins utilisent `style="fill:currentColor"` dans le symbole.
- Helper dans `ui.js` : `icone(nom: string, cls = ''): SVGSVGElement` — renvoie `<svg class="icone {cls}" aria-hidden="true"><use href="img/icones.svg#i-{nom}"/></svg>`.
- CSS : `.icone { width: 1em; height: 1em; vertical-align: -.15em; fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }`.

Icônes livrées par cette branche (celles du cadre général ; métiers, compétences, objets et talents viendront avec leurs onglets) :

| Nom | Sens | Remplace |
|---|---|---|
| `ecus` | pièce | — |
| `revenu` | bourse | — |
| `bonheur` | cœur | — |
| `sante` | fiole | barre santé |
| `age` | bougie | — |
| `lignee` | lanterne | — |
| `printemps`, `ete`, `automne`, `hiver` | pousse, soleil, feuille, flocon | emojis 🌱 ☀️ 🍂 ❄️ |
| `pause`, `reprendre` | deux barres, triangle | ⏸ ▶ |
| `cadenas` | cadenas | 🔒 |
| `interdit` | cercle barré | ⛔ |
| `acquis` | coche | ✔ |
| `etoile` | étoile à 5 branches | ★ |
| `risque` | triangle d'alerte | ⚠ (pénibilité) |
| `soin` | croix arrondie / feuille | « +santé/an » |

Tous les emojis et symboles décoratifs de `ui.js` sont remplacés par ces icônes.

## 5. Le cadre général

**Barre du haut** (`index.html` `.topbar`) :
```
[Lignée]  [ .age-box : #ageText · #lifeText ; barre de vie #ageFill ]  [inscriptions …]  [#pauseBtn]
```
- Inscriptions gravées, séparées par `.brin` : **Écus** (`ecus`, `#coinsText`), **Par jour** (`revenu`, `#netText`), **Bonheur** (`bonheur`, `#happyText`), puis celles déclarées par les modules (§6 — Saison).
- `#pauseBtn` : icône `pause` / `reprendre` + libellé, en `.btn`.
- Barre du haut : filet bas `--orne`.

**Colonne** : `#nowCard` devient `.cadre-noble` avec `.lanterne` ; `#eventCard` et `#autoCard` deviennent `.cadre`.
**Onglets** : inchangés (déjà stylés par la DA).
**Tableaux** (`.table-wrap`), cartes (`.perk`, `.challenge`, `.ach`), journal : `.cadre`.
**Fenêtres** (`.modal-box`) et **tutoriel** (`.tuto`) : `.cadre-noble` + `.lanterne` (fenêtres seulement).
**Boutons importants** : `#rebirthBtn`, le bouton de `showDeath` et le bouton « Confirmer » de `confirm()` passent en `.btn-noble`.
**Notifications** (`.toast`) : `.cadre`.

Les classes sont posées dans `index.html` pour les éléments statiques et dans `ui.js` pour les éléments construits (`el('div', 'table-wrap cadre')`, etc.).

## 6. API d'interface pour les modules

Ajoutée à l'objet `UI` (`js/ui.js`). Les modules l'appellent **à leur chargement** (le script de `ui.js` doit donc être chargé avant eux ; voir l'ordre §6.4). Les déclarations faites avant `UI.init()` sont mémorisées et rendues à l'init ; après, elles sont rendues tout de suite.

### 6.1 `UI.ajouterRessource(def)`
Ajoute une inscription à la barre du haut, après Bonheur.
```js
UI.ajouterRessource({
  id: 'saison',                       // unique
  icone: () => currentSeason().id,    // nom d'icône (string ou fonction)
  libelle: 'Saison',                  // string ou fonction
  valeur: () => currentSeason().name, // string
  titre: () => describeSeason(…),     // optionnel : infobulle
  ton: () => null,                    // optionnel : 'bon' | 'mauvais' | null (couleur de la valeur)
});
```

### 6.2 `UI.ajouterJauge(def)`
Ajoute une jauge dans la colonne du personnage, sous le trait, avant le métier en cours.
```js
UI.ajouterJauge({
  id: 'sante',
  icone: 'sante',
  libelle: 'Santé',
  etat: () => ({ pct: 80, texte: '80 / 100', info: '+1,0 / an · XP ×1,10', titre: '…', ton: 'bon' }), // ton : 'bon' | 'moyen' | 'mauvais'
});
```
Couleurs de remplissage : `bon` → `--good`, `moyen` → `--accent`, `mauvais` → `--bad`.

### 6.3 `UI.ajouterMarque(def)`
Ajoute une petite marque (icône + texte court) dans une ligne de tableau.
```js
UI.ajouterMarque({
  cible: 'job' | 'housing' | 'item',
  id: 'mineur',
  icone: 'risque',          // ou 'soin'
  texte: '',                // optionnel, ex. '+2 santé/an'
  titre: 'Métier pénible : −1 santé / an',
  ton: 'mauvais',           // 'bon' | 'mauvais'
});
```
Rendu : `<span class="marque marque-{ton}" title="…">{icône}{texte}</span>` ajouté dans la cellule du nom (job, housing) ou de l'effet (item).

### 6.4 Ordre de chargement et migration
- `index.html` charge `js/ui.js` **avant** `js/sante.js` et `js/saisons.js` (aujourd'hui `sante.js` est chargé avant `ui.js`). `ui.js` ne dépend d'aucun module.
- `SeasonUI` est remplacé par un appel à `UI.ajouterRessource` (icône = id de la saison, valeur = nom, infobulle = effets + jours restants). Le `HOOKS.ui.push(() => SeasonUI.update())` disparaît.
- `HealthUI` est remplacé par `UI.ajouterJauge` (santé) et des `UI.ajouterMarque` (pénibilité des métiers, récupération des logements et possessions). Le `<style>` injecté disparaît.
- Les fonctions de logique (`currentSeason`, `describeSeason`, `seasonDaysLeft`, `healthOf`, `healthBreakdown`, `jobRisk`, `HEALTH`…) ne changent pas.

## 7. Ambiance de saison (`js/ambiance.js`, `css/ambiance.css`)

- Un calque `<div id="ambiance" aria-hidden="true">` en `position: fixed; inset: 0; z-index: 0; pointer-events: none`, **sous** `.layout` (z-index 1) et au-dessus du vignettage.
- **18 particules** (`<i>`), positions et délais pseudo-aléatoires fixés à la création. Animation CSS lente (12 à 22 s) de `transform` et `opacity` ; opacité maximale ≤ 0,35.
- Forme et trajectoire selon `data-saison` sur le calque :
  | Saison | Particule | Trajectoire |
  |---|---|---|
  | printemps, été | braise (point orangé lumineux) | monte en ondulant |
  | automne | feuille (SVG, `--orne`) | tombe en tournoyant |
  | hiver | flocon (point pâle) | tombe lentement en dérivant |
- Saison lue via `currentSeason().id` si le module saisons est présent, sinon `printemps`. Changement de saison : le calque passe à opacité 0 en 0,8 s, change `data-saison`, revient à 1.
- Pause du jeu (`body.is-paused`) : animations figées. `prefers-reduced-motion` : calque masqué.
- Boucle propre au module (`setInterval` 1 s), aucune écriture dans `G`.

## 8. Vérification

- `node --test` : les tests existants restent verts ; `tests/contrast.test.js` couvre toute nouvelle couleur de texte.
- **Tests de l'API** (`tests/ui-api.test.js`, Node, sans DOM réel) : la logique de registre est isolée dans une fonction pure `creerRegistre()` (ajout, ids uniques — un doublon remplace l'ancien —, rendu différé avant l'init / immédiat après) et testée.
- **Navigateur** (jeu servi par `python3 -m http.server`) :
  - barre du haut : 4 inscriptions (Écus, Par jour, Bonheur, Saison) avec leurs icônes, valeurs à jour, aucun emoji ;
  - colonne : lanterne, jauge Santé rendue par l'API, couleurs bon/moyen/mauvais ;
  - tableaux : marques de pénibilité et de récupération rendues par l'API ;
  - fenêtres (trait, mort, confirmation), tutoriel, notifications : cadres nobles / courants ;
  - ambiance : les 4 saisons (forcer `G.days`) ; pause → figée ; reduced-motion → absente ;
  - panneau de debug (Ctrl+Maj+D) : fonctionne ;
  - 360 px et 1280 px : pas de débordement ; console sans erreur.
