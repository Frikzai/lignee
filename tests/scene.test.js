'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { SCENES, REPOS, sceneFor, ageStage, isLevelUp, flash } = require('../js/scene.js');

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
