'use strict';
// =====================================================================
//  Lignée — écran d'accueil « L'Arbre aux Lanternes » (équipe visuels)
//  Un grand arbre mort (img/accueil.svg, généré par outils/arbre.py) porte une
//  lanterne par ancêtre ; celle de la vie en cours brille au sommet.
//  Lit et nomme G.lignee (js/lignee.js) ; ne touche à rien d'autre du jeu.
// =====================================================================

const ORDINAUX = ['première', 'deuxième', 'troisième', 'quatrième', 'cinquième', 'sixième', 'septième', 'huitième',
  'neuvième', 'dixième', 'onzième', 'douzième', 'treizième', 'quatorzième', 'quinzième', 'seizième',
  'dix-septième', 'dix-huitième', 'dix-neuvième', 'vingtième'];
const ordinal = n => ORDINAUX[n - 1] || `${n}e`;

// Lanternes à accrocher, de la plus ancienne (place 0, branche basse) à la vie en cours (sommet).
// Trop d'ancêtres : les plus anciens se partagent la première lanterne.
function lanternes(lignee, nbPlaces) {
  const ancetres = [...Array(lignee.oublies).fill(null), ...lignee.vies];   // null : ancêtre oublié
  const out = [];
  let liste = ancetres;
  if (ancetres.length > nbPlaces - 1) {
    const nombre = ancetres.length - (nbPlaces - 2);
    out.push({ type: 'groupe', nombre, place: 0 });
    liste = ancetres.slice(nombre);
  }
  for (const a of liste) out.push(a ? { type: 'ancetre', vie: a, place: out.length } : { type: 'oublie', place: out.length });
  out.push({ type: 'courante', prenom: lignee.courante.prenom, place: nbPlaces - 1 });
  return out;
}

function texteAncetre(v) {
  return {
    nom: v.prenom,
    vie: v.fin === 'mort' ? `a vécu ${v.age} ans` : `a transmis l'héritage à ${v.age} ans`,
    detail: `${v.metier} niv. ${v.niveau}` + (v.trait ? ` · « ${v.trait} »` : '') + (v.alliance ? ` · alliance : ${v.alliance}` : ''),
  };
}

