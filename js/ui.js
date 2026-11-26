'use strict';
// =====================================================================
//  Lignée — interface
// =====================================================================

const $ = id => document.getElementById(id);
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
// Icône du sprite img/icones.svg (style gravé au trait, couleur = currentColor).
const ICONES = 'img/icones.svg';
const LOGIS = 'img/logis.svg';
function icone(nom, cls = '') {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', cls ? 'icone ' + cls : 'icone');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `${ICONES}#i-${nom}`);
  svg.appendChild(use);
  return svg;
}

// Registre de déclarations des modules : avant demarrer(), on mémorise ; après, on rend tout de suite.
// Un id redéclaré remplace l'ancien (le rendu remplace alors l'élément affiché).
function creerRegistre(rendre) {
  const defs = new Map();
  let demarre = false;
  return {
    ajouter(def) {
      if (!def || !def.id) throw new Error('UI : une déclaration doit avoir un id');
      defs.set(def.id, def);
      if (demarre) rendre(def);
    },
    demarrer() { demarre = true; for (const d of defs.values()) rendre(d); },
    liste: () => [...defs.values()],
  };
}
const valeur = v => (typeof v === 'function' ? v() : v);
// Texte venu d'une sauvegarde (prénoms, nom de maison) inséré dans du HTML.
const echapper = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TONS = { bon: 'var(--good)', moyen: 'var(--accent)', mauvais: 'var(--bad)' };

// Barre de progression : quand un niveau est franchi entre deux rafraîchissements,
// on la remplit jusqu'au bout avant de repartir de zéro (sans animation à l'envers).
function setProgress(bar, level, pct) {
  pct = Math.max(0, Math.min(100, pct));
  const last = bar._lvl;
  bar._lvl = level;
  if (last != null && level > last) {
    bar._hold = true;
    bar.style.transition = 'width .15s ease-out';
    bar.style.width = '100%';
    clearTimeout(bar._t);
    bar._t = setTimeout(() => {
      bar._hold = false;
      bar.style.transition = 'none';
      bar.style.width = '0%';
    }, 180);
    return;
  }
  if (bar._hold) return;
  const cur = parseFloat(bar.style.width) || 0;
  bar.style.transition = pct < cur ? 'none' : 'width .1s linear';
  bar.style.width = pct + '%';
}

function describeEffect(e, level) {
  const label = STAT_LABELS[e.stat] || e.stat;
  if (e.mult != null) return `×${fmtMult(e.mult)} ${label}`;
  const v = 1 + e.per * level;
  if (e.inverse) return `−${((1 - 1 / v) * 100).toFixed(1).replace('.', ',')} % ${label}`;
  return `×${fmtMult(v)} ${label}`;
}

// ------------------------------------------------------------- Tutoriel
// wait : condition qui fait avancer l'étape automatiquement (pas de bouton « Suivant »).
const TUTO = [
  { text: 'Bienvenue ! Vous avez 14 ans. La barre en haut représente votre vie : quand elle est pleine, vous mourez… mais votre lignée continue.',
    target: '.age-box' },
  { text: 'Votre métier rapporte des écus chaque jour et gagne de l\'expérience. Montez le Glaneur au niveau 10 pour devenir Bûcheron.',
    target: '#tab-jobs', wait: () => G.unlocked['job:bucheron'], waitText: 'Objectif : débloquer Bûcheron' },
  { text: 'En parallèle, vous entraînez une compétence. Ouvrez l\'onglet Compétences.',
    target: '[data-tab="skills"]', wait: () => UI.tab === 'skills', waitText: 'Objectif : ouvrir Compétences' },
  { text: 'Cliquez sur une ligne pour choisir quoi apprendre. Discipline accélère toutes les autres compétences : un bon début. Vous pouvez changer à tout moment.',
    target: '#tab-skills' },
  { text: 'Avec vos écus, achetez dans la Boutique : un logement augmente le bonheur, qui multiplie toute votre expérience. Gardez un revenu net positif !',
    target: '[data-tab="shop"]', wait: () => G.housing !== 'etoile' || Object.keys(G.items).length > 0, waitText: 'Objectif : acheter quelque chose' },
  { text: 'De temps en temps, un événement apparaît à gauche. Vous avez une minute pour choisir.',
    target: '.sidebar' },
  { text: 'À votre mort, vos niveaux deviennent des bonus permanents et vous gagnez des points d\'héritage. Ils débloquent des talents… dont l\'automatisation. Bonne vie !',
    target: null },
];

