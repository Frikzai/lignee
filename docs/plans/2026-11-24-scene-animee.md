# Scène animée (bandeau + voie Paysannerie) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Un bandeau au-dessus des onglets montre en silhouettes SVG animées le métier en cours (décor + geste + objet) et un médaillon pour la compétence, et réagit à la pause, aux montées de niveau, à l'âge et à la corruption. La voie Paysannerie (6 métiers) est entièrement dessinée.

**Architecture :** `img/scene.svg` (théâtre en couches) et `img/medaillons.svg` sont chargés par `js/scene.js` dans `<div id="scene">`. `scene.js` a sa propre boucle de 100 ms : il **lit** `G` et pose des attributs / classes sur le bandeau ; `css/scene.css` fait tout l'affichage et l'animation. La logique sujette à erreur est isolée en fonctions pures testées sous Node. Une page de démo pilote un faux `G` pour vérifier chaque scène sans jouer.

**Tech Stack :** SVG écrit à la main, CSS (animations `transform` / `opacity`), JS classique sans module ni dépendance, `node --test`.

**Spec :** `docs/specs/2026-11-24-direction-artistique-et-scene.md` (§2, §4, §5, §6.2)

## Global Constraints

- Branche `feature/scene-animee`, créée depuis `feature/direction-artistique` (ou depuis `develop` si la DA y est déjà mergée). Elle a besoin de `--font-titre` et de la palette.
- **Ne jamais modifier** `js/data.js`, `js/game.js`, `js/ui.js`. Dans `index.html`, exactement 3 ajouts (Task 2). `scene.js` ne fait **jamais** d'écriture dans `G`.
- Globales lues (déclarées par les scripts du jeu, accessibles depuis un autre `<script>` classique) : `G`, `ageYears()`, `lifespanYears()`, `SKILL_BY_ID`, `SKILL_CATS`, `JOBS`.
- Aucune dépendance, aucun CDN. Tests : `node --test tests/`. Jeu : `python3 -m http.server 8765` → <http://localhost:8765>. Démo : <http://localhost:8765/outils/scene-demo.html>.
- **Seuls `transform` et `opacity` sont animés.** Durées de geste = `calc(<durée> * var(--tempo, 1))`.
- Commits en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pas de push ni de PR sans demande de l'utilisateur.

**Repères du théâtre (`img/scene.svg`) — à respecter par toutes les tâches :**

| Repère | Valeur |
|---|---|
| `viewBox` / cadrage | `0 0 480 110`, `preserveAspectRatio="xMidYMax slice"` |
| Sol | `y = 100` (bande de sol `y` 100 → 110) |
| Zone sûre (toujours visible) | `x ∈ [90, 390]`, `y ∈ [38, 110]` |
| Personnage | centré `x = 220`, tête de `y ≈ 44` à pieds `y = 100` |
| Éléments de décor | à droite du personnage, `x ∈ [236, 330]`, posés sur le sol |

Pivots (`transform-origin` en unités du viewBox, ex. `transform-origin: 224px 59px`) :

| Groupe | Pivot | Groupe | Pivot |
|---|---|---|---|
| `#perso` (âge) | 220, 100 | `.haut` (penché) | 220, 76 |
| `.tete` | 220, 56 | `.jambe-avant` / `.jambe-arriere` | 222, 76 / 218, 76 |
| `.bras-avant` | 224, 59 | `.bras-arriere` | 216, 59 |
| `.avant-bras-avant` | 224, 69 | `.avant-bras-arriere` | 216, 69 |
| `.main-avant` | 224, 78 | `.main-arriere` | 216, 78 |

