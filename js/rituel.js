'use strict';
// =====================================================================
//  Lignée — naissance et mort (équipe visuels)
//  Trois moments plein écran qui remplacent les anciennes fenêtres :
//   1. fin      : la lanterne s'éteint (mort) ou se prépare (transmission volontaire) + épitaphe
//   2. passage  : une étincelle allume la lanterne de l'enfant
//   3. naissance: trois cartes de destin (traits de naissance)
//  Agit sur le jeu uniquement par ses fonctions publiques : rebirth(), chooseTrait().
// =====================================================================

// Emblème (icône de img/icones.svg) et phrase d'ambiance de chaque trait de data.js
const DESTINS = {
  robuste:     { embleme: 'bouclier', saveur: 'Le froid, la faim, les années : rien ne l\'entame.' },
  curieux:     { embleme: 'oeil',     saveur: 'Tout l\'intrigue, tout l\'instruit.' },
  travailleur: { embleme: 'marteau',  saveur: 'Debout avant l\'aube, couché après la nuit.' },
  neriche:     { embleme: 'revenu',   saveur: 'Un berceau d\'argent, des dettes d\'honneur.' },
  charmeur:    { embleme: 'masque',   saveur: 'Les marchands baissent leurs prix sans savoir pourquoi.' },
  colosse:     { embleme: 'poing',    saveur: 'Des épaules de bœuf, et la tête qui va avec.' },
  etoile:      { embleme: 'etoile',   saveur: 'La nuit de sa naissance, le ciel brûlait.' },
  joyeux:      { embleme: 'ete',      saveur: 'Un rire qui réchauffe les chaumières.' },
  ambitieux:   { embleme: 'couronne', saveur: 'Jamais assez.' },
  sombre:      { embleme: 'lune',     saveur: 'Les ombres l\'appellent par son nom.' },
  genie:       { embleme: 'eclair',   saveur: 'Un esprit qui brûle trop vite.' },
  pieux:       { embleme: 'age',      saveur: 'Une prière pour chaque pas.' },
};

function epitaphe(resume, mort, points) {
  return {
    titre: mort ? 'Ici s\'éteint' : 'Ici transmet son héritage',
    resume: `${resume.age} ans · ${resume.metier} niv. ${resume.niveau}` + (resume.trait ? ` · « ${resume.trait} »` : ''),
    heritage: `+${points} point${points > 1 ? 's' : ''}`,
  };
}

