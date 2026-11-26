'use strict';
// Événements, alliances et dons de l'arbre.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Le moteur et tous les modules qui ajoutent des événements, sans interface.
function jeu() {
  const src = ['data.js', 'game.js', 'sante.js', 'saisons.js', 'foi.js', 'lignee.js', 'evenements.js']
    .map(f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8')).join('\n;\n');
  const ctx = vm.createContext({
    UI: { ready: false, ajouterJauge() {}, ajouterMarque() {}, ajouterRessource() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  });
  vm.runInContext(src + '\n;G = defaultState(); for (const f of HOOKS.init) f(); chooseTrait(G.pendingTraits[0]);', ctx);
  return code => vm.runInContext(code, ctx);
}

test('au moins 60 événements, identifiants uniques', () => {
  const j = jeu();
  assert.ok(j('EVENTS.length') >= 60, `${j('EVENTS.length')} événements`);
  assert.equal(j('new Set(EVENTS.map(e => e.id)).size'), j('EVENTS.length'));
});

test('chaque événement se tire, s\'affiche et chaque choix se joue sans erreur', () => {
  const j = jeu();
  const ids = j('EVENTS.map(e => e.id)');
  for (const id of ids) {
    for (let c = 0; c < j(`EVENT_BY_ID.${id}.choices.length`); c++) {
      // une maison riche, nommée, ancienne, à 40 ans, chaque fois remise à neuf
      j(`G = defaultState(); for (const f of HOOKS.init) f(); G.pendingTraits = null; G.trait = 'robuste';
         G.days = 40 * DAYS_PER_YEAR; G.coins = 1e6; G.corruption = 50; G.foi = 60; G.housing = 'manoir'; G.legacy.rebirths = 12;
         G.lignee.maison = 'Testeval'; for (let i = 0; i < 6; i++) enregistrerVie(G.lignee, resumeVie({ age: 60, jobs: {}, trait: null, mort: true }, JOBS), 'Odile');`);
      j(`{ const ev = EVENT_BY_ID.${id}, d = ev.init(); ev.cond(); ev.text(d); for (const ch of ev.choices) ch.label(d);
           const [msg] = ev.choices[${c}].run(d); if (typeof msg !== 'string' || !msg) throw new Error('${id} : message vide'); }`);
      assert.ok(Number.isFinite(j('G.coins')), `${id} choix ${c} : bourse ${j('G.coins')}`);
    }
  }
});

test('un événement récent ne revient pas tout de suite', () => {
  const j = jeu();
  j('G.days = 40 * DAYS_PER_YEAR');
  for (let i = 0; i < 40; i++) {
    j('spawnEvent(); G.event = null');
    const recents = j('[...G.recents]');
    assert.ok(recents.length <= 5);
    assert.equal(new Set(recents).size, recents.length, recents.join());
  }
});

test('alliance : le destin du conjoint compte pour la vie en cours, et l\'enfant peut en hériter', () => {
  const j = jeu();
  j('G.trait = "robuste"; G.days = 25 * DAYS_PER_YEAR');
  const xp = j('getMult("xp:all")');
  j('G.conjoint = { prenom: "Ysolde", maison: "Corbelune", trait: "genie" }');
  assert.ok(Math.abs(j('getMult("xp:all")') - xp * 1.3) < 1e-9);
  j('rebirth()');
  assert.ok(j('G.pendingTraits.includes("genie")'));
  assert.equal(j('G.traitHerite.de'), 'Ysolde Corbelune');
  assert.equal(j('G.conjoint'), null);
  j('chooseTrait("genie")');
  assert.equal(j('G.traitHerite'), null);
});

test('alliance : trois prétendants de maisons et de destins différents, sans don de l\'arbre', () => {
  const j = jeu();
  for (let i = 0; i < 20; i++) {
    const c = j('EVENT_BY_ID.alliance.init().candidats');
    assert.equal(new Set(c.map(x => x.maison)).size, 3);
    assert.equal(new Set(c.map(x => x.trait)).size, 3);
    assert.ok(c.every(x => !j(`TRAIT_BY_ID.${x.trait}.voie`)));
  }
});

test('dons de l\'arbre : absents avant la Floraison, toujours proposés après', () => {
  const j = jeu();
  for (let i = 0; i < 30; i++) assert.ok(!j('rollTraits().some(id => TRAIT_BY_ID[id].voie)'));
  j('G.floraison.cycle.milice = true; floraison()');
  assert.ok(j('G.pendingTraits.includes("lame")'));
  assert.ok(!j('G.pendingTraits.includes("fleur")'));   // réservé à l'arbre couronné
});
