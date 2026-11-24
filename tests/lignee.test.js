'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { PRENOMS, choisirPrenom, resumeVie, creerLignee, enregistrerVie, nomComplet, nettoyerMaison } = require('../js/lignee.js');

const METIERS = [{ id: 'glaneur', name: 'Glaneur' }, { id: 'bucheron', name: 'Bûcheron' }, { id: 'recrue', name: 'Recrue' }];

test('choisirPrenom : toujours un prénom de la liste', () => {
  for (let i = 0; i < 50; i++) assert.ok(PRENOMS.includes(choisirPrenom(null)));
});

test('choisirPrenom : jamais deux fois de suite le même', () => {
  let precedent = null;
  for (let i = 0; i < 300; i++) {
    const p = choisirPrenom(precedent);
    assert.notEqual(p, precedent);
    precedent = p;
  }
  // même si le tirage tombe pile sur le précédent
  assert.notEqual(choisirPrenom(PRENOMS[0], () => 0), PRENOMS[0]);
});

test('resumeVie : retient le métier le plus haut, à égalité le plus avancé', () => {
  const r = resumeVie({ age: 61.8, jobs: { glaneur: { level: 12 }, bucheron: { level: 12 }, recrue: { level: 3 } }, trait: 'Robuste', mort: true }, METIERS);
  assert.deepEqual(r, { age: 61, metier: 'Bûcheron', niveau: 12, trait: 'Robuste', fin: 'mort' });
});

test('resumeVie : vie transmise avant la mort, sans trait', () => {
  const r = resumeVie({ age: 30, jobs: { glaneur: { level: 0 } }, trait: null, mort: false }, METIERS);
  assert.deepEqual(r, { age: 30, metier: 'Glaneur', niveau: 0, trait: null, fin: 'transmission' });
});

test('creerLignee : une vieille sauvegarde garde le compte de ses ancêtres sans nom', () => {
  assert.deepEqual(creerLignee(3, 'Ida'), { maison: null, oublies: 3, vies: [], courante: { prenom: 'Ida' } });
});

test('enregistrerVie : l\'ancêtre rejoint la lignée et une nouvelle génération commence', () => {
  const l = creerLignee(0, 'Ida');
  enregistrerVie(l, { age: 52, metier: 'Bûcheron', niveau: 20, trait: null, fin: 'mort' }, 'Bran');
  assert.deepEqual(l.vies, [{ prenom: 'Ida', age: 52, metier: 'Bûcheron', niveau: 20, trait: null, fin: 'mort' }]);
  assert.equal(l.courante.prenom, 'Bran');
});

test('nomComplet : prénom seul tant que la maison n\'a pas de nom', () => {
  const l = creerLignee(0, 'Aldric');
  assert.equal(nomComplet(l), 'Aldric');
  l.maison = 'Corvin';
  assert.equal(nomComplet(l), 'Aldric Corvin');
});

test('nettoyerMaison : espaces retirés, majuscule, 24 caractères, vide refusé', () => {
  assert.equal(nettoyerMaison('  corvin  '), 'Corvin');
  assert.equal(nettoyerMaison('de   la   Tour'), 'De la Tour');
  assert.equal(nettoyerMaison('x'.repeat(40)).length, 24);
  assert.equal(nettoyerMaison('   '), null);
  assert.equal(nettoyerMaison('<b>Corvin</b>'), 'BCorvin/b');   // pas de balise possible dans un nom
});