// ------------------------------------------------------------ Navigateur
const Rituel = {
  phase: null,          // null | 'fin' | 'passage' | 'naissance'
  cle: null,            // traits proposés à l'écran (pour redessiner si le debug les change)
  apresTransmission: false,
  reduit: () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,

  // appelé à chaque UI.update : décide quel moment afficher
  verifier() {
    if (typeof Accueil !== 'undefined' && Accueil.ouvert) return;
    if (G.dead) { if (this.phase !== 'fin') this.fin(true); return; }
    if (G.pendingTraits) {
      if (this.phase === 'passage') return;   // on attend « Découvrir ses destins »
      const cle = G.pendingTraits.join();
      if (this.apresTransmission) { this.apresTransmission = false; return this.passage(); }
      if (this.phase !== 'naissance' || this.cle !== cle) this.naissance();
      return;
    }
    if (this.phase === 'passage' || this.phase === 'naissance') this.fermer();
  },

  ouvrir(phase, classe) {
    const box = $('rituel');
    box.className = 'rituel ' + classe;
    box.replaceChildren();
    this.phase = phase;
    document.body.classList.add('rituel-ouvert');
    return box;
  },
  fermer() {
    $('rituel').className = 'rituel hidden';
    $('rituel').replaceChildren();
    this.phase = null;
    this.cle = null;
    document.body.classList.remove('rituel-ouvert');
  },

  // Décor : la branche, et des lanternes { x, etat: 'vive' | 'mourante' | 'eteinte' | 'faible' }
  decor(lanternes, etincelle) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'rituel-decor');
    svg.setAttribute('viewBox', '0 0 1600 900');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('aria-hidden', 'true');
    let html = '<path class="branche" d="M-40 120 Q300 90 560 150 Q700 182 800 160 Q960 126 1100 150 Q1300 186 1660 110" stroke-width="18"/>'
      + '<path class="branche" d="M560 150 Q520 100 540 60 M1100 150 Q1140 110 1130 70 M300 105 Q280 70 300 40" stroke-width="6"/>';
    for (const l of lanternes) {
      const y = l.y, cy = y + 94;
      html += `<g class="lant lant-${l.etat}"><path class="fil" d="M${l.x} ${y} V${y + 70}"/>`
        + (l.etat === 'vive' ? `<circle class="halo" cx="${l.x}" cy="${cy}" r="56"/>` : '')
        + `<path class="corps" d="M${l.x - 18} ${y + 73} H${l.x + 18} L${l.x + 22} ${y + 81} V${y + 108} L${l.x + 13} ${y + 118} H${l.x - 13} L${l.x - 22} ${y + 108} V${y + 81} Z"/>`
        + `<circle class="fumee" cx="${l.x}" cy="${y + 66}" r="6"/><circle class="fumee" cx="${l.x + 3}" cy="${y + 66}" r="5" style="animation-delay:-1s"/>`
        + `<circle class="flamme" cx="${l.x}" cy="${cy}" r="${l.etat === 'vive' ? 7 : 5}"/></g>`;
    }
    if (etincelle) html += `<path class="trajet" d="${etincelle}"/><circle class="etincelle" r="5" style="offset-path: path('${etincelle}')"/>`;
    svg.innerHTML = html;   // contenu fixe et nombres uniquement (aucun texte venu de la sauvegarde)
    return svg;
  },

  texte(petit, nom, ...lignes) {
    const t = el('div', 'rituel-texte');
    t.append(el('div', 'rituel-petit', petit), el('div', 'rituel-nom', nom));
    for (const l of lignes) t.append(l);
    return t;
  },

  // 1. Fin d'une vie. mort = false : transmission volontaire (le joueur peut renoncer)
  fin(mort) {
    const box = this.ouvrir('fin', 'phase-fin');
    const t = currentTrait();
    const resume = resumeVie({ age: ageYears(), jobs: G.jobs, trait: t && t.name, mort }, JOBS);
    const e = epitaphe(resume, mort, legacyPointsPreview());
    const ligne1 = el('div', 'rituel-resume', e.resume);
    const ligne2 = el('div', 'rituel-resume');
    ligne2.append('Héritage transmis : ', el('span', 'gold', e.heritage), ' · ses niveaux deviennent des bonus pour toujours');
    const actions = el('div', 'rituel-actions');
    const ok = el('button', 'btn btn-noble', mort ? 'Allumer la lanterne suivante' : 'Transmettre l\'héritage');
    ok.addEventListener('click', () => {
      this.fermer();
      rebirth();
      UI.setTab('legacy');
    });
    actions.append(ok);
    if (!mort) {
      const non = el('button', 'btn ghost', 'Pas encore');
      non.addEventListener('click', () => { this.fermer(); UI.update(); });
      actions.append(non);
    }
    box.append(this.decor([{ x: 800, y: 90, etat: mort ? 'mourante' : 'vive' }]),
      this.texte(e.titre, nomComplet(G.lignee), ligne1, ligne2, actions));
    ok.focus();
  },

  // 2. La flamme passe à l'enfant
  passage() {
    const box = this.ouvrir('passage', 'phase-passage');
    const l = G.lignee, gen = l.oublies + l.vies.length + 1;
    const ligne = el('div', 'rituel-resume', `${l.maison ? 'Maison ' + l.maison + ' · ' : ''}${ordinal(gen)} génération`);
    const actions = el('div', 'rituel-actions');
    const ok = el('button', 'btn btn-noble', 'Découvrir ses destins');
    ok.addEventListener('click', () => this.naissance());
    actions.append(ok);
    box.append(this.decor([{ x: 650, y: 78, etat: 'faible' }, { x: 950, y: 50, etat: 'vive' }], 'M650 172 Q800 40 950 144'),
      this.texte('La flamme passe', `${nomComplet(l)} voit le jour`, ligne, actions));
    ok.focus();
  },

  // 3. Trois destins
  naissance() {
    if (!G.pendingTraits) return this.fermer();
    const box = this.ouvrir('naissance', 'phase-naissance');
    this.cle = G.pendingTraits.join();
    const cartes = el('div', 'rituel-cartes');
    G.pendingTraits.forEach((id, i) => {
      const tr = TRAIT_BY_ID[id], d = DESTINS[id] || { embleme: 'etoile', saveur: '' };
      const c = el('button', 'carte-destin cadre-noble');
      c.style.animationDelay = (i * 0.18) + 's';
      const emb = el('div', 'carte-embleme');
      emb.append(icone(d.embleme));
      c.append(emb, el('h4', null, tr.name), el('div', 'carte-effet', tr.desc), el('div', 'carte-saveur', d.saveur ? `« ${d.saveur} »` : ''));
      c.addEventListener('click', () => this.choisir(id, c, cartes));
      cartes.append(c);
    });
    box.append(this.texte(`Naissance de ${nomComplet(G.lignee)}`, 'Trois destins s\'offrent à cette vie'), cartes);
    cartes.firstChild.focus();
  },

  choisir(id, carte, cartes) {
    if (cartes.classList.contains('choix-fait')) return;
    cartes.classList.add('choix-fait');
    carte.classList.add('choisie');
    setTimeout(() => {
      chooseTrait(id);
      this.fermer();
      UI.update();
    }, this.reduit() ? 0 : 900);
  },
};

if (typeof HOOKS !== 'undefined') {
  HOOKS.newLife.push(() => { Rituel.apresTransmission = true; });
  // pendant un rituel, les raccourcis du jeu (Espace, 1–9) sont neutralisés
  document.addEventListener('keydown', e => {
    if (Rituel.phase && e.target.tagName !== 'INPUT') e.stopImmediatePropagation();
  }, true);
}

if (typeof module !== 'undefined') module.exports = { DESTINS, epitaphe };
