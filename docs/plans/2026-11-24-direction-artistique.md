# Direction artistique « Braise & suie » — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Donner à tout le jeu l'ambiance dark fantasy « Braise & suie » (palette, police IM Fell English SC, matières) en ne modifiant que le CSS et les polices.

**Architecture :** On garde les noms des variables CSS de `css/style.css` et on change leurs valeurs ; on ajoute `--ember` et `--font-titre`. Les couleurs codées en dur héritées de l'ancienne palette sont remplacées. Un test Node vérifie les contrastes de la palette pour qu'un futur changement ne casse pas la lisibilité.

**Tech Stack :** CSS pur, police TTF auto-hébergée, `node --test` (Node ≥ 18, aucune dépendance).

**Spec :** `docs/specs/2026-11-24-direction-artistique-et-scene.md` (§2, §3, §5)

## Global Constraints

- Branche : `feature/direction-artistique` (déjà créée depuis `develop`, la spec y est commitée).
- Fichiers autorisés : `css/style.css`, `fonts/*`, `tests/*`. **Ne jamais modifier** `js/data.js`, `js/game.js`, `js/ui.js`, `index.html`.
- Aucune dépendance npm, aucun lien vers Google Fonts ou un CDN : le jeu doit marcher hors-ligne.
- Lancer le jeu : `python3 -m http.server 8765` à la racine puis <http://localhost:8765>.
- Contraste ≥ 4,5:1 (WCAG AA) : `--text`, `--muted`, `--accent` sur `--bg`, `--panel`, `--panel2` ; `--ember` sur `--bg` et `--panel` (jamais de texte `--ember` sur `--panel2`).
- Messages de commit en français, terminés par la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Ne pas pousser ni ouvrir de PR sans demande explicite de l'utilisateur.

## Review Focus

1. **Couleurs de catégorie en style inline** (`ui.js` fait `el.style.background = JOB_CATS[...].color` sur les barres) : un dégradé posé via `background` sur `.bar > div` serait écrasé → le reflet des barres doit passer par `.bar::after`. Vérifié en Task 3, étape de capture de la carte « en cours ».
2. **Faux gras** : IM Fell English SC n'a qu'une graisse ; tout élément en `font-weight: 600` passé en police titre doit repasser en `normal`. Vérifié en Task 1 (capture des noms de métiers).
3. **Police non chargée** (fichier absent, lent) : le texte doit rester lisible en Georgia. Vérifié en Task 1 (requête bloquée).
4. **Préférence « réduire les animations »** : la pulsation des cartes d'événement et l'arrivée des toasts doivent être coupées. Vérifié en Task 3.
5. **Écran étroit (< 900 px)** : onglets en police titre plus large → ils doivent passer à la ligne sans déborder. Vérifié en Task 3.

---

### Task 1 : Police IM Fell English SC

**Files :**
- Create : `fonts/IMFeENsc28P.ttf`, `fonts/OFL.txt`
- Modify : `css/style.css` — `:root` (l. 1-13), l. 23, 101-104 (`.tabs button`), 57-61 (`.btn`), 114, 122, 150, 169, 189

**Interfaces :**
- Produces : variable `--font-titre: "IM Fell English SC", Georgia, "Times New Roman", serif;` dans `:root`, utilisée par la Task 3 et par `css/scene.css` (plan scène).

- [ ] **Step 1 : Télécharger la police et sa licence**

```bash
mkdir -p fonts
curl -fsSL -o fonts/IMFeENsc28P.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/imfellenglishsc/IMFeENsc28P.ttf
curl -fsSL -o fonts/OFL.txt https://raw.githubusercontent.com/google/fonts/main/ofl/imfellenglishsc/OFL.txt
file fonts/IMFeENsc28P.ttf && head -3 fonts/OFL.txt
```
Attendu : `TrueType Font data`, taille ≈ 183 932 octets ; `OFL.txt` commence par un copyright « IM Fell ».

- [ ] **Step 2 : Déclarer la police** — en tête de `css/style.css`, `@font-face { font-family: "IM Fell English SC"; src: url("../fonts/IMFeENsc28P.ttf") format("truetype"); font-display: swap; }` et ajouter `--font-titre` dans `:root`.