// ------------------------------------------------------------ Navigateur
// L'arbre de la lignée (img/accueil.svg) et ses lanternes, avec une bulle au survol.
// Partagé par l'écran d'accueil et l'onglet Héritage.
const Arbre = {
  texte: null,
  async source() {
    if (!this.texte) {
      const res = await fetch(new URL('../img/accueil.svg', ACCUEIL_SRC));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      this.texte = await res.text();
    }
    return this.texte;
  },
  // eteinte : la lanterne de la vie en cours n'est pas encore allumée (première fondation)
  async dessiner(conteneur, { eteinte = false } = {}) {
    conteneur.insertAdjacentHTML('afterbegin', await this.source());   // contenu de confiance : notre propre fichier
    const svg = conteneur.querySelector('.arbre-lignee');
    const g = svg.querySelector('#lanternes');
    const places = g.dataset.places.split(';').map(p => p.split(',').map(Number));
    let courante = null;
    for (const item of lanternes(G.lignee, places.length)) {
      const [x, y] = places[item.place];
      const L = item.type === 'courante' ? 34 : 30 + (item.place % 3) * 14, ly = y + L;
      const type = item.type === 'courante' && eteinte ? 'eteinte' : item.type;
      const nom = item.type === 'ancetre' ? texteAncetre(item.vie) : item.type === 'courante' ? { nom: item.prenom, vie: 'la vie en cours', detail: '' }
        : item.type === 'groupe' ? { nom: `${item.nombre} ancêtres`, vie: 'des générations plus anciennes', detail: '' }
        : { nom: 'Un ancêtre', vie: 'dont le nom s\'est perdu', detail: '' };
      const halo = type === 'eteinte' ? '' : `<circle class="halo" cx="${x}" cy="${ly + 17}" r="${type === 'courante' ? 48 : 26}"/>`;
      const flamme = type === 'eteinte' ? '' : `<circle class="flamme" cx="${x}" cy="${ly + 18}" r="${type === 'courante' ? 6 : 4}"/>`;
      g.insertAdjacentHTML('beforeend',   // nombres uniquement ; les noms passent par textContent
        `<g class="lanterne-arbre lant-${type}" tabindex="0" role="img" style="transform-origin:${x}px ${y}px;animation-delay:${(-item.place * 0.37).toFixed(2)}s">`
        + `<title></title><path class="fil" d="M${x} ${y} V${ly}"/>${halo}`
        + `<path class="corps" d="M${x - 12} ${ly + 3} H${x + 12} L${x + 15} ${ly + 9} V${ly + 27} L${x + 9} ${ly + 34} H${x - 9} L${x - 15} ${ly + 27} V${ly + 9} Z"/>`
        + `<path class="corps" d="M${x - 6} ${ly} H${x + 6} V${ly + 3} H${x - 6} Z"/>${flamme}</g>`);
      const lant = g.lastElementChild;
      lant.querySelector('title').textContent = [nom.nom, nom.vie, nom.detail].filter(Boolean).join(' · ');
      const montre = () => this.montrer(lant, nom);
      lant.addEventListener('mouseenter', montre);
      lant.addEventListener('focus', montre);
      lant.addEventListener('mouseleave', () => this.cacher());
      lant.addEventListener('blur', () => this.cacher());
      if (item.type === 'courante') courante = lant;
    }
    this.fleurir(g, places);
    return { svg, courante };
  },

  // Floraison : des grappes de fleurs sur les branches des lanternes, aux couleurs des voies fleuries.
  // Un quart des branches par voie ; l'arbre couronné en porte davantage. Positions fixes (pas de hasard).
  fleurir(g, places) {
    const F = typeof G !== 'undefined' && G && G.floraison;
    const voies = F ? Object.keys(SOMMETS).filter(v => F.fleuries[v]) : [];
    if (!voies.length) return;
    const petales = [[0, -4.5], [4.3, -1.4], [2.6, 3.6], [-2.6, 3.6], [-4.3, -1.4]];
    let html = '';
    places.forEach(([x, y], i) => {
      if (i % 4 >= voies.length) return;
      const coul = JOB_CATS[voies[i % voies.length]].color;
      for (let k = 0; k < (F.fin ? 5 : 3); k++) {
        const fx = x + ((i * 37 + k * 53) % 47) - 23, fy = y - 4 - ((i * 23 + k * 31) % 21);
        html += `<g class="fleur-arbre" style="fill:${coul};transform-origin:${fx}px ${fy}px;animation-delay:${(-(i + k) * 0.7).toFixed(1)}s">`
          + petales.map(([dx, dy]) => `<circle cx="${fx + dx}" cy="${fy + dy}" r="3.6"/>`).join('')
          + `<circle class="coeur" cx="${fx}" cy="${fy}" r="2.2"/></g>`;
      }
    });
    g.insertAdjacentHTML('beforebegin', `<g class="fleurs-arbre" aria-hidden="true">${html}</g>`);   // nombres et couleurs de data.js uniquement
  },
  bulle() {
    if (!this._bulle) { this._bulle = el('div', 'arbre-bulle cadre-noble hidden'); document.body.append(this._bulle); }
    return this._bulle;
  },
  montrer(lant, t) {
    const b = this.bulle();
    b.replaceChildren(el('b', null, t.nom), ' · ' + t.vie);
    if (t.detail) b.append(el('br'), el('span', 'muted', t.detail));
    b.classList.remove('hidden');
    const r = lant.getBoundingClientRect(), w = b.offsetWidth;
    b.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right + 10)) + 'px';
    b.style.top = Math.max(8, r.top + r.height / 2 - b.offsetHeight / 2) + 'px';
  },
  cacher() { if (this._bulle) this._bulle.classList.add('hidden'); },
};

