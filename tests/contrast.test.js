'use strict';
// Vérifie que la palette de css/style.css reste lisible (WCAG AA : contraste ≥ 4,5:1).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
const root = css.match(/:root\s*\{([^}]*)\}/)[1];
const vars = Object.fromEntries([...root.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-f]{6})\s*;/gi)].map(m => [m[1], m[2]]));

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('la palette définit --ember', () => assert.match(vars['--ember'] ?? '', /^#[0-9a-f]{6}$/i));

for (const fg of ['--text', '--muted', '--accent'])
  for (const bg of ['--bg', '--panel', '--panel2'])
    test(`${fg} sur ${bg} ≥ 4.5`, () => {
      const r = ratio(vars[fg], vars[bg]);
      assert.ok(r >= 4.5, `${fg} ${vars[fg]} sur ${bg} ${vars[bg]} : ${r.toFixed(2)}`);
    });

// --ember n'est jamais posé en texte sur --panel2 (voir le plan DA)
for (const bg of ['--bg', '--panel'])
  test(`--ember sur ${bg} ≥ 4.5`, () => {
    const r = ratio(vars['--ember'] ?? '#000000', vars[bg]);
    assert.ok(r >= 4.5, `--ember sur ${bg} : ${r.toFixed(2)}`);
  });