Règles d'animation communes :
- L'inclinaison due à l'âge passe par `--penche` (`0deg` par défaut, `12deg` si `data-age="vieux"`) : `.haut { transform: rotate(var(--penche, 0deg)); }`, et **toute keyframe qui anime `.haut` commence par `rotate(var(--penche, 0deg))`** (ex. `transform: rotate(var(--penche, 0deg)) translateY(-.6px)`, ou `rotate(calc(var(--penche, 0deg) + 35deg))` pour se pencher).
- Les effets propres à un geste (`#effets .impact`, `.copeaux`, `.pieces`) sont masqués par défaut et visibles seulement avec le `data-geste` correspondant.

Pose de référence (sans animation) : debout, bras pendants. Chaque `.objet` est dessiné **tenu dans `.main-avant` en pose de référence** (manche vers le bas depuis 224, 78).

Attributs / classes posés par `scene.js` sur `#scene` : `data-voie`, `data-geste`, `data-age` (`jeune|adulte|vieux`), `data-pause` (présent/absent), `data-corrompu` (présent/absent), style `--corruption` (0 → 1), classes `fondu` et `eclat`. Sur `.medaillon` : `data-fallback` (présent/absent), style `--cat`, `title`, classe `eclat-med`. Sur les calques : classe `actif` sur le seul `.decor`, `.element`, `.objet`, `.med` affiché.

## Review Focus

1. **Changements de métier rapprochés** (promotion automatique qui enchaîne, clics rapides) pendant le fondu de 250 ms → le bandeau doit finir sur le **dernier** métier. Test : Task 4, Step 6.
2. **Nouvelle vie** : niveaux qui retombent et âge qui repart à 14 ans → aucun éclat, retour à `jeune`. Test : Task 1 (`isLevelUp` niveau qui baisse) + Task 5, Step 5.
3. **`scene.svg` injoignable** (jeu ouvert en `file://`, fichier absent) → bandeau masqué, jeu jouable. Test : Task 2, Step 7.
4. **Métier ou compétence ajoutés plus tard par l'autre équipe** → pose de repos / initiale, aucune erreur console. Test : Task 1 (`sceneFor('inconnu')`) + Task 6, Step 5.
5. **Écran étroit (360 px)** → personnage et élément de décor entièrement visibles. Test : Task 10, Step 2.

---

### Task 1 : Logique pure de la scène + tests

**Files :**
- Create : `js/scene.js` (partie logique uniquement), `tests/scene.test.js`

**Interfaces :**
- Produces (globales dans le navigateur, `module.exports` sous Node) :
  - `SCENES` : objet `{ [jobId]: { voie, geste, objet, element } }` — les 26 lignes de la spec §4.5 (`element: null` pour « — »).
  - `REPOS` = `{ voie: 'neutre', geste: 'repos', objet: null, element: null }`
  - `VOIES_DESSINEES` : `Set` — **vide** à cette tâche (la Task 7 ajoute `'paysannerie'`).
  - `sceneFor(jobId: string, voies: Set = VOIES_DESSINEES) → { voie, geste, objet, element }` — l'entrée de `SCENES` si elle existe **et** que sa voie est dans `voies`, sinon une copie de `REPOS`.
  - `ageStage(age: number, lifespan: number) → 'jeune' | 'adulte' | 'vieux'` — `vieux` si `age >= 0.75 * lifespan`, sinon `jeune` si `age < 25`, sinon `adulte`.
  - `isLevelUp(prev: {id, level} | null, cur: {id, level}) → boolean` — `true` seulement si `prev` non nul, même `id`, `cur.level > prev.level`.

- [ ] **Step 1 : Écrire les tests qui échouent** — `tests/scene.test.js` (CommonJS, `node:test`, `node:assert/strict`, `require('../js/scene.js')`) :

