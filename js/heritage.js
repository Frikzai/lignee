'use strict';
// =====================================================================
//  Lignée — onglet Héritage : l'arbre de la lignée (équipe visuels)
//  En-tête de la maison, arbre et lanternes (partagés avec l'accueil),
//  chronique des ancêtres. Les talents sont construits par js/ui.js.
// =====================================================================

// Emblème (icône de img/icones.svg) de chaque talent de data.js
const EMBLEMES_TALENTS = {
  intendant: 'cle', precepteur: 'livre', majordome: 'cloche',
  memoire: 'lignee', vigueur: 'sante', prodige: 'eclair', heritier: 'couronne', mecene: 'revenu',
  fortune: 'ecus', destin: 'fuseau', sablier: 'sablier', horstemps: 'lune',
};

function romain(n) {
  const T = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, l] of T) while (n >= v) { s += l; n -= v; }
  return s;
}

// ------------------------------------------------------------ Navigateur
const Heritage = {
  cleArbre: null,
  cleChronique: null,

  // appelé par UI.updateLegacy (seulement quand l'onglet est ouvert)
  maj() {
    const l = G.lignee;
    if (!l) return;
    const gen = l.oublies + l.vies.length + 1;
    const ord = ordinal(gen);
    const titre = l.maison ? 'Maison ' + l.maison : 'Maison sans nom';
    if ($('maisonNom').textContent !== titre) $('maisonNom').textContent = titre;
    const sous = `${ord[0].toUpperCase() + ord.slice(1)} génération · ${l.courante.prenom}, ${Math.floor(ageYears())} ans`;
    if ($('maisonGen').textContent !== sous) $('maisonGen').textContent = sous;
    $('lpVies').textContent = G.legacy.rebirths;
    this.majArbre(l);
    this.majChronique(l, gen);
  },

  majArbre(l) {
    const cle = `${l.oublies}|${l.vies.length}|${l.courante.prenom}`;
    if (cle === this.cleArbre) return;
    this.cleArbre = cle;
    const box = $('arbreLignee');
    box.replaceChildren();
    Arbre.dessiner(box).then(({ svg }) => {
      svg.setAttribute('viewBox', '380 20 940 700');   // la couronne seule
      svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
    }).catch(err => {
      this.cleArbre = null;
      console.warn('[héritage] arbre indisponible :', err.message);
    });
  },

  // de la génération en cours (en haut) aux plus anciennes
  majChronique(l, gen) {
    const cle = `${gen}|${l.courante.prenom}`;
    if (cle === this.cleChronique) return;
    this.cleChronique = cle;
    const ol = $('chronique');
    ol.replaceChildren();
    const ligne = (num, nom, vie, detail, cls) => {
      const li = el('li', cls || null);
      li.append(el('span', 'c-gen', num), el('b', null, nom), el('span', null, vie));
      if (detail) li.append(el('span', 'c-detail', detail));
      ol.append(li);
    };
    ligne(romain(gen), l.courante.prenom, 'la vie en cours', '', 'c-courante');
    for (let i = l.vies.length - 1; i >= 0; i--) {
      const t = texteAncetre(l.vies[i]);
      ligne(romain(l.oublies + i + 1), t.nom, t.vie, t.detail);
    }
    if (l.oublies) ligne(l.oublies > 1 ? `I–${romain(l.oublies)}` : 'I', `${l.oublies} ancêtre${l.oublies > 1 ? 's' : ''}`, 'dont le nom s\'est perdu', '', 'c-oublies');
  },
};

if (typeof module !== 'undefined') module.exports = { romain, EMBLEMES_TALENTS };