- [ ] **Step 3 : Appliquer la police titre** — remplacer chaque `font-family: Georgia…` (l. 23, 114, 150, 169, 189) par `var(--font-titre)` ; ajouter `font-family: var(--font-titre)` à `.tabs button` et `.btn` ; ajouter `.name-cell .row-name { font-family: var(--font-titre); font-weight: normal; font-size: 15px; }`. Partout où la police titre est appliquée, `font-weight: normal` (pas de faux gras).

- [ ] **Step 4 : Vérifier dans le navigateur**

Lancer le serveur, ouvrir le jeu, puis dans la console :
```js
await document.fonts.ready; document.fonts.check('16px "IM Fell English SC"')
```
Attendu : `true`. Capture de l'onglet Métiers : logo, onglets, noms de métiers en IM Fell, sans faux gras ; chiffres toujours en police système.

- [ ] **Step 5 : Vérifier le repli** — dans les DevTools, bloquer la requête `IMFeENsc28P.ttf` et recharger. Attendu : titres en Georgia, rien de cassé.

- [ ] **Step 6 : Commit**

```bash
git add fonts/ css/style.css
git commit -m "Police IM Fell English SC pour les titres"
```

---

### Task 2 : Palette Braise & suie + test de contraste

**Files :**
- Create : `tests/contrast.test.js`
- Modify : `css/style.css` (`:root` et les couleurs codées en dur listées en Step 4)

**Interfaces :**
- Consumes : rien.
- Produces : `--ember: #e0561f` et les nouvelles valeurs de palette ; `node --test` devient la commande de test du projet (réutilisée par le plan scène).

- [ ] **Step 1 : Écrire le test qui échoue** — `tests/contrast.test.js` (CommonJS, `node:test` + `node:assert/strict`) : lit `css/style.css`, extrait les variables hexadécimales du premier bloc `:root { … }` par regex, calcule le ratio de contraste WCAG 2.x (luminance relative sRGB). Tests :

```js
test('la palette définit --ember', () => assert.match(vars['--ember'] ?? '', /^#[0-9a-f]{6}$/i));
for (const fg of ['--text', '--muted', '--accent'])
  for (const bg of ['--bg', '--panel', '--panel2'])
    test(`${fg} sur ${bg} ≥ 4.5`, () => assert.ok(ratio(vars[fg], vars[bg]) >= 4.5, `${ratio(vars[fg], vars[bg]).toFixed(2)}`));
for (const bg of ['--bg', '--panel'])
  test(`--ember sur ${bg} ≥ 4.5`, () => assert.ok(ratio(vars['--ember'], vars[bg]) >= 4.5));
```

- [ ] **Step 2 : Vérifier qu'il échoue**

Run : `node --test`
Attendu : FAIL sur « la palette définit --ember » (et les tests `--ember sur …`).

- [ ] **Step 3 : Nouvelles valeurs de `:root`** — exactement le tableau §3.1 de la spec (`--bg #14100d`, `--panel #1f1813`, `--panel2 #2a2019`, `--border #3d2f24`, `--text #ead9bd`, `--muted #9a8670`, `--accent #d9973a`, `--ember #e0561f`, `--good #8fa86a`, `--bad #c4452f`, `--event #6f9fb0`, `--radius 3px`).

- [ ] **Step 4 : Remplacer les couleurs codées en dur de l'ancienne palette**

Les numéros de ligne sont ceux d'**avant** la Task 1 (repérez-vous au sélecteur).

