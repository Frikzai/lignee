'use strict';
// Moteur de fin de partie : plafond de la vie, talent sans limite, relique, défis II, foi, Floraison.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Un jeu neuf, sans interface : data.js, game.js et le module foi.js dans un même contexte.
function jeu() {
  const src = ['data.js', 'game.js', 'foi.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8')).join('\n;\n');
  const ctx = vm.createContext({
    UI: { ready: false, ajouterJauge() {}, ajouterMarque() {}, ajouterRessource() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  });
  vm.runInContext(src + '\n;G = defaultState(); for (const f of HOOKS.init) f(); chooseTrait(G.pendingTraits[0]); G.trait = null;', ctx);
  return code => vm.runInContext(code, ctx);
}

test('espérance de vie : inchangée jusqu\'à 100 ans, de plus en plus lente au-delà', () => {
  const j = jeu();
  assert.equal(j('lifespanYears()'), 70);
  j('G.lifeBonusYears = 30');
  assert.equal(j('lifespanYears()'), 100);
  j('G.lifeBonusYears = 130');
  assert.ok(Math.abs(j('lifespanYears()') - 169.3) < 0.1);   // 200 ans bruts
  j('G.lifeBonusYears = 430');
  assert.ok(j('lifespanYears()') < 270);                     // 500 ans bruts
});

test('Veille des ancêtres : aucun plafond, le coût monte à chaque rang', () => {
  const j = jeu();
  j('G.legacy.points = 1e6');
  for (let i = 0; i < 30; i++) j('buyPerk("ancetres")');
  assert.equal(j('perkRank("ancetres")'), 30);
  assert.ok(j('perkCost(PERK_BY_ID.ancetres)') > 25 * 1.25 ** 29);
});

test('relique : son effet s\'applique sans entretien, une seule fois si on la rachète', () => {
  const j = jeu();
  const xp = j('getMult("xp:all")');
  j('G.relique = "observatoire"');
  assert.equal(j('getMult("xp:all")'), xp * 2);
  assert.equal(j('rawExpenses()'), 0);
  j('G.items.observatoire = true');
  assert.equal(j('getMult("xp:all")'), xp * 2);
  j('rebirth()');
  assert.equal(j('G.relique'), 'observatoire');   // elle passe à la génération suivante
});

test('défis du second palier : verrouillés tant que le premier n\'est pas réussi', () => {
  const j = jeu();
  j('startChallenge("ascete2")');
  assert.equal(j('G.challenge'), null);
  j('G.challengesDone.ascete = true; startChallenge("ascete2")');
  assert.equal(j('G.challenge'), 'ascete2');
});

test('foi : monte au Clergé, purifie la corruption, ouvre les métiers qui la demandent', () => {
  const j = jeu();
  j('G.unlocked["job:sonneur"] = true; G.currentJob = "sonneur"; G.corruption = 10');
  j('for (const f of HOOKS.tick) f(DAYS_PER_YEAR * 10)');
  assert.equal(j('G.foi'), 30);
  assert.equal(j('G.corruption'), 0);
  assert.equal(j('reqMet({ foi: 30 })'), true);
  j('G.currentJob = "tirelaine"; for (const f of HOOKS.tick) f(DAYS_PER_YEAR * 5)');
  assert.equal(j('G.foi'), 15);
});

test('Floraison : impossible sans sommet, puis l\'héritage repart de zéro et les graines restent', () => {
  const j = jeu();
  j('floraison()');
  assert.equal(j('G.floraison.fois'), 0);

  j('G.legacy.totalPoints = 5000; G.legacy.points = 300; G.legacy.perks = { memoire: 5, intendant: 1 }; G.jobs.glaneur.maxLevel = 80');
  j('G.unlocked["job:gardien"] = true; tick(1)');
  assert.equal(j('floraisonPossible()'), true);
  const g = j('grainesPreview()');
  assert.equal(g, 15);   // ⌊√(5000 / 20)⌋
  j('floraison()');
  assert.equal(j('G.floraison.graines'), g);
  assert.equal(j('G.floraison.fleuries.arcanes'), true);
  assert.equal(j('G.legacy.points'), 0);
  assert.equal(j('JSON.stringify(G.legacy.perks)'), '{}');
  assert.equal(j('G.jobs.glaneur.maxLevel'), 0);
  assert.equal(j('floraisonPossible()'), false);
  assert.equal(j('grainesPreview()'), 0);   // les points d'avant la Floraison ne comptent plus
});

test('Floraison : une seule voie fleurit, au choix ; les autres sommets sont à refaire', () => {
  const j = jeu();
  j('G.floraison.cycle.ombre = true; G.floraison.cycle.clerge = true; floraison("clerge")');
  assert.equal(j('JSON.stringify(G.floraison.fleuries)'), '{"clerge":true}');
  assert.equal(j('floraisonPossible()'), false);
  j('G.floraison.cycle.clerge = true; G.floraison.cycle.milice = true; floraison("arcanes")');   // voie non atteinte : la première atteinte et pas encore fleurie
  assert.equal(j('JSON.stringify(G.floraison.fleuries)'), '{"clerge":true,"milice":true}');
});

test('Floraison : les Bourgeons gardent les serviteurs, les quatre voies couronnent l\'arbre en quatre fois', () => {
  const j = jeu();
  j('G.floraison.racines.bourgeons = 1; G.legacy.perks = { memoire: 5, intendant: 1 }');
  for (const v of ['milice', 'arcanes', 'ombre']) j(`G.floraison.cycle.${v} = true; floraison()`);
  assert.equal(j('JSON.stringify(G.legacy.perks)'), '{"intendant":1}');
  assert.equal(j('G.floraison.fin'), false);
  j('G.floraison.cycle.clerge = true; floraison()');
  assert.equal(j('G.floraison.fin'), true);
});

test('racines : achat en graines, plafond respecté', () => {
  const j = jeu();
  j('G.floraison.graines = 100; buyRacine("bourgeons"); buyRacine("bourgeons")');
  assert.equal(j('racineRank("bourgeons")'), 1);
  assert.equal(j('G.floraison.graines'), 98);
  const xp = j('getMult("xp:all")');
  j('buyRacine("seve")');
  assert.equal(j('getMult("xp:all")'), xp * 2);
});

test('événements en chaîne : la finale suit le tournoi', () => {
  const j = jeu();
  j('G.coins = 1e6; G.unlocked["job:recrue"] = true; G.currentJob = "recrue"');
  j('G.event = { id: "tournoi", data: EVENT_BY_ID.tournoi.init(), expires: 60 }; chooseEvent(0)');
  assert.equal(j('G.suite'), 'joute');
  j('spawnEvent()');
  assert.equal(j('G.event.id'), 'joute');
  assert.equal(j('G.suite'), null);
});