const UI = {
  ready: false,
  tab: 'jobs',
  jobRows: {}, skillRows: {}, catParts: {},
  housingRows: {}, itemRows: {}, perkCards: {}, racineCards: {}, fleurs: {}, achCards: {}, challengeCards: {},
  eventUid: null, logKey: null, modalKind: null, tutoShown: null, focusEls: [],
  vues: new Map(), alertes: {},

  init() {
    this.jobRows = this.buildTables('tab-jobs', JOB_CATS, JOBS, 'job', ['', 'Niveau', 'Revenu / jour', 'Prochain niveau']);
    this.skillRows = this.buildTables('tab-skills', SKILL_CATS, SKILLS, 'skill', ['', 'Niveau', 'Effet', 'Prochain niveau']);
    this.buildShop();
    this.buildPerks();
    this.buildChallenges();
    this.buildAchievements();
    this.bind();
    this.ressources.demarrer();
    this.jauges.demarrer();
    this.marques.demarrer();
    this.ready = true;
    this.update();
  },

  // -------------------------------------------------------- Construction
  buildTables(containerId, cats, list, kind, cols) {
    const root = $(containerId);
    root.innerHTML = '';
    const rows = {};
    for (const catId in cats) {
      const cat = cats[catId];
      const table = el('table', 'grid');
      const hr = el('tr');
      cols.forEach((c, i) => {
        const th = el('th', null, i === 0 ? null : c);
        if (i === 0) { th.style.color = cat.color; th.append(icone(ICONES_CATEGORIES[catId] || 'etoile'), cat.name); }
        hr.appendChild(th);
      });
      const thead = el('thead'); thead.appendChild(hr); table.appendChild(thead);
      const tbody = el('tbody'); table.appendChild(tbody);
      for (const e of list.filter(x => x.cat === catId)) {
        const tr = el('tr', 'row');
        tr.title = e.desc || '';
        const nameTd = el('td', 'name-cell');
        const bar = el('div', 'row-bar'); bar.style.background = bar.style.color = cat.color;
        const badge = el('span', 'legacy-badge');
        badge.title = 'Bonus d\'héritage (meilleur niveau des vies passées)';
        const pastille = el('span', 'pastille');
        pastille.append(icone((kind === 'job' ? ICONES_METIERS : ICONES_COMPETENCES)[e.id] || 'etoile'));
        nameTd.append(bar, pastille, el('span', 'row-name', e.name), badge);
        tr.appendChild(nameTd);
        const cells = [];
        for (let i = 1; i < cols.length; i++) { const td = el('td'); tr.appendChild(td); cells.push(td); }
        tr.addEventListener('click', () => {
          if (kind === 'job') setJob(e.id); else setSkill(e.id);
          this.update();
        });
        tbody.appendChild(tr);
        rows[e.id] = { tr, bar, badge, cells };
      }
      const lock = el('tr', 'lock-row');
      const ltd = el('td'); ltd.colSpan = cols.length; lock.appendChild(ltd);
      tbody.appendChild(lock);
      const wrap = el('div', 'table-wrap cadre'); wrap.appendChild(table);
      root.appendChild(wrap);
      this.catParts[kind + ':' + catId] = { thead, wrap, lockTr: lock, lockTd: ltd, cat };
    }
    return rows;
  },

  // Boutique : le chemin des logis (silhouettes de img/logis.svg) et les possessions en cartes à emblème
  buildShop() {
    const NS = 'http://www.w3.org/2000/svg';
    for (const h of HOUSING) {
      const carte = el('button', 'carte-logis');
      carte.type = 'button';
      const svg = document.createElementNS(NS, 'svg'), use = document.createElementNS(NS, 'use');
      svg.setAttribute('class', 'sil'); svg.setAttribute('viewBox', '0 0 120 64'); svg.setAttribute('aria-hidden', 'true');
      use.setAttribute('href', `${LOGIS}#l-${h.id}`);
      svg.append(use);
      const nom = el('span', 'l-nom'), info = el('span', 'l-info'), marques = el('span', 'l-marques');
      carte.append(el('span', 'l-badge', 'Votre logis'), svg, nom, info, marques);
      carte.addEventListener('click', () => { setHousing(h.id); this.update(); });
      $('housingTable').append(carte);
      this.housingRows[h.id] = { carte, nom, info, marques };
    }
    for (const it of ITEMS) {
      const carte = el('button', 'carte-objet');
      carte.type = 'button';
      const emb = el('span', 'o-emb');
      emb.append(icone(ICONES_OBJETS[it.id] || 'etoile'));
      const corps = el('span', 'o-corps'), tete = el('span', 'o-tete'), marques = el('span', 'o-marques'), prix = el('span', 'o-prix');
      tete.append(el('b', null, it.name), marques);
      corps.append(tete, el('span', 'o-eff', it.effects.map(e => describeEffect(e)).join(', ')), prix);
      carte.append(emb, corps);
      carte.addEventListener('click', () => { toggleItem(it.id); this.update(); });
      $('itemsTable').append(carte);
      this.itemRows[it.id] = { carte, prix, marques };
    }
  },

  // Talents : « serviteurs de la maison » (automatisation) et « vertus de la lignée », emblème et rangs en lanternes.
  // Les racines de la Floraison réutilisent les mêmes cartes, payées en graines.
  buildPerks() {
    this.perkCards = this.buildVertus(PERKS, p => (p.setting ? 'perkGridAuto' : 'perkGrid'), id => buyPerk(id));
    this.racineCards = this.buildVertus(RACINES, () => 'racineGrid', id => buyRacine(id));
    for (const v in SOMMETS) {
      const f = el('span', 'voie-fleur');
      f.append(icone(ICONES_CATEGORIES[v] || 'fleur'), JOB_CATS[v].name);
      const don = TRAITS.find(t => t.voie === v);
      if (don) f.title = `En fleurissant, débloque le destin « ${don.name} » (${don.desc})`;
      $('voiesFleuries').append(f);
      this.fleurs[v] = f;
    }
    $('floraisonBtn').addEventListener('click', () => {
      if (!floraisonPossible()) return;
      const g = grainesPreview(), choix = voiesAFleurir(), nom = v => JOB_CATS[v].name;
      const voie = choix.length > 1 ? ', et <b>une</b> des voies atteintes fleurit pour toujours : choisissez-la. Les autres sommets devront être atteints à nouveau.'
        : choix.length ? `, et la voie <b>${nom(choix[0])}</b> fleurit pour toujours.` : '. Aucune nouvelle voie ne fleurit.';
      const fleurir = v => () => { floraison(v); this.setTab('legacy'); };
      this.openModal('confirm', `<h2>Faire fleurir l'arbre ?</h2><p>La vie en cours s'achève. Vos points d'héritage, vos talents${racineRank('bourgeons') ? ' (sauf les serviteurs)' : ''} et vos meilleurs niveaux repartent de zéro.<br><br>`
        + `Vous gagnez <b>${g} graine${g > 1 ? 's' : ''}</b>${voie}</p>`,
        [{ label: 'Annuler', cls: 'ghost' }, ...(choix.length > 1
          ? choix.map(v => ({ label: 'Fleurir : ' + nom(v), cls: 'danger', run: fleurir(v) }))
          : [{ label: 'Confirmer', cls: 'danger', run: fleurir(choix[0]) }])]);
    });
  },
  buildVertus(list, grille, acheter) {
    const cards = {};
    for (const p of list) {
      const card = el('div', 'perk vertu cadre' + (p.setting ? ' auto' : ''));
      const emb = el('span', 'v-emb');
      emb.append(icone((typeof EMBLEMES_TALENTS !== 'undefined' && EMBLEMES_TALENTS[p.id]) || 'etoile'));
      const rank = el('span', 'rank');
      const head = el('div', 'perk-head'); head.append(emb, el('h4', null, p.name), rank);
      const btn = el('button', 'btn small');
      btn.addEventListener('click', () => { acheter(p.id); this.update(); });
      card.append(head, el('p', 'muted small', p.desc));
      let pips = null;
      if (p.max > 1 && isFinite(p.max)) {
        pips = el('div', 'pips');
        for (let k = 0; k < p.max; k++) pips.append(el('i'));
        card.append(pips);
      }
      card.append(btn);
      $(grille(p)).appendChild(card);
      cards[p.id] = { card, rank, btn, pips };
    }
    return cards;
  },

  // Défis : « les épreuves », un sceau de cire sur celles qu'on a réussies
  buildChallenges() {
    const grid = $('challengeGrid');
    for (const c of CHALLENGES) {
      const card = el('div', 'epreuve cadre');
      const sceau = el('span', 'sceau');
      sceau.title = 'Défi réussi';
      sceau.append(icone('acquis'));
      const emb = el('span', 'e-emb');
      emb.append(icone(ICONES_DEFIS[c.id] || 'etendard'));
      const tete = el('div', 'e-tete');
      tete.append(emb, el('h4', null, c.name));
      const ligne = (nom, texte, cls) => {
        const d = el('div', 'e-ligne' + (cls ? ' ' + cls : ''));
        d.append(icone(nom), el('span', null, texte));
        return d;
      };
      const btn = el('button', 'btn small');
      btn.addEventListener('click', () => this.confirm(`Commencer le défi « ${c.name} » ?`,
        `Votre vie actuelle s'achève (+${legacyPointsPreview()} point(s) d'héritage) et une nouvelle commence.<br><br><b>Règles :</b> ${c.rules}<br><b>Objectif :</b> ${c.goalText}`,
        () => startChallenge(c.id)));
      card.append(sceau, tete, ligne('cadenas', c.rules), ligne('etendard', 'Objectif : ' + c.goalText), ligne('etoile', c.rewardText, 'gold'));
      if (c.requires) card.append(ligne('interdit', `Après « ${CHALLENGE_BY_ID[c.requires].name} »`));
      card.append(btn);
      grid.appendChild(card);
      this.challengeCards[c.id] = { card, btn };
    }
  },

  // Hauts faits : une médaille gravée par haut fait, en empreinte tant qu'il n'est pas obtenu
  buildAchievements() {
    const grid = $('achGrid');
    for (const a of ACHIEVEMENTS) {
      const card = el('div', 'medaille');
      const rond = el('span', 'm-rond');
      rond.append(icone(ICONES_HAUTS_FAITS[a.id] || 'etoile'));
      card.append(rond, el('span', 'm-nom', a.name), el('span', 'm-desc', a.desc));
      grid.appendChild(card);
      this.achCards[a.id] = card;
    }
  },

  bind() {
    document.querySelectorAll('.tabs button').forEach(b =>
      b.addEventListener('click', () => this.setTab(b.dataset.tab)));
    $('pauseBtn').addEventListener('click', () => { G.paused = !G.paused; this.update(); });
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); G.paused = !G.paused; this.update(); }
      const n = parseInt(e.key, 10);
      const tabs = [...document.querySelectorAll('.tabs button:not(.hidden)')];
      if (n >= 1 && n <= tabs.length) this.setTab(tabs[n - 1].dataset.tab);
    });

    const bindCheck = (id, key) => $(id).addEventListener('change', () => { G.settings[key] = $(id).checked; });
    const bindSelect = (id, key) => {
      $(id).value = G.settings[key];
      $(id).addEventListener('change', () => { G.settings[key] = $(id).value; });
    };
    bindCheck('autoPromote', 'autoPromote');
    bindCheck('autoLearn', 'autoLearn');
    bindCheck('autoBuy', 'autoBuy');
    bindCheck('optOffline', 'offline');
    bindSelect('promoteMode', 'promoteMode');
    bindSelect('learnMode', 'learnMode');
    $('buyKeep').value = G.settings.buyKeep;
    $('buyKeep').addEventListener('input', () => { G.settings.buyKeep = +$('buyKeep').value; });

    $('abandonBtn').addEventListener('click', () =>
      this.confirm('Abandonner le défi ?', 'Les règles du défi sont levées, mais vous n\'obtiendrez pas la récompense.', () => abandonChallenge()));
    $('rebirthBtn').addEventListener('click', () => {
      if (ageYears() < 30) return;
      if (typeof Rituel !== 'undefined') return Rituel.fin(false);
      this.confirm('Transmettre l\'héritage maintenant ?',
        `Votre vie actuelle s'achève et vous gagnez <b>${legacyPointsPreview()}</b> point(s) d'héritage.`,
        () => rebirth());
    });

    $('tutoNext').addEventListener('click', () => {
      G.tutorial = G.tutorial + 1 >= TUTO.length ? -1 : G.tutorial + 1;
      this.update();
    });
    $('tutoSkip').addEventListener('click', () => { G.tutorial = -1; this.update(); });
    $('tutoReplay').addEventListener('click', () => { G.tutorial = 0; this.setTab('jobs'); });

    $('saveBtn').addEventListener('click', () => { save(); this.toast('Partie sauvegardée.', 'good'); });
    $('exportBtn').addEventListener('click', () => {
      $('saveText').value = exportSave();
      $('saveText').select();
      try { navigator.clipboard.writeText($('saveText').value); this.toast('Sauvegarde copiée dans le presse-papiers.', 'good'); }
      catch (e) { this.toast('Sauvegarde exportée ci-dessous.', 'good'); }
    });
    $('importBtn').addEventListener('click', () => {
      try { importSave($('saveText').value); location.reload(); }
      catch (e) { this.toast('Sauvegarde invalide.', 'bad'); }
    });
    const nommer = () => {
      const n = Lignee.nommer($('maisonInput').value);
      if (n) { $('maisonInput').value = ''; this.toast(`La maison ${n} est fondée.`, 'gold'); this.update(); }
      else this.toast('Ce nom ne convient pas.', 'bad');
    };
    $('maisonBtn').addEventListener('click', nommer);
    $('maisonInput').addEventListener('keydown', e => { if (e.key === 'Enter') nommer(); });
    $('resetBtn').addEventListener('click', () =>
      this.confirm('Tout effacer ?', 'Votre lignée entière, vos talents et vos hauts faits seront perdus. Action irréversible.', () => hardReset()));
  },

  setTab(tab) {
    this.tab = tab;
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + tab));
    this.update();
  },

  // ---------------------------------------------------------- Mise à jour
  update() {
    if (!this.ready) return;
    this.updateTop();
    this.updateTabs();
    this.updateSidebar();
    this.majModules();
    for (const f of HOOKS.ui) f();
    switch (this.tab) {
      case 'jobs': this.updateJobs(); break;
      case 'skills': this.updateSkills(); break;
      case 'shop': this.updateShop(); break;
      case 'legacy': this.updateLegacy(); break;
      case 'challenges': this.updateChallenges(); break;
      case 'achievements': this.updateAchievements(); break;
      case 'stats': this.updateStats(); break;
      case 'journal': this.updateJournal(); break;
      case 'options': this.updateOptions(); break;
    }
    // naissance et mort : écrans plein écran du rituel (js/rituel.js), sinon les anciennes fenêtres
    if (typeof Rituel !== 'undefined') Rituel.verifier();
    else if (G.dead) { if (this.modalKind !== 'death') this.showDeath(); }
    // la naissance attend que l'écran d'accueil soit refermé
    else if (G.pendingTraits && !this.modalKind && !(typeof Accueil !== 'undefined' && Accueil.ouvert)) this.showTraits();
    // épilogue : une seule fois, quand les quatre voies ont fleuri et que plus rien n'est à l'écran
    if (G.floraison.fin && !G.floraison.epilogue && !this.modalKind && !G.pendingTraits
      && !(typeof Rituel !== 'undefined' && Rituel.phase) && !(typeof Accueil !== 'undefined' && Accueil.ouvert)) this.showEpilogue();
    this.updateTuto();
  },

  // Les onglets apparaissent au fil de la progression
  updateTabs() {
    const visible = {
      legacy: G.legacy.rebirths > 0 || ageYears() >= 30,
      challenges: G.legacy.rebirths >= 2,
      achievements: Object.keys(G.achievements).length > 0,
      stats: G.legacy.rebirths > 0,
    };
    document.querySelectorAll('.tabs button').forEach(b => {
      const v = visible[b.dataset.tab];
      b.classList.toggle('hidden', v === false);
      if (v === false && this.tab === b.dataset.tab) this.setTab('jobs');
    });
  },

  updateTop() {
    const life = lifespanYears();
    if (G.lignee && typeof nomComplet === 'function') {
      const nom = nomComplet(G.lignee);
      if ($('identite').textContent !== nom) $('identite').textContent = nom;
    }
    $('ageText').textContent = fmtAge(G.days);
    $('lifeText').textContent = `${Math.floor(life)} ans`;
    const pct = Math.min(100, ageYears() / life * 100);
    $('ageFill').style.width = pct + '%';
    $('ageFill').classList.toggle('old', pct > 85);
    $('coinsText').textContent = fmt(G.coins);
    const net = netIncome();
    $('netText').textContent = (net >= 0 ? '+' : '') + fmt(net);
    $('netText').className = net >= 0 ? 'pos' : 'neg';
    $('happyText').textContent = '×' + fmtMult(happiness());
    const pb = $('pauseBtn');
    if (pb._enPause !== G.paused) {
      pb._enPause = G.paused;
      pb.replaceChildren(icone(G.paused ? 'reprendre' : 'pause'), G.paused ? 'Reprendre' : 'Pause');
    }
    $('pauseBtn').classList.toggle('paused', G.paused);
    document.body.classList.toggle('is-paused', G.paused);
  },

  updateSidebar() {
    // Portrait : nom, âge, génération, trait de naissance gravé
    if (G.lignee && typeof nomComplet === 'function') {
      const l = G.lignee, gen = l.oublies + l.vies.length + 1;
      const nom = nomComplet(l), sous = `${Math.floor(ageYears())} ans · génération ${typeof romain === 'function' ? romain(gen) : gen}`;
      if ($('portraitNom').textContent !== nom) $('portraitNom').textContent = nom;
      if ($('portraitSous').textContent !== sous) $('portraitSous').textContent = sous;
    }
    const tr = currentTrait(), badge = $('traitLine');
    badge.classList.toggle('hidden', !tr);
    if (tr && badge._id !== tr.id) {
      badge._id = tr.id;
      const d = typeof DESTINS !== 'undefined' && DESTINS[tr.id];
      badge.replaceChildren(icone(d ? d.embleme : 'etoile'), tr.name);
      badge.title = tr.desc;
    }
    const cj = G.conjoint && G.conjoint.trait ? G.conjoint : null, lien = $('conjointLine');
    lien.classList.toggle('hidden', !cj);
    if (cj && lien._cle !== cj.prenom + cj.maison) {
      const t = TRAIT_BY_ID[cj.trait];
      lien._cle = cj.prenom + cj.maison;
      lien.replaceChildren(icone('lignee'), `${cj.prenom} ${cj.maison}`);
      lien.title = `Alliance : ${t.name} (${t.desc}). L'enfant pourra hériter de ce destin.`;
    }

    const j = JOB_BY_ID[G.currentJob], je = G.jobs[j.id];
    this.medaillon($('curJobMed'), ICONES_METIERS[j.id]);
    $('curJobName').textContent = `${j.name} ${je.level}`;
    $('curJobInfo').textContent = `${fmt(jobIncome(j))} écus/j`;
    setProgress($('curJobFill'), je.level, je.xp / maxXp(j.xp, je.level) * 100);
    $('curJobFill').style.background = JOB_CATS[j.cat].color;

    const s = SKILL_BY_ID[G.currentSkill], se = G.skills[s.id];
    this.medaillon($('curSkillMed'), ICONES_COMPETENCES[s.id]);
    $('curSkillName').textContent = `${s.name} ${se.level}`;
    $('curSkillInfo').textContent = s.effects.map(e => describeEffect(e, se.level)).join(', ');
    setProgress($('curSkillFill'), se.level, se.xp / maxXp(s.xp, se.level) * 100);
    $('curSkillFill').style.background = SKILL_CATS[s.cat].color;

    const ch = currentChallenge();
    $('challengeBox').classList.toggle('hidden', !ch);
    if (ch) {
      $('chName').textContent = 'Défi : ' + ch.name;
      $('chGoal').textContent = ch.progress ? ch.progress() : ch.goalText;
    }
    const showCorr = G.corruption > 0 || JOBS.some(x => x.cat === 'ombre' && G.unlocked['job:' + x.id]);
    $('corruptionBox').classList.toggle('hidden', !showCorr);
    if (showCorr) {
      $('corrText').textContent = Math.floor(G.corruption) + ' / 100';
      $('corrFill').style.width = G.corruption + '%';
    }
    const bl = $('buffs'); bl.innerHTML = '';
    for (const b of G.buffs) {
      const li = el('li', 'buff');
      li.append(icone(iconeStat(b.stat)), `${b.name} : ×${fmtMult(b.mult)} ${STAT_LABELS[b.stat]} · ${Math.ceil(b.until - G.days)} j`);
      bl.appendChild(li);
    }

    // Événement
    const card = $('eventCard');
    if (G.event) {
      card.classList.remove('hidden');
      const ev = EVENT_BY_ID[G.event.id], d = G.event.data;
      if (this.eventUid !== G.event.uid) {
        this.eventUid = G.event.uid;
        $('eventTitle').textContent = ev.title;
        $('eventText').textContent = ev.text(d);
        const box = $('eventChoices'); box.innerHTML = '';
        ev.choices.forEach((c, i) => {
          const b = el('button', 'btn choice', c.label(d));
          b.addEventListener('click', () => { chooseEvent(i); this.update(); });
          box.appendChild(b);
        });
      }
      [...$('eventChoices').children].forEach((b, i) => {
        const c = ev.choices[i];
        b.disabled = !!(c.can && !c.can(d));
      });
      $('eventTimer').style.width = Math.max(0, G.event.expires / 60 * 100) + '%';
    } else {
      card.classList.add('hidden');
      this.eventUid = null;
    }

    // Automatisation : visible seulement une fois débloquée par un talent
    const rows = { promoteRow: 'intendant', learnRow: 'precepteur', buyRow: 'majordome' };
    let any = false;
    for (const id in rows) {
      const owned = perkRank(rows[id]) > 0;
      $(id).classList.toggle('hidden', !owned);
      any = any || owned;
    }
    $('autoCard').classList.toggle('hidden', !any);
    $('autoPromote').checked = G.settings.autoPromote;
    $('autoLearn').checked = G.settings.autoLearn;
    $('autoBuy').checked = G.settings.autoBuy;
    $('buyKeepText').textContent = G.settings.buyKeep + ' %';
  },

  // médaillon d'occupation : l'icône ne change qu'avec le métier ou la compétence
  medaillon(box, nom) {
    if (box._nom === nom) return;
    box._nom = nom;
    box.replaceChildren(icone(nom || 'etoile'));
  },

  updateEntityRows(kind, list, cats, rows, state, xpPerDay, col2) {
    const firstLocked = {}, anyUnlocked = {};
    for (const e of list) {
      const r = rows[e.id], st = state[e.id];
      if (!G.unlocked[kind + ':' + e.id]) {
        r.tr.style.display = 'none';
        if (!firstLocked[e.cat]) firstLocked[e.cat] = e;
        continue;
      }
      anyUnlocked[e.cat] = true;
      r.tr.style.display = '';
      r.tr.classList.toggle('selected', (kind === 'job' ? G.currentJob : G.currentSkill) === e.id);
      const need = maxXp(e.xp, st.level);
      setProgress(r.bar, st.level, st.xp / need * 100);
      r.badge.textContent = st.maxLevel ? '×' + fmtMult(legacyMult(st)) : '';
      r.cells[0].textContent = st.level;
      r.cells[1].textContent = col2(e, st);
      r.cells[2].textContent = fmtTime(etaSeconds(st, e.xp, xpPerDay(e)));
    }
    for (const cat in cats) {
      const P = this.catParts[kind + ':' + cat], e = firstLocked[cat];
      const forbidden = isForbidden(cat);
      // catégorie sans rien de débloqué : une seule ligne compacte
      P.thead.style.display = anyUnlocked[cat] ? '' : 'none';
      P.wrap.classList.toggle('compact', !anyUnlocked[cat]);
      if (!e && !forbidden) { P.lockTr.style.display = 'none'; continue; }
      P.lockTr.style.display = '';
      P.lockTd.innerHTML = '';
      if (!anyUnlocked[cat]) {
        const n = el('b', 'lock-cat'); n.style.color = P.cat.color;
        n.append(icone(ICONES_CATEGORIES[cat] || 'etoile'), P.cat.name);
        P.lockTd.appendChild(n);
      }
      if (forbidden) {
        const t = el('span', 'lock-title'); t.append(icone('interdit'), ' interdit par le défi');
        P.lockTd.appendChild(t); continue;
      }
      const t = el('span', 'lock-title'); t.append(icone('cadenas'), ' ' + e.name);
      P.lockTd.appendChild(t);
      for (const r of e.req) {
        const p = reqProgress(r);
        P.lockTd.appendChild(el('span', p.cur >= p.need ? 'req ok' : 'req', `${p.label} ${Math.min(p.cur, p.need)}/${p.need}`));
      }
    }
  },
  updateJobs() {
    this.updateEntityRows('job', JOBS, JOB_CATS, this.jobRows, G.jobs, jobXpPerDay, j => fmt(jobIncome(j)));
  },
  updateSkills() {
    this.updateEntityRows('skill', SKILLS, SKILL_CATS, this.skillRows, G.skills, skillXpPerDay,
      (s, st) => s.effects.map(e => describeEffect(e, st.level)).join(', '));
  },

  updateShop() {
    const em = getMult('expenses'), net = netIncome(), dep = expenses(), ferme = isForbidden('shop');
    $('bourseRevenus').textContent = '+' + fmt(income()) + ' /j';
    $('bourseDepenses').textContent = (dep > 0 ? '−' + fmt(dep) : '0') + ' /j';
    $('bourseReste').textContent = (net >= 0 ? '+' : '−') + fmt(Math.abs(net)) + ' /j';
    $('bourseReste').className = net >= 0 ? 'pos' : 'neg';
    $('shopSummary').textContent = ferme ? 'Défi Ascète : la boutique est fermée.' : '';
    $('shopSummary').classList.toggle('hidden', !ferme);

    const curH = HOUSING_BY_ID[G.housing];
    for (const h of HOUSING) {
      const r = this.housingRows[h.id], ouvert = !!G.unlocked['shop:' + h.id], actuel = G.housing === h.id;
      r.carte.classList.toggle('verrou', !ouvert);
      r.carte.classList.toggle('actuel', actuel);
      r.carte.classList.toggle('cher', ouvert && !actuel && net + (curH.cost - h.cost) * em < 0);
      r.carte.disabled = !ouvert || ferme;
      r.carte.setAttribute('aria-pressed', actuel);
      // un logis pas encore débloqué ne montre que sa silhouette
      const texte = ouvert ? `×${fmtMult(h.happiness)} · ${fmt(h.cost * em)}/j` : 'à découvrir';
      if (r._ouvert !== ouvert) {
        r._ouvert = ouvert;
        r.nom.textContent = ouvert ? h.name : '???';
        r.info.replaceChildren(icone(ouvert ? 'bonheur' : 'cadenas'), el('span'));
      }
      if (r.info.lastChild.textContent !== texte) r.info.lastChild.textContent = texte;
    }
    for (const it of ITEMS) {
      // la relique de famille (léguée à la mort, js/rituel.js) agit sans être achetée ni entretenue
      const r = this.itemRows[it.id], pris = !!G.items[it.id], relique = G.relique === it.id && !pris;
      r.carte.classList.toggle('hidden', !G.unlocked['shop:' + it.id] && !relique);
      r.carte.classList.toggle('pris', pris || relique);
      r.carte.classList.toggle('cher', !pris && !relique && net - it.cost * em < 0);
      r.carte.disabled = ferme;
      r.carte.setAttribute('aria-pressed', pris);
      const texte = pris ? `Possédé · ${fmt(it.cost * em)}/j` : relique ? 'Relique de famille · sans entretien' : `${fmt(it.cost * em)} / jour`;
      if (r._pris !== pris) { r._pris = pris; r.prix.replaceChildren(icone(pris ? 'acquis' : 'ecus'), el('span')); }
      if (r.prix.lastChild.textContent !== texte) r.prix.lastChild.textContent = texte;
    }
  },

  updateLegacy() {
    $('lpPoints').textContent = G.legacy.points;
    $('lpPreview').textContent = '+' + legacyPointsPreview();
    const canReb = ageYears() >= 30 && !G.dead;
    $('rebirthBtn').disabled = !canReb;
    $('rebirthHint').textContent = canReb ? '' : 'Possible dès 30 ans.';
    this.majVertus(PERKS, this.perkCards, perkRank, perkCost, G.legacy.points, 'pt');

    // Floraison : visible dès qu'un sommet est atteint
    const F = G.floraison, possible = floraisonPossible();
    $('floraison').classList.toggle('hidden', !possible && !F.fois);
    if (possible || F.fois) {
      $('grGraines').textContent = F.graines;
      $('grPreview').textContent = '+' + grainesPreview();
      $('grFois').textContent = F.fois;
      $('floraisonBtn').disabled = !possible || G.dead;
      const choix = voiesAFleurir().map(v => JOB_CATS[v].name);
      const hint = !possible ? 'Atteignez un sommet : Connétable, Gardien du Temps, Seigneur des ombres ou Saint.'
        : choix.length > 1 ? `Une voie au choix : ${choix.join(' ou ')}` : choix.length ? `Fleurira : ${choix[0]}` : 'Aucune nouvelle voie : seulement des graines';
      if ($('floraisonHint').textContent !== hint) $('floraisonHint').textContent = hint;
      for (const v in this.fleurs) {
        this.fleurs[v].classList.toggle('fleurie', !!F.fleuries[v]);
        this.fleurs[v].classList.toggle('atteinte', !F.fleuries[v] && !!F.cycle[v]);
      }
      this.majVertus(RACINES, this.racineCards, racineRank, racineCost, F.graines, 'graine');
    }
    if (typeof Heritage !== 'undefined') Heritage.maj();
  },
  majVertus(list, cards, rang, cout, solde, unite) {
    for (const p of list) {
      const c = cards[p.id], r = rang(p.id), cost = cout(p);
      if (p.max > 1) c.rank.textContent = isFinite(p.max) ? `${r} / ${p.max}` : `rang ${r}`;
      if (c.pips && c._r !== r) { c._r = r; [...c.pips.children].forEach((pip, k) => pip.classList.toggle('on', k < r)); }
      else if (p.max === 1 && c.rank._acquis !== !!r) { c.rank._acquis = !!r; c.rank.replaceChildren(...(r ? [icone('acquis')] : [])); }
      if (r >= p.max) { c.btn.textContent = p.max > 1 ? 'Maximum' : 'Acquis'; c.btn.disabled = true; }
      else { c.btn.textContent = `Accorder — ${cost} ${unite}${cost > 1 ? 's' : ''}`; c.btn.disabled = solde < cost; }
      c.card.classList.toggle('owned', r > 0);
    }
  },

  updateChallenges() {
    for (const c of CHALLENGES) {
      const r = this.challengeCards[c.id];
      const done = !!G.challengesDone[c.id], active = G.challenge === c.id, ouvert = challengeOpen(c);
      r.card.classList.toggle('done', done);
      r.card.classList.toggle('active', active);
      r.card.classList.toggle('verrou', !ouvert);
      r.btn.textContent = done ? 'Réussi' : active ? 'En cours…' : ouvert ? 'Relever le défi' : 'Verrouillé';
      r.btn.disabled = done || active || !ouvert || G.dead;
    }
  },

  updateAchievements() {
    let n = 0;
    for (const a of ACHIEVEMENTS) {
      const got = !!G.achievements[a.id];
      if (got) n++;
      this.achCards[a.id].classList.toggle('unlocked', got);
    }
    $('achNombre').textContent = `${n} / ${ACHIEVEMENTS.length}`;
    $('achCount').textContent = `· +${2 * Object.keys(G.achievements).length} % d'XP, pour toujours`;
  },

  // Registre de la maison : de grands chiffres gravés, construits une fois
  updateStats() {
    const rows = [
      ['lignee', 'Vies transmises', G.legacy.rebirths],
      ['sablier', 'Meilleur âge atteint', `${Math.floor(Math.max(G.stats.bestAge, ageYears()))} ans`],
      ['ecus', 'Écus gagnés', fmt(G.stats.coinsEarned)],
      ['parchemin', 'Événements vécus', G.stats.events],
      ['etendard', 'Défis réussis', `${Object.keys(G.challengesDone).length} / ${CHALLENGES.length}`],
      ['etoile', 'Multiplicateur d\'XP', '×' + fmtMult(getMult('xp:all'))],
      ['fleur', 'Floraisons', G.floraison.fois],
    ];
    if (!this.statVals) {
      this.statVals = rows.map(([nom, libelle]) => {
        const carte = el('div', 'stat-carte cadre'), small = el('small'), b = el('b');
        small.append(icone(nom), libelle);
        carte.append(small, b);
        $('statsBox').append(carte);
        return b;
      });
    }
    rows.forEach(([, , v], i) => { if (this.statVals[i].textContent !== String(v)) this.statVals[i].textContent = v; });
  },

  updateOptions() {
    const l = G.lignee;
    if (!l) return;
    const gen = l.oublies + l.vies.length + 1;
    const txt = `${l.maison ? 'Maison ' + l.maison : 'Maison sans nom'} · génération ${typeof romain === 'function' ? romain(gen) : gen} · ${nomComplet(l)}`;
    if ($('ligneeInfo').textContent !== txt) $('ligneeInfo').textContent = txt;
  },

  // Journal : une frise, regroupée par âge, une icône par type d'entrée
  updateJournal() {
    const key = G.log.length + ':' + (G.log[0] ? G.log[0].msg : '');
    if (key === this.logKey) return;
    this.logKey = key;
    const ol = $('journal');
    ol.replaceChildren();
    let age = null;
    for (const l of G.log) {
      if (l.age !== age) {
        age = l.age;
        const t = el('li', 'f-age');
        t.append(el('span', 'f-point'), `${age} ans`);
        ol.appendChild(t);
      }
      const li = el('li', 'f-entree ' + (l.type || ''));
      li.append(icone(iconeJournal(l.type)), el('span', null, l.msg));
      ol.appendChild(li);
    }
    if (!G.log.length) ol.appendChild(el('li', 'muted', 'Rien à signaler pour l\'instant.'));
  },

  // ------------------------------------------------- API pour les modules
  // Les modules (santé, saisons…) déclarent ce qu'ils veulent afficher ; le rendu reste ici.
  ajouterRessource(def) { this.ressources.ajouter(def); },
  ajouterJauge(def) { this.jauges.ajouter(def); },
  ajouterMarque(def) { this.marques.ajouter({ ...def, id: `${def.cible}:${def.id}:${def.icone}`, cibleId: def.id }); },

  rendreRessource(d) {
    const box = $('ressources-modules');
    const ancienne = this.vues.get('r:' + d.id);
    const n = el('span', 'ressource-module');
    const ins = el('span', 'inscription'), small = el('small'), lib = el('span'), b = el('b');
    small.append(el('span'), lib);   // le premier enfant sera l'icône
    ins.append(small, b);
    n.append(el('span', 'brin'), ins);
    if (ancienne) ancienne.n.replaceWith(n); else box.appendChild(n);
    this.vues.set('r:' + d.id, { n, small, lib, b, icone: null });
    this.majRessource(d);
  },
  majRessource(d) {
    const v = this.vues.get('r:' + d.id);
    const nom = valeur(d.icone);
    if (nom !== v.icone) { v.icone = nom; v.small.firstChild.replaceWith(icone(nom)); }
    v.lib.textContent = valeur(d.libelle);
    v.b.textContent = valeur(d.valeur);
    v.n.title = d.titre ? valeur(d.titre) : '';
    const ton = d.ton ? valeur(d.ton) : null;
    v.b.className = ton === 'bon' ? 'pos' : ton === 'mauvais' ? 'neg' : '';
  },

  rendreJauge(d) {
    const box = $('jauges');
    const ancienne = this.vues.get('j:' + d.id);
    const n = el('div', 'jauge');
    const tete = el('div', 'now-head'), nom = el('span'), texte = el('span', 'muted small');
    nom.append(icone(valeur(d.icone)), ' ', valeur(d.libelle));
    tete.append(nom, texte);
    const bar = el('div', 'bar'), fill = el('div');
    bar.appendChild(fill);
    const info = el('div', 'muted small');
    n.append(tete, bar, info);
    if (ancienne) ancienne.n.replaceWith(n); else box.appendChild(n);
    this.vues.set('j:' + d.id, { n, texte, fill, info });
    this.majJauge(d);
  },
  majJauge(d) {
    const v = this.vues.get('j:' + d.id), e = d.etat();
    v.texte.textContent = e.texte || '';
    v.fill.style.width = Math.max(0, Math.min(100, e.pct)) + '%';
    v.fill.style.background = TONS[e.ton] || TONS.moyen;
    v.info.textContent = e.info || '';
    v.n.title = e.titre || '';
    v.n.classList.toggle('hidden', !!e.cache);
  },

  rendreMarque(d) {
    const cellule = {
      job: () => this.jobRows[d.cibleId] && this.jobRows[d.cibleId].tr.firstChild,
      housing: () => this.housingRows[d.cibleId] && this.housingRows[d.cibleId].marques,
      item: () => this.itemRows[d.cibleId] && this.itemRows[d.cibleId].marques,
    }[d.cible];
    const cell = cellule && cellule();
    if (!cell) { console.warn(`[UI] marque « ${d.id} » : cible introuvable`); return; }
    for (const m of cell.querySelectorAll('.marque')) if (m.dataset.cle === d.id) m.remove();
    const m = el('span', 'marque marque-' + (d.ton || 'bon'));
    m.dataset.cle = d.id;
    m.title = d.titre || '';
    for (let i = 0; i < (d.nombre || 1); i++) m.appendChild(icone(d.icone));
    if (d.texte) m.append(' ' + d.texte);
    cell.appendChild(m);
  },

  // Une valeur de module qui plante ne doit pas arrêter l'interface : on prévient une fois et on continue.
  protege(d, f) {
    try { f(d); } catch (e) {
      if (!this.alertes[d.id]) { this.alertes[d.id] = true; console.warn(`[UI] « ${d.id} » :`, e); }
    }
  },
  majModules() {
    for (const d of this.ressources.liste()) if (this.vues.has('r:' + d.id)) this.protege(d, x => this.majRessource(x));
    for (const d of this.jauges.liste()) if (this.vues.has('j:' + d.id)) this.protege(d, x => this.majJauge(x));
  },

  // ------------------------------------------------------------- Tutoriel
  updateTuto() {
    const box = $('tuto');
    if (G.tutorial < 0 || G.tutorial >= TUTO.length || this.modalKind || G.dead || (typeof Rituel !== 'undefined' && Rituel.phase)) {
      box.classList.add('hidden');
      this.setFocus(null);
      this.tutoShown = null;
      return;
    }
    const st = TUTO[G.tutorial];
    if (st.wait && st.wait()) {
      G.tutorial = G.tutorial + 1 >= TUTO.length ? -1 : G.tutorial + 1;
      return this.updateTuto();
    }
    box.classList.remove('hidden');
    if (this.tutoShown !== G.tutorial) {
      this.tutoShown = G.tutorial;
      $('tutoStep').textContent = `Tutoriel · ${G.tutorial + 1} / ${TUTO.length}`;
      // une petite lanterne par étape : allumées jusqu'à l'étape en cours
      $('tutoPips').replaceChildren(...TUTO.map((_, i) => el('i', i < G.tutorial ? 'fait' : i === G.tutorial ? 'en-cours' : null)));
      $('tutoText').textContent = st.text;
      $('tutoWait').textContent = st.wait ? st.waitText : '';
      $('tutoNext').textContent = G.tutorial === TUTO.length - 1 ? 'Terminer' : 'Suivant';
      $('tutoNext').classList.toggle('hidden', !!st.wait);
      this.setFocus(st.target);
    }
  },
  setFocus(selector) {
    this.focusEls.forEach(e => e.classList.remove('tuto-focus'));
    this.focusEls = selector ? [...document.querySelectorAll(selector)] : [];
    this.focusEls.forEach(e => e.classList.add('tuto-focus'));
  },

  // ------------------------------------------------------------- Modales
  openModal(kind, html, buttons) {
    this.modalKind = kind;
    const box = $('modalBox');
    box.innerHTML = html;
    box.prepend(el('span', 'lanterne'));
    if (buttons.length) {
      const row = el('div', 'row-btns');
      for (const b of buttons) {
        const btn = el('button', 'btn ' + (b.cls || ''), b.label);
        btn.addEventListener('click', () => { this.closeModal(); b.run && b.run(); this.update(); });
        row.appendChild(btn);
      }
      box.appendChild(row);
    }
    $('modal').classList.remove('hidden');
    this.updateTuto();
  },
  closeModal() {
    this.modalKind = null;
    $('modal').classList.add('hidden');
  },
  confirm(title, body, onOk) {
    this.openModal('confirm', `<h2>${title}</h2><p>${body}</p>`,
      [{ label: 'Annuler', cls: 'ghost' }, { label: 'Confirmer', cls: 'danger', run: onOk }]);
  },
  showDeath() {
    const pts = legacyPointsPreview();
    this.openModal('death', `
      <h2>Fin d'une vie</h2>
      <p>${G.lignee ? `<b>${echapper(G.lignee.courante.prenom)}</b> s'éteint` : 'Vous vous éteignez'} à <b>${Math.floor(ageYears())} ans</b>.</p>
      <p>Vous transmettez <b class="gold">${pts} point(s) d'héritage</b>, et vos niveaux deviennent des bonus d'XP pour la suite.</p>`,
      [{ label: 'Commencer une nouvelle vie', cls: 'primary', run: () => { rebirth(); this.setTab('legacy'); } }]);
  },
  showTraits() {
    this.openModal('traits', `
      <h2>Une nouvelle naissance</h2>
      <p class="muted">Choisissez le trait de naissance de cette vie :</p>
      <div class="trait-list" id="traitList"></div>`, []);
    for (const id of G.pendingTraits) {
      const t = TRAIT_BY_ID[id];
      const b = el('button', 'trait');
      b.append(el('b', null, t.name), el('span', 'muted small', t.desc));
      b.addEventListener('click', () => { chooseTrait(id); this.closeModal(); this.update(); });
      $('traitList').appendChild(b);
    }
  },
  showEpilogue() {
    G.floraison.epilogue = true;
    const l = G.lignee, gen = l ? l.oublies + l.vies.length + 1 : G.legacy.rebirths + 1;
    const maison = l && l.maison ? `la maison <b>${echapper(l.maison)}</b>` : 'votre maison';
    this.openModal('epilogue', `
      <h2>L'arbre couronné</h2>
      <p>La Milice, les Arcanes, l'Ombre et le Clergé ont fleuri. Au-dessus des lanternes de ${maison}, l'arbre mort s'est couvert de fleurs de braise.</p>
      <p><b>${gen - 1}</b> générations ont porté la flamme, des glaneurs des premiers jours aux saints et aux seigneurs des ombres. On chantera longtemps leurs noms.</p>
      <p class="muted">L'histoire est accomplie, mais l'arbre peut fleurir encore : la lignée continue.</p>`,
      [{ label: 'Continuer la lignée', cls: 'primary' }]);
  },
  showOffline(r) {
    this.openModal('offline', `
      <h2>Pendant votre absence…</h2>
      <p>${fmtAge(r.days)} se sont écoulés${r.capped ? ` (limite : ${fmtTime(r.cap)})` : ''}.</p>
      <p>Écus : <b>${r.coins >= 0 ? '+' : ''}${fmt(r.coins)}</b> · Niveaux : <b>+${r.levels}</b></p>`,
      [{ label: 'Continuer', cls: 'primary' }]);
  },

  // Notification : cartouche gravé, une icône par type (les mêmes que le journal)
  toast(msg, type) {
    const t = el('div', 'toast ' + (type || ''));
    t.append(icone(typeof iconeJournal === 'function' ? iconeJournal(type) : 'etoile'), el('span', null, msg));
    $('toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 3500);
    setTimeout(() => t.remove(), 4000);
    while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
  },
};
UI.ressources = creerRegistre(d => UI.protege(d, x => UI.rendreRessource(x)));
UI.jauges = creerRegistre(d => UI.protege(d, x => UI.rendreJauge(x)));
UI.marques = creerRegistre(d => UI.protege(d, x => UI.rendreMarque(x)));

if (typeof module !== 'undefined') module.exports = { creerRegistre };
