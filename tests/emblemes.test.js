'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ICONES_METIERS, ICONES_COMPETENCES, ICONES_CATEGORIES, ICONES_OBJETS, ICONES_DEFIS, ICONES_HAUTS_FAITS, iconeStat, iconeJournal } = require('../js/emblemes.js');

const sprite = fs.readFileSync(path.join(__dirname, '..', 'img', 'icones.svg'), 'utf8');
const data = vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8')
  + '\n;({ metiers: JOBS.map(j => j.id), competences: SKILLS.map(s => s.id), categories: [...Object.keys(JOB_CATS), ...Object.keys(SKILL_CATS)], stats: Object.keys(STAT_LABELS), objets: ITEMS.map(i => i.id), logis: HOUSING.map(h => h.id), defis: CHALLENGES.map(c => c.id) })');
const manquants = (ids, table) => [...ids].filter(id => !table[id] || !sprite.includes(`id="i-${table[id]}"`));

test('chaque métier de data.js a son icône dans le sprite', () => assert.deepEqual(manquants(data.metiers, ICONES_METIERS), []));
test('chaque compétence de data.js a son icône dans le sprite', () => assert.deepEqual(manquants(data.competences, ICONES_COMPETENCES), []));
test('chaque catégorie de métiers et de compétences a son emblème', () => assert.deepEqual(manquants(data.categories, ICONES_CATEGORIES), []));
test('chaque statistique de bonus temporaire a son icône', () => assert.deepEqual([...data.stats].filter(st => !sprite.includes(`id="i-${iconeStat(st)}"`)), []));
test('chaque possession de la boutique a son icône', () => assert.deepEqual(manquants(data.objets, ICONES_OBJETS), []));
test('chaque logis a sa silhouette dans img/logis.svg', () => {
  const logis = fs.readFileSync(path.join(__dirname, '..', 'img', 'logis.svg'), 'utf8');
  assert.deepEqual([...data.logis].filter(id => !logis.includes(`id="l-${id}"`)), []);
});
test('chaque défi a son emblème', () => assert.deepEqual(manquants(data.defis, ICONES_DEFIS), []));

// les hauts faits vivent dans game.js et sante.js (ACHIEVEMENTS.push) : on lit leurs identifiants dans le source
test('chaque haut fait (jeu et module santé) a sa médaille', () => {
  const ids = [];
  for (const [f, debut] of [['game.js', 'const ACHIEVEMENTS = ['], ['sante.js', 'ACHIEVEMENTS.push(']]) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
    const i = src.indexOf(debut);
    const bloc = src.slice(i, Math.min(...['\n];', '\n);'].map(f => src.indexOf(f, i)).filter(x => x > 0)));
    for (const m of bloc.matchAll(/\{ id: '([A-Za-z0-9_]+)'/g)) ids.push(m[1]);
  }
  assert.ok(ids.length >= 30, `seulement ${ids.length} hauts faits trouvés`);
  assert.deepEqual(manquants(ids, ICONES_HAUTS_FAITS), []);
});

test('chaque type d\'entrée du journal a son icône', () => {
  for (const type of ['good', 'bad', 'event', 'gold', '', undefined]) assert.ok(sprite.includes(`id="i-${iconeJournal(type)}"`), String(type));
});