```js
test('sceneFor : artisan dans une voie dessinée', () =>
  assert.deepEqual(sceneFor('artisan', new Set(['paysannerie'])),
    { voie: 'paysannerie', geste: 'frapper', objet: 'marteau', element: 'enclume' }));
test('sceneFor : voie pas encore dessinée → repos', () =>
  assert.deepEqual(sceneFor('chevalier', new Set(['paysannerie'])), REPOS));
test('sceneFor : métier inconnu → repos', () => assert.deepEqual(sceneFor('inconnu'), REPOS));
test('SCENES couvre exactement les métiers de data.js', () => {
  // charger js/data.js avec vm.runInNewContext(src + '\n;JOBS.map(j => j.id)')
  assert.deepEqual(Object.keys(SCENES).sort(), jobIds.sort());
});
test('ageStage', () => {
  assert.equal(ageStage(14, 70), 'jeune');   assert.equal(ageStage(24.9, 70), 'jeune');
  assert.equal(ageStage(25, 70), 'adulte');  assert.equal(ageStage(52.4, 70), 'adulte');
  assert.equal(ageStage(52.5, 70), 'vieux'); assert.equal(ageStage(80, 70), 'vieux');
  assert.equal(ageStage(20, 24), 'vieux');   // les deux conditions : vieux l'emporte
});
test('isLevelUp', () => {
  assert.equal(isLevelUp(null, { id: 'a', level: 3 }), false);
  assert.equal(isLevelUp({ id: 'a', level: 3 }, { id: 'a', level: 4 }), true);
  assert.equal(isLevelUp({ id: 'a', level: 3 }, { id: 'a', level: 6 }), true);   // plusieurs niveaux d'un coup
  assert.equal(isLevelUp({ id: 'a', level: 3 }, { id: 'a', level: 3 }), false);
  assert.equal(isLevelUp({ id: 'a', level: 30 }, { id: 'a', level: 0 }), false); // nouvelle vie
  assert.equal(isLevelUp({ id: 'a', level: 3 }, { id: 'b', level: 9 }), false);  // changement de métier
});
```

- [ ] **Step 2 : Vérifier l'échec** — Run : `node --test tests/` → FAIL « Cannot find module '../js/scene.js' ».

- [ ] **Step 3 : Implémenter** `js/scene.js` : `'use strict'`, les constantes et fonctions ci-dessus, puis en fin de fichier `if (typeof module !== 'undefined') module.exports = { SCENES, REPOS, VOIES_DESSINEES, sceneFor, ageStage, isLevelUp };`.

- [ ] **Step 4 : Vérifier** — Run : `node --test tests/` → PASS (tests de contraste de la DA compris).

- [ ] **Step 5 : Commit** — `git add js/scene.js tests/scene.test.js && git commit -m "Scène : logique pure et tests"`

---

### Task 2 : Bandeau branché dans le jeu (théâtre squelette)

**Files :**
- Create : `css/scene.css`, `img/scene.svg`
- Modify : `index.html` (l. 7, avant l. 82, après l. 161), `js/scene.js`

