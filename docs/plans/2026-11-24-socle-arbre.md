# Socle « Arbre aux Lanternes » — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Livrer le kit Brindilles/Enluminure, les icônes d'interface, la barre du haut en inscriptions gravées, l'API d'interface (avec migration santé/saisons) et l'ambiance de saison.

**Architecture :** Kit en classes CSS (`css/kit.css`, ornements en SVG dans le CSS), sprite `img/icones.svg` utilisé via `icone(nom)`, registres d'API dans `ui.js` (logique pure `creerRegistre` testée sous Node), calque d'ambiance autonome (`js/ambiance.js`).

**Tech Stack :** HTML/CSS/JS sans dépendance, SVG, `node --test`.

**Spec :** `docs/specs/2026-11-24-socle-arbre.md`

## Global Constraints

- Branche `feature/socle-arbre` (créée depuis `develop`, spec commitée).
- Ne pas modifier `js/game.js`, `js/data.js`. `js/sante.js` / `js/saisons.js` : uniquement leur partie « Interface » (Task 5).
- Conserver tous les ids existants d'`index.html` et les classes `.age-box`, `.sidebar`, `.tabs` ; `UI.update()`, `UI.toast()`, `UI.closeModal()` gardent leur signature.
- Jamais d'aplat d'or. Seuls `transform` et `opacity` animés. `prefers-reduced-motion` coupe les animations décoratives.
- Tests : `node --test` (Node 24). Jeu : `python3 -m http.server 8765`.
- Commits en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pas de push sans demande.

## Review Focus

1. **Ordre de chargement** : un module chargé avant `ui.js` qui appellerait l'API planterait au chargement (`UI` indéfini) → la Task 5 réordonne les scripts et vérifie la console sur une partie neuve.
2. **Module absent** (saisons ou santé retirés de `index.html`) : le jeu et l'ambiance doivent continuer (saison par défaut `printemps`, pas de jauge) → Task 6 et Task 7.
3. **Déclaration en double** (un module rechargé, un id réutilisé) : remplacer, jamais dupliquer l'élément affiché → test du registre (Task 3) + vérification DOM (Task 5).
4. **Valeur dynamique qui lève une exception** dans un module (ex. `currentSeason` cassé) : l'interface ne doit pas s'arrêter → le rendu d'une ressource/jauge est protégé par `try/catch` (Task 3), vérifié en Task 3 Step 6.
5. **Écran étroit** : 4+ inscriptions dans la barre du haut à 360 px → retour à la ligne sans débordement (Task 4 Step 6).

---

### Task 1 : Sprite d'icônes et helper

**Files :** Create `img/icones.svg`, `outils/icones.html` · Modify `js/ui.js` (helper), `css/kit.css` (création, règle `.icone`), `index.html` (`<link>` vers `css/kit.css` après `style.css`)

**Interfaces :** Produces `icone(nom: string, cls = ''): SVGSVGElement` (global, `ui.js`) ; symboles `i-ecus`, `i-revenu`, `i-bonheur`, `i-sante`, `i-age`, `i-lignee`, `i-printemps`, `i-ete`, `i-automne`, `i-hiver`, `i-pause`, `i-reprendre`, `i-cadenas`, `i-interdit`, `i-acquis`, `i-etoile`, `i-risque`, `i-soin`.

