'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ICONES_METIERS, ICONES_COMPETENCES, ICONES_CATEGORIES, iconeStat } = require('../js/emblemes.js');

const sprite = fs.readFileSync(path.join(__dirname, '..', 'img', 'icones.svg'), 'utf8');
const data = vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8')
  + '\n;({ metiers: JOBS.map(j => j.id), competences: SKILLS.map(s => s.id), categories: [...Object.keys(JOB_CATS), ...Object.keys(SKILL_CATS)], stats: Object.keys(STAT_LABELS) })');
const manquants = (ids, table) => [...ids].filter(id => !table[id] || !sprite.includes(`id="i-${table[id]}"`));

test('chaque métier de data.js a son icône dans le sprite', () => assert.deepEqual(manquants(data.metiers, ICONES_METIERS), []));
test('chaque compétence de data.js a son icône dans le sprite', () => assert.deepEqual(manquants(data.competences, ICONES_COMPETENCES), []));
test('chaque catégorie de métiers et de compétences a son emblème', () => assert.deepEqual(manquants(data.categories, ICONES_CATEGORIES), []));
test('chaque statistique de bonus temporaire a son icône', () => assert.deepEqual([...data.stats].filter(st => !sprite.includes(`id="i-${iconeStat(st)}"`)), []));
