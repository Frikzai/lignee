'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { romain, EMBLEMES_TALENTS } = require('../js/heritage.js');

test('romain : numéros de génération', () => {
  assert.equal(romain(1), 'I');
  assert.equal(romain(4), 'IV');
  assert.equal(romain(9), 'IX');
  assert.equal(romain(14), 'XIV');
  assert.equal(romain(40), 'XL');
  assert.equal(romain(99), 'XCIX');
  assert.equal(romain(2026), 'MMXXVI');
});

test('chaque talent de data.js a un emblème présent dans le sprite', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8');
  const talents = vm.runInNewContext(src + '\n;PERKS.map(p => p.id)');
  const sprite = fs.readFileSync(path.join(__dirname, '..', 'img', 'icones.svg'), 'utf8');
  const manquants = [...talents].filter(id => !EMBLEMES_TALENTS[id] || !sprite.includes(`id="i-${EMBLEMES_TALENTS[id]}"`));
  assert.deepEqual(manquants, []);
});
