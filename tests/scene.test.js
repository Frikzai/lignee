'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { SCENES, REPOS, sceneFor, ageStage, isLevelUp, flash, etatSante } = require('../js/scene.js');

test('sceneFor : artisan dans une voie dessinée', () =>
  assert.deepEqual(sceneFor('artisan', new Set(['paysannerie'])),
    { voie: 'paysannerie', geste: 'frapper', objet: 'marteau', element: 'enclume' }));

test('sceneFor : voie pas encore dessinée → repos', () =>
  assert.deepEqual(sceneFor('chevalier', new Set(['paysannerie'])), REPOS));

test('sceneFor : métier inconnu → repos', () => assert.deepEqual(sceneFor('inconnu'), REPOS));

test('sceneFor : le repli est une copie (REPOS ne peut pas être modifié par un appelant)', () => {
  sceneFor('inconnu').geste = 'casse';
  assert.equal(REPOS.geste, 'repos');
});

test('SCENES couvre exactement les métiers de data.js', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8');
  const jobIds = vm.runInNewContext(src + '\n;JOBS.map(j => j.id)');
  assert.deepEqual(Object.keys(SCENES).sort(), [...jobIds].sort());
});

test('ageStage', () => {
  assert.equal(ageStage(14, 70), 'jeune');
  assert.equal(ageStage(24.9, 70), 'jeune');
  assert.equal(ageStage(25, 70), 'adulte');
  assert.equal(ageStage(52.4, 70), 'adulte');
  assert.equal(ageStage(52.5, 70), 'vieux');
  assert.equal(ageStage(80, 70), 'vieux');
  assert.equal(ageStage(20, 24), 'vieux'); // les deux conditions : vieux l'emporte
});

test('isLevelUp', () => {
  assert.equal(isLevelUp(null, { id: 'a', level: 3 }), false);
  assert.equal(isLevelUp({ id: 'a', level: 3 }, { id: 'a', level: 4 }), true);
  assert.equal(isLevelUp({ id: 'a', level: 3 }, { id: 'a', level: 6 }), true);   // plusieurs niveaux d'un coup
  assert.equal(isLevelUp({ id: 'a', level: 3 }, { id: 'a', level: 3 }), false);
  assert.equal(isLevelUp({ id: 'a', level: 30 }, { id: 'a', level: 0 }), false); // nouvelle vie
  assert.equal(isLevelUp({ id: 'a', level: 3 }, { id: 'b', level: 9 }), false);  // changement de métier
});

test('flash : un niveau gagné pendant un éclat ne le relance pas (pas d\'effet stroboscope)', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const ajouts = [];
  const el = { classList: { add: c => ajouts.push(c), remove() {} }, getBoundingClientRect() {} };
  flash(el, 'eclat');
  t.mock.timers.tick(100); flash(el, 'eclat');
  t.mock.timers.tick(100); flash(el, 'eclat');
  assert.equal(ajouts.length, 1);
  t.mock.timers.tick(900); flash(el, 'eclat');   // l'éclat précédent est fini : un nouveau peut partir
  assert.equal(ajouts.length, 2);
});

test('chaque logement et chaque possession de data.js a son dessin dans scene.svg', () => {
  const svg = fs.readFileSync(path.join(__dirname, '..', 'img', 'scene.svg'), 'utf8');
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8');
  const { logis, objets } = vm.runInNewContext(src + '\n;({ logis: HOUSING.map(h => h.id), objets: ITEMS.map(i => i.id) })');
  const manquants = [
    ...logis.filter(id => !svg.includes(`data-logis="${id}"`)).map(id => 'logis ' + id),
    ...objets.filter(id => !svg.includes(`data-item="${id}"`)).map(id => 'possession ' + id),
  ];
  assert.deepEqual(manquants, []);
});

test('tout ce que SCENES référence est dessiné : décors, objets, éléments, gestes', () => {
  const svg = fs.readFileSync(path.join(__dirname, '..', 'img', 'scene.svg'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'scene.css'), 'utf8');
  const s = Object.values(SCENES);
  const uniques = cle => [...new Set(s.map(x => x[cle]).filter(Boolean))];
  const manquants = [
    ...uniques('voie').filter(v => !svg.includes(`data-voie="${v}"`)).map(v => 'décor ' + v),
    ...uniques('objet').filter(o => !svg.includes(`data-objet="${o}"`)).map(o => 'objet ' + o),
    ...uniques('element').filter(e => !svg.includes(`data-element="${e}"`)).map(e => 'élément ' + e),
    ...uniques('geste').filter(g => !css.includes(`[data-geste="${g}"]`)).map(g => 'geste ' + g),
  ];
  assert.deepEqual(manquants, []);
});

test('toutes les voies sont dessinées : aucun métier ne retombe au repos', () => {
  for (const id of Object.keys(SCENES)) assert.notEqual(sceneFor(id).geste, 'repos', id);
});

test('chaque compétence de data.js a son médaillon', () => {
  const med = fs.readFileSync(path.join(__dirname, '..', 'img', 'medaillons.svg'), 'utf8');
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8');
  const skills = vm.runInNewContext(src + '\n;SKILLS.map(s => s.id)');
  assert.deepEqual([...skills].filter(id => !med.includes(`data-skill="${id}"`)), []);
});

test('etatSante : la scène réagit sous 40 (faible) et sous 20 (critique)', () => {
  assert.equal(etatSante(100), 'bonne');
  assert.equal(etatSante(40), 'bonne');
  assert.equal(etatSante(39.9), 'faible');
  assert.equal(etatSante(20), 'faible');
  assert.equal(etatSante(19.9), 'critique');
  assert.equal(etatSante(0), 'critique');
  assert.equal(etatSante(undefined), 'bonne');   // module santé absent
});
