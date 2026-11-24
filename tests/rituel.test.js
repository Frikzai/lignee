'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DESTINS, epitaphe } = require('../js/rituel.js');

test('chaque trait de data.js a son destin : un emblème du sprite et une phrase', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8');
  const traits = vm.runInNewContext(src + '\n;TRAITS.map(t => t.id)');
  const sprite = fs.readFileSync(path.join(__dirname, '..', 'img', 'icones.svg'), 'utf8');
  const manquants = [...traits].filter(id => !DESTINS[id] || !DESTINS[id].saveur || !sprite.includes(`id="i-${DESTINS[id].embleme}"`));
  assert.deepEqual(manquants, []);
});

test('epitaphe : mort', () => {
  assert.deepEqual(epitaphe({ age: 61, metier: 'Artisan', niveau: 41, trait: 'Robuste' }, true, 7), {
    titre: 'Ici s\'éteint',
    resume: '61 ans · Artisan niv. 41 · « Robuste »',
    heritage: '+7 points',
  });
});

test('epitaphe : transmission volontaire, sans trait, un seul point', () => {
  assert.deepEqual(epitaphe({ age: 34, metier: 'Glaneur', niveau: 18, trait: null }, false, 1), {
    titre: 'Ici transmet son héritage',
    resume: '34 ans · Glaneur niv. 18',
    heritage: '+1 point',
  });
});