- [ ] **Step 1 : Dessiner le sprite** — `viewBox="0 0 24 24"` par symbole, tracés au trait sans couleur en dur (les parties pleines en `style="fill:currentColor"`), cohérents avec les maquettes validées (pièce, bourse, cœur, fiole, bougie, lanterne, soleil…).
- [ ] **Step 2 : Helper** — `icone()` crée le `<svg class="icone …" aria-hidden="true">` avec `<use href="img/icones.svg#i-{nom}">` (namespace SVG via `document.createElementNS`).
- [ ] **Step 3 : CSS** — `.icone` selon spec §4.
- [ ] **Step 4 : Planche** `outils/icones.html` — affiche toutes les icônes (nom dessous) à 16, 24 et 48 px, en `--accent` et `--muted`, en chargeant `../css/style.css`, `../css/kit.css`, et des `<use href="../img/icones.svg#…">`.
- [ ] **Step 5 : Vérifier** — ouvrir la planche : 18 icônes lisibles à 16 px, aucune vide (inspecter qu'aucun `<use>` ne pointe vers un id absent : `[...document.querySelectorAll('use')].every(u => u.getBBox().width > 0)` → `true`). `node --test` → PASS.
- [ ] **Step 6 : Commit** — `Socle : jeu d'icônes de l'interface`.

### Task 2 : Le kit Brindilles / Enluminure

**Files :** Modify `css/kit.css` · Create `outils/kit.html`

**Interfaces :** Produces les classes `.cadre`, `.cadre-noble`, `.lanterne`, `.sep`, `.sep-noble`, `.btn-noble`, `.inscription`, `.brin`, et les variables `--orne`, `--orne-vif`, `--filet`, `--lanterne`, `--lanterne-halo` (spec §3).

- [ ] **Step 1 : Variables et `.cadre`** — brindilles en SVG data-URI dans `::before` (haut-gauche) et `::after` (bas-droit, rotation 180°), `position: relative` sur le cadre ; les pseudo-éléments ne captent pas les clics (`pointer-events: none`).
- [ ] **Step 2 : `.cadre-noble`** — double filet (`border` `--orne` + `box-shadow: inset 0 0 0 3px var(--panel), inset 0 0 0 4px var(--filet)`), filigranes aux 4 coins (un seul `::before` avec 4 `background` positionnés), et `::after` libre pour la `.lanterne`.
- [ ] **Step 3 : `.lanterne`** — `<span class="lanterne">` positionné en haut au centre (`top: -14px`), corps en `background` SVG, halo en `::after` dont l'opacité respire (`@keyframes lanterne-souffle`, 3 s) ; masqué en impression, figé sous reduced-motion.
- [ ] **Step 4 : `.sep`, `.sep-noble`, `.btn-noble`, `.inscription`, `.brin`** — selon la maquette validée (inscriptions gravées : `<small>` IM Fell SC `--muted` au-dessus, `<b>` chiffres tabulaires).
- [ ] **Step 5 : Planche** `outils/kit.html` — un exemple de chaque pièce sur fond `--bg`, avec une inscription par ressource et un bouton noble.
- [ ] **Step 6 : Vérifier** — capture de la planche comparée à la maquette validée (brindilles, filigranes, lanterne qui respire, inscriptions). `node --test` → PASS.
- [ ] **Step 7 : Commit** — `Socle : kit Brindilles et Enluminure`.

### Task 3 : API d'interface (registres)

**Files :** Modify `js/ui.js`, `index.html` (conteneurs `#ressources-modules` dans la barre du haut, `#jauges` après `#traitLine`) · Create `tests/ui-api.test.js`

**Interfaces :**
- Produces `creerRegistre(rendre: (def) => void) → { ajouter(def), demarrer(), liste(): def[] }` (global + `module.exports` sous Node).
- Produces `UI.ajouterRessource(def)`, `UI.ajouterJauge(def)`, `UI.ajouterMarque(def)` (formes : spec §6) et leur rendu à chaque `UI.update()` pour les valeurs dynamiques.

- [ ] **Step 1 : Tests qui échouent** — `tests/ui-api.test.js` :
```js
const { creerRegistre } = require('../js/ui.js');
test('avant demarrer, rien n\'est rendu', () => { const rendus = []; const r = creerRegistre(d => rendus.push(d.id)); r.ajouter({ id: 'a' }); assert.deepEqual(rendus, []); });
test('demarrer rend tout ce qui a été déclaré', () => { const rendus = []; const r = creerRegistre(d => rendus.push(d.id)); r.ajouter({ id: 'a' }); r.ajouter({ id: 'b' }); r.demarrer(); assert.deepEqual(rendus, ['a', 'b']); });
test('après demarrer, une déclaration est rendue tout de suite', () => { const rendus = []; const r = creerRegistre(d => rendus.push(d.id)); r.demarrer(); r.ajouter({ id: 'c' }); assert.deepEqual(rendus, ['c']); });
test('un id déjà déclaré remplace l\'ancien', () => { const r = creerRegistre(() => {}); r.ajouter({ id: 'a', v: 1 }); r.ajouter({ id: 'a', v: 2 }); assert.equal(r.liste().length, 1); assert.equal(r.liste()[0].v, 2); });
test('une déclaration sans id est refusée', () => { const r = creerRegistre(() => {}); assert.throws(() => r.ajouter({}), /id/); });
```
- [ ] **Step 2 : Vérifier l'échec** — `node --test` → FAIL (`creerRegistre` absent / `ui.js` non exportable).
- [ ] **Step 3 : Implémenter `creerRegistre`** et l'export en bas de `ui.js` (`if (typeof module !== 'undefined') module.exports = { creerRegistre };`).
- [ ] **Step 4 : Vérifier** — `node --test` → PASS.
- [ ] **Step 5 : Brancher l'API** — trois registres créés dans `UI` ; `UI.init()` appelle `demarrer()` après la construction des tableaux ; rendu : ressource → `.inscription` (+ `.brin` avant) dans `#ressources-modules` avec `data-id` (un rendu d'un id existant remplace le nœud) ; jauge → bloc libellé + `.bar` dans `#jauges` ; marque → `.marque` dans la cellule cible (`jobRows[id].tr.firstChild`, `housingRows[id].cells[0]`, `itemRows[id].cells[1]`). `UI.update()` met à jour icône/libellé/valeur/titre/ton des ressources et jauges, chaque mise à jour dans un `try/catch` qui `console.warn` une seule fois par id.
- [ ] **Step 6 : Vérifier en navigateur** — dans la console du jeu : `UI.ajouterRessource({ id: 'essai', icone: 'etoile', libelle: 'Essai', valeur: () => '42' })` → une 4ᵉ inscription apparaît ; la redéclarer → toujours une seule ; `UI.ajouterRessource({ id: 'casse', icone: 'etoile', libelle: 'X', valeur: () => { throw new Error('boum'); } })` → un seul avertissement, le jeu continue (l'âge avance).
- [ ] **Step 7 : Commit** — `Socle : API d'interface pour les modules`.

### Task 4 : Barre du haut et cadre général

**Files :** Modify `index.html`, `js/ui.js`, `css/style.css`, `css/kit.css`

**Interfaces :** Consumes `icone()`, le kit, l'API (Task 1–3).

- [ ] **Step 1 : Barre du haut** — inscriptions Écus / Par jour / Bonheur (spec §5) autour des ids existants, `.brin` entre elles, conteneur `#ressources-modules` après Bonheur ; `#pauseBtn` : `updateTop` y met `icone('pause'|'reprendre')` + libellé (au lieu de ⏸/▶).
- [ ] **Step 2 : Colonne** — `#nowCard` en `.cadre-noble` + `<span class="lanterne">` ; `#eventCard`, `#autoCard` en `.cadre`.
- [ ] **Step 3 : Éléments construits** — `.table-wrap`, cartes de talents/défis/hauts faits, journal, statistiques, notifications : `.cadre` ; `.modal-box` : `.cadre-noble` + lanterne ; tutoriel : `.cadre-noble` ; `#rebirthBtn`, bouton de `showDeath`, bouton « Confirmer » de `confirm()` : `.btn-noble`.
- [ ] **Step 4 : Emojis → icônes** — 🔒 (`cadenas`), ⛔ (`interdit`), ✔ (`acquis`), ★ (`etoile` : `.ach.unlocked h4::before` et statut des défis) ; supprimer les règles CSS devenues inutiles.
- [ ] **Step 5 : Vérifier** — jeu neuf : barre du haut conforme à la maquette C, colonne noble avec lanterne, 9 onglets (onglets verrouillés vérifiés en forçant la classe `active`), fenêtres trait / mort (`die()` en console) / confirmation (Transmettre), tutoriel, notification (Sauvegarder) ; aucun emoji restant (`document.body.innerText` ne contient aucun de 🔒⛔✔★⏸▶⚠🌱☀️🍂❄️ — santé/saisons migrent en Task 5, contrôle final en Task 7). `node --test` → PASS.
- [ ] **Step 6 : Écran étroit (Review Focus 5)** — 360 px : barre du haut qui passe à la ligne, `scrollWidth <= innerWidth`.
- [ ] **Step 7 : Commit** — `Socle : barre du haut gravée et cadres Brindilles/Enluminure`.

### Task 5 : Migration santé et saisons vers l'API

**Files :** Modify `js/saisons.js` (section Interface), `js/sante.js` (section Interface), `index.html` (ordre des scripts)

- [ ] **Step 1 : Ordre** — `index.html` : `data.js`, `game.js`, `ui.js`, `sante.js`, `saisons.js`, `scene.js`, `main()`, `debug.js`.
- [ ] **Step 2 : Saisons** — remplacer `SeasonUI` par `UI.ajouterRessource({ id: 'saison', icone: () => currentSeason().id, libelle: 'Saison', valeur: () => currentSeason().name, titre: () => \`${describeSeason(currentSeason())}\nFin de la saison dans ${Math.ceil(seasonDaysLeft())} jours\` })` ; supprimer le `HOOKS.ui.push` correspondant.
- [ ] **Step 3 : Santé** — remplacer `HealthUI` par `UI.ajouterJauge({ id: 'sante', icone: 'sante', libelle: 'Santé', etat: () => … })` (mêmes textes et infobulle qu'avant ; `ton` : ≥ 60 bon, ≥ 35 moyen, sinon mauvais) et des `UI.ajouterMarque` : pour chaque métier avec `jobRisk(id)` (icône `risque`, deux icônes si ≥ 2, titre « Métier pénible : −x santé / an », ton `mauvais`), chaque logement de `HEALTH.housingRegen` et objet de `HEALTH.itemRegen` (icône `soin`, texte `+x santé/an`, ton `bon`). Supprimer le `<style>` injecté et le `HOOKS.ui.push`.
- [ ] **Step 4 : Vérifier (Review Focus 1, 3)** — contexte navigateur vierge : console sans erreur ; inscription Saison avec icône, change au fil des saisons ; jauge Santé avec couleur selon le niveau (forcer `G.health = 30`) ; marques de pénibilité (Mineur) et de récupération (Chaumière…) visibles une seule fois chacune ; panneau de debug (Ctrl+Maj+D) → « Transmettre » fonctionne. `node --test` → PASS.
- [ ] **Step 5 : Module absent (Review Focus 2)** — retirer temporairement `saisons.js` et `sante.js` d'`index.html` : le jeu tourne, pas d'inscription Saison ni de jauge, aucune erreur. Remettre.
- [ ] **Step 6 : Commit** — `Santé et saisons : affichage via l'API d'interface`.

### Task 6 : Ambiance de saison

**Files :** Create `js/ambiance.js`, `css/ambiance.css` · Modify `index.html` (calque, `<link>`, `<script>` après `saisons.js`)

**Interfaces :** Produces `saisonAmbiance(): 'printemps'|'ete'|'automne'|'hiver'` (lit `currentSeason()` si défini, sinon `'printemps'`).

- [ ] **Step 1 : Calque** — `<div id="ambiance" aria-hidden="true">` en tout début de `<body>` ; `css/ambiance.css` : `position: fixed; inset: 0; z-index: 0; pointer-events: none` ; `.layout` reste au-dessus (z-index 1).
- [ ] **Step 2 : Particules** — `ambiance.js` crée 18 `<i>` avec `--x`, `--retard`, `--duree` (12–22 s), `--taille` pseudo-aléatoires (générateur à graine fixe, pour un rendu stable) ; trajectoires par `@keyframes` selon `[data-saison]` (braise monte, feuille tombe en tournoyant, flocon dérive) ; opacité max 0,35.
- [ ] **Step 3 : Saison** — `setInterval` 1 s : si `saisonAmbiance()` change, opacité du calque à 0 (transition 0,8 s), puis `data-saison` mis à jour et retour à 1.
- [ ] **Step 4 : Pause et reduced-motion** — `body.is-paused #ambiance i { animation-play-state: paused; }` ; `@media (prefers-reduced-motion: reduce) { #ambiance { display: none; } }`.
- [ ] **Step 5 : Vérifier** — forcer chaque saison (`G.days = 14*365 + k*91.25 + 5`) : particules adaptées, discrètes, derrière les panneaux, clics non bloqués (`document.elementFromPoint` sur un bouton) ; pause → figées ; reduced-motion → absentes ; sans `saisons.js` → braises de printemps. `node --test` → PASS.
- [ ] **Step 6 : Commit** — `Socle : ambiance de saison`.

### Task 7 : Vérification de la branche

- [ ] **Step 1** — `node --test` → PASS.
- [ ] **Step 2** — partie neuve dans un contexte vierge : barre du haut, colonne, onglets, fenêtres, tutoriel, ambiance ; aucun emoji décoratif dans `document.body.innerText` (liste de la Task 4 Step 5) ; console sans erreur.
- [ ] **Step 3** — 360 / 900 / 1280 px : pas de débordement.
- [ ] **Step 4** — `git diff --stat develop -- js/game.js js/data.js` → vide ; diff de `sante.js` / `saisons.js` limité à leur section Interface.
- [ ] **Step 5** — texte de PR prêt (résumé, captures, demande de relecture à l'équipe moteur pour `sante.js` / `saisons.js`).