const Accueil = {
  ouvert: false,
  sortie: false,
  // une partie existait-elle avant ce lancement ? (lu avant que le jeu ne sauvegarde)
  dejaJoue: typeof localStorage !== 'undefined' && typeof SAVE_KEY !== 'undefined' && (() => {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  })(),
  reduit: () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,

  ouvrir() {
    const box = $('accueil'), l = G.lignee;
    if (!box || !l) return;
    const gen = l.oublies + l.vies.length + 1;
    const titre = el('div', 'accueil-titre');
    titre.append(el('h1', null, 'Lignée'));
    if (!this.dejaJoue) {
      titre.append(el('p', null, 'Une vie ne suffit pas. Une lignée, peut-être.'));
      this.champ = Object.assign(el('input'), { type: 'text', maxLength: 24, placeholder: 'Nom de votre maison', autocomplete: 'off' });
      this.champ.setAttribute('aria-label', 'Nom de votre maison');
      const btn = el('button', 'btn btn-noble', 'Fonder la lignée');
      btn.addEventListener('click', () => this.fonder());
      titre.append(this.champ, btn);
    } else {
      titre.append(el('p', null, `${l.maison ? 'Maison ' + l.maison + ' · ' : ''}${ordinal(gen)} génération`));
      if (!l.maison) {
        this.champ = Object.assign(el('input'), { type: 'text', maxLength: 24, placeholder: 'Nom de votre maison', autocomplete: 'off' });
        this.champ.setAttribute('aria-label', 'Nom de votre maison');
        titre.append(this.champ);
      }
      const btn = el('button', 'btn btn-noble', `Continuer avec ${l.courante.prenom}`);
      btn.addEventListener('click', () => this.continuer());
      const lien = el('button', 'accueil-lien', 'Fonder une nouvelle lignée');
      lien.addEventListener('click', () => {
        UI.confirm('Fonder une nouvelle lignée ?',
          'Toute la lignée actuelle, ses talents et ses hauts faits seront perdus. Action irréversible.', () => hardReset());
        $('modal').classList.add('au-dessus');   // cette confirmation-là passe devant l'accueil
      });
      titre.append(btn, lien);
      this.bouton = btn;
    }
    this.message = el('p', 'accueil-message');
    titre.append(this.message);
    box.append(el('div', 'accueil-voile'), titre);

    box.classList.remove('hidden');
    document.body.classList.add('accueil-ouvert');
    this.ouvert = true;
    (this.champ && !this.dejaJoue ? this.champ : this.bouton || this.champ).focus();
    // tant que l'accueil est ouvert, les raccourcis du jeu (Espace, 1–9) sont neutralisés ; Entrée valide
    // (Espace / Entrée sur un bouton gardent leur effet normal : on bloque seulement le raccourci du jeu)
    document.addEventListener('keydown', e => {
      if (!this.ouvert || document.querySelector('#modal:not(.hidden)')) return;
      if (e.key === 'Enter' && (e.target.tagName === 'INPUT' || e.target === document.body)) {
        e.preventDefault(); this.dejaJoue ? this.continuer() : this.fonder();
      }
      if (e.target.tagName !== 'INPUT') e.stopImmediatePropagation();
    }, true);
    this.chargerArbre(box);
  },

  async chargerArbre(box) {
    let r;
    try {
      r = await Arbre.dessiner(box, { eteinte: !this.dejaJoue });   // première fondation : la lanterne s'allume quand on fonde
    } catch (err) {
      console.warn('[accueil] arbre indisponible :', err.message);   // l'accueil reste utilisable, sur fond sombre
      return;
    }
    this.svg = r.svg;
    this.lanterneCourante = r.courante;
    // écran en portrait : cadrage sur la couronne, en haut (sinon les lanternes des côtés sortent du cadre)
    const cadrer = () => {
      const portrait = innerWidth < innerHeight * .9;
      this.svg.setAttribute('viewBox', portrait ? '330 0 980 860' : '0 0 1600 900');
      this.svg.setAttribute('preserveAspectRatio', portrait ? 'xMidYMin meet' : 'xMidYMid slice');
    };
    cadrer();
    addEventListener('resize', cadrer);
  },

  fonder() {
    if (this.sortie) return;
    const n = Lignee.nommer(this.champ.value);
    if (!n) {
      this.message.textContent = 'Donnez un nom à votre maison.';
      this.champ.focus();
      return;
    }
    this.message.textContent = '';
    const lant = this.lanterneCourante;
    if (lant) {   // la première lanterne s'allume
      lant.classList.replace('lant-eteinte', 'lant-courante');
      lant.classList.add('allumage');
      const corps = lant.querySelector('.corps'), b = corps.getBBox();
      const x = b.x + b.width / 2, y = b.y + b.height / 2 + 2;
      lant.insertAdjacentHTML('beforeend', `<circle class="halo" cx="${x}" cy="${y}" r="48"/><circle class="flamme" cx="${x}" cy="${y}" r="6"/>`);
    }
    setTimeout(() => this.entrer(), this.reduit() || !lant ? 0 : 1100);
  },

  continuer() {
    if (this.sortie) return;
    if (this.champ && this.champ.value.trim()) Lignee.nommer(this.champ.value);
    this.entrer();
  },

  // la caméra plonge vers la lanterne de la vie en cours, puis le jeu apparaît
  entrer() {
    if (this.sortie) return;
    this.sortie = true;
    const box = $('accueil');
    const fin = () => {
      box.classList.add('hidden');
      Arbre.cacher();
      document.body.classList.remove('accueil-ouvert');
      this.ouvert = false;
      UI.update();
    };
    if (this.reduit() || !this.svg || !this.lanterneCourante) return fin();
    const r = this.lanterneCourante.getBoundingClientRect();
    this.svg.style.transformOrigin = `${r.left + r.width / 2}px ${r.top + r.height / 2}px`;
    box.classList.add('entree');
    setTimeout(fin, 1300);
  },
};
// chemin de ce script, capturé au chargement (document.currentScript vaut null dans une fonction asynchrone)
const ACCUEIL_SRC = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : '';

if (typeof HOOKS !== 'undefined') HOOKS.init.push(() => Accueil.ouvrir());

if (typeof module !== 'undefined') module.exports = { ordinal, lanternes, texteAncetre };
