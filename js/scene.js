'use strict';
// =====================================================================
//  Lignée — scène animée du bandeau (équipe visuels)
//  Lit l'état du jeu (G, ageYears(), lifespanYears()…) sans jamais l'écrire.
// =====================================================================

// Métier → ce que montre la scène. Pour ajouter une voie : dessiner son décor,
// ses gestes, objets et éléments dans img/scene.svg + css/scene.css, puis l'ajouter à VOIES_DESSINEES.
const SCENES = {
  glaneur:       { voie: 'paysannerie', geste: 'ramasser',   objet: 'panier',        element: 'gerbes' },
  bucheron:      { voie: 'paysannerie', geste: 'hacher',     objet: 'hache',         element: 'billot' },
  pecheur:       { voie: 'paysannerie', geste: 'pecher',     objet: 'canne',         element: 'riviere' },
  mineur:        { voie: 'paysannerie', geste: 'frapper',    objet: 'pioche',        element: 'paroi' },
  artisan:       { voie: 'paysannerie', geste: 'frapper',    objet: 'marteau',       element: 'enclume' },
  negociant:     { voie: 'paysannerie', geste: 'marchander', objet: 'bourse',        element: 'etal' },

  recrue:        { voie: 'milice',      geste: 'veiller',    objet: 'lance',         element: null },
  garde:         { voie: 'milice',      geste: 'veiller',    objet: 'lance',         element: 'torche' },
  veteran:       { voie: 'milice',      geste: 'ferrailler', objet: 'epee',          element: 'mannequin' },
  chevalier:     { voie: 'milice',      geste: 'ferrailler', objet: 'epee-bouclier', element: 'mannequin' },
  capitaine:     { voie: 'milice',      geste: 'commander',  objet: 'epee',          element: null },
  general:       { voie: 'milice',      geste: 'commander',  objet: 'carte',         element: 'table' },
  connetable:    { voie: 'milice',      geste: 'commander',  objet: 'etendard',      element: null },

  novice:        { voie: 'arcanes',     geste: 'lire',       objet: 'grimoire',      element: 'pupitre' },
  alchimiste:    { voie: 'arcanes',     geste: 'incanter',   objet: 'fiole',         element: 'chaudron' },
  enchanteur:    { voie: 'arcanes',     geste: 'incanter',   objet: 'baton',         element: null },
  sage:          { voie: 'arcanes',     geste: 'lire',       objet: 'grimoire',      element: 'pupitre' },
  archimage:     { voie: 'arcanes',     geste: 'incanter',   objet: 'baton-orbe',    element: null },
  gardien:       { voie: 'arcanes',     geste: 'incanter',   objet: 'sablier',       element: null },

  tirelaine:     { voie: 'ombre',       geste: 'sefaufiler', objet: 'bourse',        element: null },
  contrebandier: { voie: 'ombre',       geste: 'sefaufiler', objet: 'sac',           element: null },
  voleur:        { voie: 'ombre',       geste: 'sefaufiler', objet: 'grappin',       element: null },
  assassin:      { voie: 'ombre',       geste: 'sefaufiler', objet: 'dague',         element: null },
  chefguilde:    { voie: 'ombre',       geste: 'commander',  objet: 'dague',         element: null },
  necromancien:  { voie: 'ombre',       geste: 'incanter',   objet: 'crane',         element: 'tombe' },
  seigneur:      { voie: 'ombre',       geste: 'incanter',   objet: 'orbe-noir',     element: null },
};

const REPOS = Object.freeze({ voie: 'neutre', geste: 'repos', objet: null, element: null });
const VOIES_DESSINEES = new Set();

function sceneFor(jobId, voies = VOIES_DESSINEES) {
  const s = SCENES[jobId];
  return s && voies.has(s.voie) ? { ...s } : { ...REPOS };
}

function ageStage(age, lifespan) {
  if (age >= 0.75 * lifespan) return 'vieux';
  return age < 25 ? 'jeune' : 'adulte';
}

function isLevelUp(prev, cur) {
  return !!prev && prev.id === cur.id && cur.level > prev.level;
}

// ------------------------------------------------------------- Navigateur
// Résolu par rapport à ce script : marche depuis index.html comme depuis outils/scene-demo.html.
const SCENE_BASE = typeof document !== 'undefined' && document.currentScript
  ? new URL('../img/', document.currentScript.src) : null;

async function loadSvg(name) {
  const res = await fetch(new URL(name, SCENE_BASE));
  if (!res.ok) throw new Error(`${name} : HTTP ${res.status}`);
  return res.text();
}

// Affiche le seul élément de la classe `cls` dont l'attribut `attr` vaut `value`.
function showOnly(cls, attr, value) {
  for (const el of document.querySelectorAll(`#scene .${cls}`)) el.classList.toggle('actif', el.getAttribute(attr) === value);
}

async function initScene() {
  const scene = document.getElementById('scene');
  if (!scene) return;
  try {
    scene.insertAdjacentHTML('afterbegin', await loadSvg('scene.svg'));
  } catch (err) {
    // page ouverte en file://, fichier absent… : le jeu continue sans bandeau
    scene.classList.add('hidden');
    console.warn('[scène] bandeau désactivé :', err.message);
    return;
  }
  const med = document.createElement('div');
  med.className = 'medaillon';
  scene.appendChild(med);
  showOnly('decor', 'data-voie', 'neutre');
  setInterval(updateScene, 100);
}

function updateScene() {
  if (typeof G === 'undefined' || !G) return;
}

if (typeof document !== 'undefined') initScene();

if (typeof module !== 'undefined') module.exports = { SCENES, REPOS, VOIES_DESSINEES, sceneFor, ageStage, isLevelUp };
