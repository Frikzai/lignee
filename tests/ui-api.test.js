'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { creerRegistre } = require('../js/ui.js');

test('avant demarrer, rien n\'est rendu', () => {
  const rendus = []; const r = creerRegistre(d => rendus.push(d.id));
  r.ajouter({ id: 'a' });
  assert.deepEqual(rendus, []);
});
test('demarrer rend tout ce qui a été déclaré', () => {
  const rendus = []; const r = creerRegistre(d => rendus.push(d.id));
  r.ajouter({ id: 'a' }); r.ajouter({ id: 'b' }); r.demarrer();
  assert.deepEqual(rendus, ['a', 'b']);
});
test('après demarrer, une déclaration est rendue tout de suite', () => {
  const rendus = []; const r = creerRegistre(d => rendus.push(d.id));
  r.demarrer(); r.ajouter({ id: 'c' });
  assert.deepEqual(rendus, ['c']);
});
test('un id déjà déclaré remplace l\'ancien', () => {
  const r = creerRegistre(() => {});
  r.ajouter({ id: 'a', v: 1 }); r.ajouter({ id: 'a', v: 2 });
  assert.equal(r.liste().length, 1);
  assert.equal(r.liste()[0].v, 2);
});
test('une déclaration sans id est refusée', () => {
  const r = creerRegistre(() => {});
  assert.throws(() => r.ajouter({}), /id/);
});
