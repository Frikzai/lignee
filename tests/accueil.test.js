'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ordinal, lanternes, texteAncetre } = require('../js/accueil.js');

const vie = (prenom, age = 50) => ({ prenom, age, metier: 'Artisan', niveau: 10, trait: null, fin: 'mort' });

test('ordinal : en lettres jusqu\'à vingt, en chiffres ensuite', () => {
  assert.equal(ordinal(1), 'première');
  assert.equal(ordinal(2), 'deuxième');
  assert.equal(ordinal(8), 'huitième');
  assert.equal(ordinal(20), 'vingtième');
  assert.equal(ordinal(21), '21e');
});

test('lanternes : sans ancêtre, seule la vie en cours, au sommet', () => {
  assert.deepEqual(lanternes({ oublies: 0, vies: [], courante: { prenom: 'Ida' } }, 20),
    [{ type: 'courante', prenom: 'Ida', place: 19 }]);
});

test('lanternes : oubliés, puis ancêtres du plus ancien au plus récent, puis la vie en cours', () => {
  const a = vie('Bran'), b = vie('Odile');
  assert.deepEqual(lanternes({ oublies: 2, vies: [a, b], courante: { prenom: 'Aldric' } }, 20), [
    { type: 'oublie', place: 0 }, { type: 'oublie', place: 1 },
    { type: 'ancetre', vie: a, place: 2 }, { type: 'ancetre', vie: b, place: 3 },
    { type: 'courante', prenom: 'Aldric', place: 19 },
  ]);
});

test('lanternes : trop d\'ancêtres → les plus anciens regroupés dans la première lanterne', () => {
  const vies = Array.from({ length: 30 }, (_, i) => vie('P' + i));
  const l = lanternes({ oublies: 0, vies, courante: { prenom: 'Z' } }, 20);
  assert.equal(l.length, 20);
  assert.deepEqual(l[0], { type: 'groupe', nombre: 12, place: 0 });
  assert.equal(l[1].vie.prenom, 'P12');
  assert.equal(l[18].vie.prenom, 'P29');
  assert.deepEqual(l[19], { type: 'courante', prenom: 'Z', place: 19 });
});

test('texteAncetre : mort ou transmission, trait facultatif', () => {
  assert.deepEqual(texteAncetre({ prenom: 'Odile', age: 58, metier: 'Artisan', niveau: 41, trait: 'Robuste', fin: 'mort' }),
    { nom: 'Odile', vie: 'a vécu 58 ans', detail: 'Artisan niv. 41 · « Robuste »' });
  assert.deepEqual(texteAncetre({ prenom: 'Éloi', age: 40, metier: 'Glaneur', niveau: 15, trait: null, fin: 'transmission' }),
    { nom: 'Éloi', vie: 'a transmis l\'héritage à 40 ans', detail: 'Glaneur niv. 15' });
});