**Interfaces :**
- Consumes : Task 1 (`sceneFor`, …).
- Produces :
  - `initScene(): Promise<void>` — charge les SVG, les injecte, lance `setInterval(updateScene, 100)`. Appelée automatiquement en fin de `scene.js` si `typeof document !== 'undefined'`.
  - `updateScene(): void` — à cette tâche : `return` si `typeof G === 'undefined' || !G` ; le reste arrive en Task 4.
  - `SCENE_BASE` : `new URL('../img/', document.currentScript.src)` capturé **au chargement** du script (pas dans une fonction async).
  - DOM : `#scene > svg.scene-svg` (contenu de `scene.svg`) + `#scene > div.medaillon` (vide jusqu'à la Task 6).

- [ ] **Step 1 : `index.html`** — 3 ajouts : `<link rel="stylesheet" href="css/scene.css">` après le lien `style.css` ; `<div id="scene" aria-hidden="true"></div>` juste avant `<nav class="tabs">` ; `<script src="js/scene.js"></script>` juste après `<script src="js/ui.js"></script>`.

- [ ] **Step 2 : `img/scene.svg` squelette** — racine `<svg xmlns="http://www.w3.org/2000/svg" class="scene-svg" viewBox="0 0 480 110" preserveAspectRatio="xMidYMax slice">`, commentaire en tête listant les repères et pivots (tableaux des Global Constraints), puis les couches `#ciel` (rect plein cadre en dégradé `--ciel-haut` → `--ciel-bas` + lune), `#decors` (seulement `<g class="decor" data-voie="neutre">` : sol + collines lointaines), `#elements` (vide), `#perso` (tous les groupes de la spec §4.2 aux pivots ci-dessus, en pose de référence ; `.barbe` et `.yeux` dans `.tete`), `#effets` (vide). Couleurs uniquement via classes / `var(--…)`, aucun attribut d'éditeur.

- [ ] **Step 3 : `css/scene.css` de base**
  - `#scene` : `position: relative; height: 160px; margin-bottom: 12px; overflow: hidden; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg);` ; `@media (max-width: 900px) { #scene { height: 120px; } }` ; `.scene-svg { display: block; width: 100%; height: 100%; }`.
  - Variables par défaut sur `#scene` : `--sil: #0a0705; --ciel-haut: #120d10; --ciel-bas: #3a1a14; --lueur: #8a3414; --lointain: #1c120f; --feu: #ff6a1f; --etincelle: #ffd27a;`.
  - Visibilité : `.decor, .element, .objet, .med { display: none; } .actif { display: inline; }` et `.barbe, .yeux { display: none; }`.
  - Pivots : une règle `transform-origin` par groupe du tableau des pivots.
  - `@media (prefers-reduced-motion: reduce) { #scene * { animation: none !important; transition: none !important; } }`.

- [ ] **Step 4 : Chargeur** — `initScene()` : `fetch` de `new URL('scene.svg', SCENE_BASE)` (puis `medaillons.svg` à la Task 6) ; si `!res.ok` ou exception → `#scene` reçoit la classe `hidden`, `console.warn('[scène] …')`, et on s'arrête. Sinon injection (`insertAdjacentHTML`), activation du décor `neutre`, création de `div.medaillon`, `setInterval(updateScene, 100)`.

- [ ] **Step 5 : Tests** — Run : `node --test tests/` → PASS (le démarrage automatique ne doit pas s'exécuter sous Node).

- [ ] **Step 6 : Vérifier dans le jeu** — ouvrir le jeu : le bandeau de 160 px apparaît au-dessus des onglets, sur tous les onglets, avec ciel, sol et silhouette immobile entière. Console sans erreur.

- [ ] **Step 7 : Vérifier la panne** — renommer temporairement `img/scene.svg`, recharger : bandeau masqué, un `[scène]` en avertissement, le jeu tourne (l'âge avance). Remettre le fichier. Ouvrir aussi `index.html` en `file://` : même comportement attendu côté scène.

- [ ] **Step 8 : Commit** — `git add index.html css/scene.css img/scene.svg js/scene.js && git commit -m "Scène : bandeau branché dans le jeu"`

---

### Task 3 : Page de démonstration

**Files :**
- Create : `outils/scene-demo.html`

**Interfaces :**
- Consumes : `css/style.css`, `css/scene.css`, `js/data.js`, `js/scene.js` (chemins `../`).
- Produces : une page où `G` est un faux état modifiable depuis la console (`G.currentJob = 'artisan'`) — utilisée pour vérifier les Tasks 4 à 10.

- [ ] **Step 1 : Écrire la page** — charge `../js/data.js`, puis un `<script>` inline qui déclare `let G` (champs lus par la scène : `currentJob`, `currentSkill`, `jobs`, `skills` — `{ level }` par id, construits depuis `JOBS` / `SKILLS` —, `paused`, `dead`, `corruption`, `days`), `const SKILL_BY_ID` (depuis `SKILLS`), `const ageYears = () => G.days / DAYS_PER_YEAR`, `const lifespanYears = () => G.demoLifespan` (70 par défaut), puis `../js/scene.js`. Contrôles : `<select>` métier (tous les `JOBS`, groupés par catégorie) et compétence (tous les `SKILLS` + une option `inconnu`), curseurs âge (14–100) et espérance de vie (40–150), curseur corruption (0–100), cases pause et mort, boutons « métier niv. +1 » et « compétence niv. +1 », bouton « nouvelle vie » (niveaux à 0, âge 14). Aucun appel à `localStorage`.

- [ ] **Step 2 : Vérifier** — ouvrir <http://localhost:8765/outils/scene-demo.html> : le bandeau s'affiche (squelette Task 2), les contrôles modifient `G` (vérifier `G` dans la console). `localStorage.length` inchangé après usage.

- [ ] **Step 3 : Commit** — `git add outils/scene-demo.html && git commit -m "Scène : page de démonstration"`

---

### Task 4 : Boucle de mise à jour — métier, pause, âge

**Files :**
- Modify : `js/scene.js` (`updateScene`), `css/scene.css`, `img/scene.svg` (barbe dans `.tete`)

**Interfaces :**
- Consumes : `sceneFor`, `ageStage` (Task 1) ; DOM de la Task 2.
- Produces : `applyJob(jobId: string): void` — pose `actif` sur le `.decor[data-voie]`, `.element[data-element]`, `.objet[data-objet]` correspondants (retire les autres) et `data-voie` / `data-geste` sur `#scene`. Utilisée par les Tasks 7 à 9 sans modification.

- [ ] **Step 1 : Changement de métier avec fondu** — `updateScene` mémorise le dernier `G.currentJob` vu ; s'il change : sans `prefers-reduced-motion`, ajouter la classe `fondu`, puis après 250 ms `applyJob(G.currentJob)` (lu **au moment** de l'échange, pas au moment du déclenchement) et retirer `fondu` ; si un fondu est déjà en cours, ne pas en relancer un autre. Avec `prefers-reduced-motion` : `applyJob` immédiat. CSS : `#elements, #perso, #decors { transition: opacity .25s; } #scene.fondu #elements, #scene.fondu #perso, #scene.fondu #decors { opacity: 0; }`.

- [ ] **Step 2 : Pause et mort** — `data-pause` présent si `G.paused || G.dead`. CSS : `#scene[data-pause] * { animation-play-state: paused !important; }`.

- [ ] **Step 3 : Âge** — `data-age = ageStage(ageYears(), lifespanYears())`. CSS : `jeune` → `#perso { transform: scale(.9, .94); }` ; `vieux` → `#scene[data-age="vieux"] { --penche: 12deg; --tempo: 1.4; }` et `.barbe { display: inline; }`. Dessiner `.barbe` dans `.tete` de `scene.svg`.

- [ ] **Step 4 : Geste `repos`** — `#scene[data-geste="repos"]` : respiration (`.haut` : translation verticale ≤ 0,6 unité, 3,2 s, en respectant la règle `--penche`) + tête qui balaye (`.tete` : rotation ± 6°, 6 s).

- [ ] **Step 5 : Vérifier dans la démo** — métier quelconque → décor neutre + repos qui respire ; âge 20 / 40 / 60 (espérance 70) → jeune / adulte / vieux (voûté, barbu, plus lent) ; cocher pause puis mort → tout se fige.

- [ ] **Step 6 : Changements rapprochés (Review Focus 1)** — dans la console de la démo : `G.currentJob='glaneur'; setTimeout(()=>G.currentJob='bucheron',100); setTimeout(()=>G.currentJob='artisan',180);` puis après 1 s : `document.querySelector('#scene').dataset.geste` → `'repos'` tant que la Paysannerie n'est pas dessinée, puis `'frapper'` une fois la Task 7 faite (rejouer ce contrôle en Task 10) ; aucune classe `fondu` restante.

- [ ] **Step 7 : Commit** — `git commit -am "Scène : changement de métier, pause et âge"`

---

### Task 5 : Corruption et éclat de niveau

**Files :**
- Modify : `js/scene.js`, `css/scene.css`, `img/scene.svg` (`.yeux` dans `.tete`, contenu de `#effets`)

**Interfaces :**
- Consumes : `isLevelUp` (Task 1), boucle de la Task 4.
- Produces : `flash(el: Element, cls: string, ms = 900): void` — retire puis rajoute `cls` (avec reflow forcé pour relancer l'animation) et la retire après `ms`. Ne fait rien sous `prefers-reduced-motion`. Réutilisée par la Task 6 (`eclat-med`).

- [ ] **Step 1 : Corruption** — style `--corruption = G.corruption / 100` ; `data-corrompu` si `G.corruption >= 50`. SVG : `#effets .fumee` (3 à 4 volutes sombres derrière le personnage, montée lente en boucle) et `.yeux` (deux points `#e0322a`). CSS : `.fumee { opacity: var(--corruption); }`, `#ciel, #decors { filter: saturate(calc(1 - .6 * var(--corruption))) hue-rotate(calc(-25deg * var(--corruption))); }` (filtre **statique**, jamais animé), `#scene[data-corrompu] .yeux { display: inline; }`.

- [ ] **Step 2 : Éclat de niveau** — mémoriser `{ id, level }` du métier à chaque passage ; si `isLevelUp(prev, cur)` → `flash(scene, 'eclat')`. SVG : `#effets .halo` (lueur dorée derrière le personnage, `opacity: 0` au repos) et `#effets .gerbe` (6 à 8 étincelles autour du buste). CSS : `#scene.eclat .halo` et `.gerbe` animés une fois en 900 ms (opacité + translation vers l'extérieur).

- [ ] **Step 3 : Vérifier la corruption** — démo : corruption 0 → 30 → 60 → 100 : fumée de plus en plus présente, décor qui refroidit, yeux rouges à partir de 50.

- [ ] **Step 4 : Vérifier l'éclat** — « métier niv. +1 » → un seul éclat ; trois clics rapides → l'éclat repart à chaque clic sans rester affiché.

- [ ] **Step 5 : Nouvelle vie (Review Focus 2)** — démo : monter le métier au niveau 5, puis « nouvelle vie » → **aucun** éclat, `data-age="jeune"`. Puis changer de métier vers un métier de niveau supérieur → aucun éclat.

- [ ] **Step 6 : Commit** — `git commit -am "Scène : corruption et éclat de niveau"`

---

### Task 6 : Médaillons de compétence

**Files :**
- Create : `img/medaillons.svg`
- Modify : `js/scene.js` (chargement + mise à jour), `css/scene.css`

**Interfaces :**
- Consumes : `flash` (Task 5), `SKILL_BY_ID`, `SKILL_CATS`.
- Produces : `applySkill(skillId: string): void` — `actif` sur `.med[data-skill=skillId]` s'il existe, sinon `data-fallback` sur `.medaillon` et le texte `.med-initiale` = initiale du nom (ou de l'id si la compétence est inconnue), en majuscule ; `--cat` = couleur de `SKILL_CATS[cat]` (ou `var(--muted)` si inconnue) ; `title` = nom (ou id).

- [ ] **Step 1 : `img/medaillons.svg`** — `viewBox="0 0 40 40"` : cercle cadre (fond `var(--panel)`, contour `var(--cat, var(--accent))`), `<text class="med-initiale">` centré en `var(--font-titre)`, et 4 icônes animées en boucle (≤ 2 s, `transform` / `opacity` seulement) : `discipline` (flamme de bougie qui vacille), `assiduite` (sablier qui se retourne), `labeur` (faucille qui balance), `negoce` (pièce qui tourne).

- [ ] **Step 2 : Branchement** — `initScene` charge aussi `medaillons.svg` dans `div.medaillon` (échec = médaillon masqué, la scène continue). `updateScene` : `applySkill` quand `G.currentSkill` change ; `isLevelUp` sur la compétence → `flash(medaillon, 'eclat-med')`. CSS : `.medaillon { position: absolute; right: 10px; bottom: 10px; width: 48px; height: 48px; }` (40 px sous 900 px) ; `.med-initiale` visible seulement avec `[data-fallback]` ; `.eclat-med` : pulsation d'échelle + lueur dorée une fois.

- [ ] **Step 3 : Vérifier les icônes** — démo : les 4 compétences Fondamentaux → icône animée ; Force → « F » cerclé de la couleur Combat ; infobulle au survol = nom de la compétence.

- [ ] **Step 4 : Vérifier l'éclat** — « compétence niv. +1 » → le médaillon pulse une fois.

- [ ] **Step 5 : Compétence inconnue (Review Focus 4)** — démo : compétence `inconnu` → « I » cerclé de `--muted`, aucune erreur console. Et en console : `G.currentJob = 'metier-futur'` → pose de repos, aucune erreur.

- [ ] **Step 6 : Commit** — `git add img/medaillons.svg && git commit -am "Scène : médaillons de compétence"`

---

### Task 7 : Paysannerie I — décor et geste `frapper` (Artisan, Mineur)

**Files :**
- Modify : `img/scene.svg`, `css/scene.css`, `js/scene.js` (`VOIES_DESSINEES`)

**Interfaces :**
- Consumes : `applyJob` (Task 4), repères et pivots.
- Produces : décor `data-voie="paysannerie"`, éléments `enclume`, `paroi`, objets `marteau`, `pioche`, keyframes `frapper-*`.

- [ ] **Step 1 : Décor Paysannerie** — `<g class="decor" data-voie="paysannerie">` sur toute la largeur (0 → 480) : champs, chaumières, forge avec cheminée à gauche (`x < 160`), arbre ou moulin à droite (`x > 330`). Ciel de crépuscule : `#scene[data-voie="paysannerie"] { --ciel-haut: #1b1420; --ciel-bas: #6b2f17; }`. Feu de forge animé (opacité vacillante).

- [ ] **Step 2 : Éléments et objets** — `.element[data-element="enclume"]` et `[data-element="paroi"]` (pan de roche avec filon), `.objet[data-objet="marteau"]` et `[data-objet="pioche"]`, dessinés selon les repères.

- [ ] **Step 3 : Geste `frapper`** — cycle de 1,1 s : bras avant qui monte lentement puis s'abat vite (impact à ≈ 68 % du cycle, tête de l'outil au contact de l'élément), bras arrière qui tient la pièce / s'appuie, étincelles sur l'élément à l'impact (`#effets .impact`, visibles seulement avec `data-geste="frapper"`), léger recul du buste. Le prototype validé lors du brainstorming est la référence de rythme (`.superpowers/brainstorm/*/content/ambiance.html`, s'il existe encore).

- [ ] **Step 4 : Activer la voie** — `VOIES_DESSINEES = new Set(['paysannerie'])`. Run : `node --test tests/` → PASS.

- [ ] **Step 5 : Vérifier** — démo : Artisan → forge, enclume, marteau qui frappe, étincelles synchronisées avec l'impact ; Mineur → paroi + pioche, même geste ; essayer jeune / vieux (le coup tombe toujours sur l'élément) et une largeur de 1400 px (le décor remplit tout).

- [ ] **Step 6 : Commit** — `git commit -am "Scène : décor Paysannerie, Artisan et Mineur"`

---

### Task 8 : Paysannerie II — `ramasser` et `hacher` (Glaneur, Bûcheron)

**Files :**
- Modify : `img/scene.svg`, `css/scene.css`

**Interfaces :**
- Consumes : décor de la Task 7.
- Produces : éléments `gerbes`, `billot`, objets `panier`, `hache`, keyframes `ramasser-*`, `hacher-*`.

- [ ] **Step 1 : Glaneur** — `gerbes` (épis au sol), `panier` (dans la main arrière : dessiner l'objet dans `.main-arriere` avec `class="objet" data-objet="panier"`) ; geste `ramasser` ≈ 2,4 s : `.haut` se penche (≈ 35°), main avant au sol, se relève, dépose dans le panier.

- [ ] **Step 2 : Bûcheron** — `billot` avec une bûche, `hache` ; geste `hacher` ≈ 1,3 s : coup diagonal (bras avant de l'arrière-épaule vers le billot), éclats de bois (`#effets .copeaux`) à l'impact.

- [ ] **Step 3 : Vérifier** — démo : Glaneur et Bûcheron en jeune, adulte, vieux ; la main / la hache touche bien sa cible ; pas de membre qui se « déboîte » aux pivots.

- [ ] **Step 4 : Commit** — `git commit -am "Scène : Glaneur et Bûcheron"`

---

### Task 9 : Paysannerie III — `pecher` et `marchander` (Pêcheur, Négociant)

**Files :**
- Modify : `img/scene.svg`, `css/scene.css`

**Interfaces :**
- Consumes : décor de la Task 7.
- Produces : éléments `riviere`, `etal`, objets `canne`, `bourse`, keyframes `pecher-*`, `marchander-*`.

- [ ] **Step 1 : Pêcheur** — `riviere` (bande d'eau avec reflets ondulants, `x ∈ [236, 390]`), `canne` avec ligne et bouchon ; geste `pecher` ≈ 4 s : lancer, longue attente immobile (respiration), petite touche du bouchon (cercles dans l'eau).

- [ ] **Step 2 : Négociant** — `etal` (table + quelques marchandises), `bourse` ; geste `marchander` ≈ 1,8 s : pièces (`#effets .pieces`) qui passent d'une main à l'autre en arc au-dessus de l'étal, tête qui hoche.

- [ ] **Step 3 : Vérifier** — démo : les 6 métiers de Paysannerie enchaînés via le `<select>` → chaque changement fait un fondu propre, aucun objet ou élément d'un autre métier ne reste affiché.

- [ ] **Step 4 : Commit** — `git commit -am "Scène : Pêcheur et Négociant"`

---

### Task 10 : Vérification de la branche

**Files :** aucun nouveau (corrections éventuelles dans les fichiers de la scène).

- [ ] **Step 1 : Tests** — Run : `node --test tests/` → PASS.

- [ ] **Step 2 : Écran étroit (Review Focus 5)** — démo et jeu en 360 × 740 : pour Artisan, Pêcheur et Négociant, le personnage, l'objet et l'élément sont entiers ; `document.documentElement.scrollWidth <= innerWidth` → `true`.

- [ ] **Step 3 : Réduire les animations** — émulation `prefers-reduced-motion: reduce` : tout est immobile en pose de référence, changement de métier sans fondu, aucun éclat.

- [ ] **Step 4 : Vrai jeu** — partie neuve : Glaneur au départ, monter de niveau (éclat), passer Bûcheron (fondu), pause avec Espace (figé), console sans erreur ni avertissement. Rejouer le contrôle de la Task 4, Step 6 → `'frapper'`.

- [ ] **Step 5 : Fichiers partagés intacts** — `git diff --stat develop -- js/data.js js/game.js js/ui.js` → vide ; `git diff develop -- index.html` → exactement 3 lignes ajoutées.

- [ ] **Step 6 : Préparer la PR (sans la pousser)** — texte de PR vers `develop` : résumé, GIF de la démo (Artisan, changement de métier, éclat, vieux, corruption), lien vers la spec, consigne pour ajouter une voie (`VOIES_DESSINEES` + table `SCENES` + groupes SVG + keyframes). Attendre la demande de l'utilisateur pour pousser.