| Sélecteur (n° de ligne d'origine) | Avant | Après |
|---|---|---|
| 39 `.topbar` | `linear-gradient(#251e18, #1c1713)` | `linear-gradient(#211913, #17110d)` |
| 49 `.bar` | `#0f0d0b` | `#0b0806` |
| 53-54 `.age-bar` | `#6fae5a`, `#d4a64a`, `#e06456` | `var(--good)`, `var(--accent)`, `var(--bad)` |
| 66-67 `.btn.danger` | `#7a3a32` / `#f0a196` / hover `var(--bad)` | bordure `#7a3418`, texte `var(--ember)`, hover bordure `var(--ember)` |
| 84, 89, 170 | `rgba(90,169,200,…)` | `rgba(111,159,176,…)` (mêmes alphas) |
| 115, 193 | `#2a231d` | `var(--panel2)` |
| 118 | `#262019` | `var(--panel2)` |
| 119, 188 | `#2e261b`, `#30271d` | `#33271c` |
| 125 | `#1a1612` | `#1a140f` |
| 166 | `rgba(212,166,74,.35)` | `rgba(217,151,58,.35)` |

Les autres couleurs (puces `.req`, corruption, bordures dorées des cartes possédées) restent.

- [ ] **Step 5 : Vérifier que le test passe**

Run : `node --test`
Attendu : PASS, 12 tests. Si `--muted` échoue sur `--panel2`, l'éclaircir par petits pas (`#9e8a73`, …) et reporter la valeur retenue dans le tableau §3.1 de la spec.

- [ ] **Step 6 : Contrôle visuel** — recharger le jeu, parcourir les 9 onglets : plus aucune teinte bleue « ancienne » sur les événements / défis, bouton « Tout effacer » en orange braise.

- [ ] **Step 7 : Commit**

```bash
git add tests/contrast.test.js css/style.css docs/specs/2026-11-24-direction-artistique-et-scene.md
git commit -m "Palette Braise & suie et test de contraste"
```

---

### Task 3 : Matières et composants

**Files :**
- Modify : `css/style.css` (body, `.card`, `.table-wrap`, `.journal`, `.modal-box`, `.bar`, `.btn`, `.tabs`, fin de fichier pour `prefers-reduced-motion`)

**Interfaces :**
- Consumes : `--font-titre` (Task 1), `--ember` et palette (Task 2).
- Produces : rien de nouveau pour les autres plans.

- [ ] **Step 1 : Fond** — `body` : grain via `background-image` = SVG `feTurbulence` en data-URI (`baseFrequency` ≈ 0.9, opacité ≈ 0.05) superposé à `var(--bg)` ; vignettage via `body::before { position: fixed; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.55)); }`. Vérifier que `.topbar` (z-index 10), la modale, les toasts et le tutoriel restent au-dessus et cliquables ; donner `position: relative; z-index: 1` à `.layout` si besoin.

- [ ] **Step 2 : Double filet** — `.card, .table-wrap, .journal, .modal-box` : ajouter `box-shadow: inset 0 0 0 1px #0b0806, inset 0 0 0 2px rgba(217,151,58,.06);` en conservant les ombres existantes (`.event-card`, `.modal-box`) par concaténation.

- [ ] **Step 3 : Barres** — `.bar` : `box-shadow: inset 0 1px 3px rgba(0,0,0,.8);`. Reflet : `.bar::after { content: ''; position: absolute; inset: 0; background: linear-gradient(rgba(255,255,255,.14), transparent 60%); pointer-events: none; }` (**pas** de `background` sur `.bar > div` : `ui.js` y écrit la couleur en inline).

- [ ] **Step 4 : Boutons** — `.btn` : `background: transparent; border-color: var(--accent); color: var(--text);` ; `.btn:hover:not(:disabled)` : `border-color: var(--ember); box-shadow: 0 0 8px rgba(224,86,31,.45);` ; `transition: box-shadow .15s, border-color .15s`. `.btn.primary` reste plein (`var(--accent)`, texte `#1b150f`).

- [ ] **Step 5 : Onglets** — `.tabs button` : `font-size: 15px` ; `.tabs button.active` : `text-shadow: 0 0 8px rgba(217,151,58,.45);`.

- [ ] **Step 6 : Réduire les animations** — en fin de fichier :

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
```

- [ ] **Step 7 : Vérification visuelle complète** — avec le serveur lancé, captures (Playwright ou à la main) :
  1. les 9 onglets en 1280×800 ;
  2. la carte « en cours » : barres métier/compétence à la couleur de catégorie **avec** le reflet ;
  3. largeur 375 px : onglets qui passent à la ligne, rien ne déborde horizontalement (`document.documentElement.scrollWidth <= innerWidth` → `true`) ;
  4. émulation `prefers-reduced-motion: reduce` : `getComputedStyle(document.querySelector('#eventCard')).animationDuration` → `1e-05s` (ou équivalent ≤ 0.01 ms).

- [ ] **Step 8 : Tests et commit**

Run : `node --test` → PASS.
```bash
git add css/style.css
git commit -m "Matières dark fantasy : grain, vignettage, cadres, barres, boutons, onglets"
```

- [ ] **Step 9 : Préparer la PR (sans la pousser)** — rédiger dans le terminal le texte de PR vers `develop` : résumé, fichiers touchés, captures avant/après, rappel que `data.js` / `game.js` / `ui.js` / `index.html` sont intacts (`git diff --stat develop` le prouve). Attendre la demande de l'utilisateur pour `git push` / `gh pr create`.
