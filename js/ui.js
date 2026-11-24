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
  housingRows: {}, itemRows: {}, perkCards: {}, achCards: {}, challengeCards: {},
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
        const th = el('th', null, i === 0 ? cat.name : c);
        if (i === 0) th.style.color = cat.color;
        hr.appendChild(th);
      });
      const thead = el('thead'); thead.appendChild(hr); table.appendChild(thead);
      const tbody = el('tbody'); table.appendChild(tbody);
      for (const e of list.filter(x => x.cat === catId)) {
        const tr = el('tr', 'row');
        tr.title = e.desc || '';
        const nameTd = el('td', 'name-cell');
        const bar = el('div', 'row-bar'); bar.style.background = cat.color;
        const badge = el('span', 'legacy-badge');
        badge.title = 'Bonus d\'héritage (meilleur niveau des vies passées)';
        nameTd.append(bar, el('span', 'row-name', e.name), badge);
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
      const wrap = el('div', 'table-wrap'); wrap.appendChild(table);
      root.appendChild(wrap);
      this.catParts[kind + ':' + catId] = { thead, wrap, lockTr: lock, lockTd: ltd, cat };
    }
    return rows;
  },

  buildShop() {
    const mk = (rootId, cols) => {
      const table = el('table', 'grid');
      const hr = el('tr');
      cols.forEach(c => hr.appendChild(el('th', null, c)));
      const thead = el('thead'); thead.appendChild(hr); table.appendChild(thead);
      const tbody = el('tbody'); table.appendChild(tbody);
      const wrap = el('div', 'table-wrap'); wrap.appendChild(table);
      $(rootId).appendChild(wrap);
      return tbody;
    };
    const hb = mk('housingTable', ['Logement', 'Bonheur', 'Coût / jour']);
    for (const h of HOUSING) {
      const tr = el('tr', 'row');
      const cells = [el('td', 'name-cell', h.name), el('td', null, '×' + fmtMult(h.happiness)), el('td')];
      tr.append(...cells);
      tr.addEventListener('click', () => { setHousing(h.id); this.update(); });
      hb.appendChild(tr);
      this.housingRows[h.id] = { tr, cells };
    }
    const ib = mk('itemsTable', ['Possession', 'Effet', 'Coût / jour']);
    for (const it of ITEMS) {
      const tr = el('tr', 'row');
      const cells = [el('td', 'name-cell', it.name), el('td', null, it.effects.map(e => describeEffect(e)).join(', ')), el('td')];
      tr.append(...cells);
      tr.addEventListener('click', () => { toggleItem(it.id); this.update(); });
      ib.appendChild(tr);
      this.itemRows[it.id] = { tr, cells };
    }
  },

  buildPerks() {
    const grid = $('perkGrid');
    for (const p of PERKS) {
      const card = el('div', 'perk card' + (p.setting ? ' auto' : ''));
      const rank = el('span', 'rank');
      const head = el('div', 'perk-head'); head.append(el('h4', null, p.name), rank);
      const btn = el('button', 'btn small');
      btn.addEventListener('click', () => { buyPerk(p.id); this.update(); });
      card.append(head, el('p', 'muted small', p.desc), btn);
      grid.appendChild(card);
      this.perkCards[p.id] = { card, rank, btn };
    }
  },

  buildChallenges() {
    const grid = $('challengeGrid');
    for (const c of CHALLENGES) {
      const card = el('div', 'challenge card');
      const status = el('span', 'rank');
      const head = el('div', 'perk-head'); head.append(el('h4', null, c.name), status);
      const btn = el('button', 'btn small');
      btn.addEventListener('click', () => this.confirm(`Commencer le défi « ${c.name} » ?`,
        `Votre vie actuelle s'achève (+${legacyPointsPreview()} point(s) d'héritage) et une nouvelle commence.<br><br><b>Règles :</b> ${c.rules}<br><b>Objectif :</b> ${c.goalText}`,
        () => startChallenge(c.id)));
      card.append(head,
        el('p', 'small', c.rules),
        el('p', 'small muted', 'Objectif : ' + c.goalText),
        el('p', 'small gold', c.rewardText),
        btn);
      grid.appendChild(card);
      this.challengeCards[c.id] = { card, status, btn };
    }
  },

  buildAchievements() {
    const grid = $('achGrid');
    for (const a of ACHIEVEMENTS) {
      const card = el('div', 'ach card');
      card.append(el('h4', null, a.name), el('p', 'muted small', a.desc));
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
    }
    if (G.dead) { if (this.modalKind !== 'death') this.showDeath(); }
    else if (G.pendingTraits && !this.modalKind) this.showTraits();
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
    $('pauseBtn').textContent = G.paused ? '▶ Reprendre' : '⏸ Pause';
    $('pauseBtn').classList.toggle('paused', G.paused);
    document.body.classList.toggle('is-paused', G.paused);
  },

  updateSidebar() {
    const tr = currentTrait();
    $('traitLine').classList.toggle('hidden', !tr);
    if (tr) { $('traitLine').textContent = tr.name; $('traitLine').title = tr.desc; }

    const j = JOB_BY_ID[G.currentJob], je = G.jobs[j.id];
    $('curJobName').textContent = `${j.name} ${je.level}`;
    $('curJobInfo').textContent = `${fmt(jobIncome(j))} écus/j`;
    setProgress($('curJobFill'), je.level, je.xp / maxXp(j.xp, je.level) * 100);
    $('curJobFill').style.background = JOB_CATS[j.cat].color;

    const s = SKILL_BY_ID[G.currentSkill], se = G.skills[s.id];
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
      bl.appendChild(el('li', null, `${b.name} : ×${fmtMult(b.mult)} ${STAT_LABELS[b.stat]} (${Math.ceil(b.until - G.days)} j)`));
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
        const n = el('b', 'lock-cat', P.cat.name); n.style.color = P.cat.color;
        P.lockTd.appendChild(n);
      }
      if (forbidden) { P.lockTd.appendChild(el('span', 'lock-title', '⛔ interdit par le défi')); continue; }
      P.lockTd.appendChild(el('span', 'lock-title', `🔒 ${e.name}`));
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
    const em = getMult('expenses'), net = netIncome();
    const curH = HOUSING_BY_ID[G.housing];
    for (const h of HOUSING) {
      const r = this.housingRows[h.id];
      r.tr.style.display = G.unlocked['shop:' + h.id] ? '' : 'none';
      const active = G.housing === h.id;
      r.tr.classList.toggle('selected', active);
      r.cells[2].textContent = fmt(h.cost * em);
      r.tr.classList.toggle('unaffordable', !active && net + (curH.cost - h.cost) * em < 0);
    }
    for (const it of ITEMS) {
      const r = this.itemRows[it.id];
      r.tr.style.display = G.unlocked['shop:' + it.id] ? '' : 'none';
      const owned = !!G.items[it.id];
      r.tr.classList.toggle('selected', owned);
      r.cells[2].textContent = fmt(it.cost * em);
      r.tr.classList.toggle('unaffordable', !owned && net - it.cost * em < 0);
    }
    $('shopSummary').textContent = isForbidden('shop')
      ? 'Défi Ascète : la boutique est fermée.'
      : `Dépenses : ${fmt(expenses())} écus/jour · cliquez pour acheter ou revendre`;
  },

  updateLegacy() {
    $('lpPoints').textContent = G.legacy.points;
    $('lpPreview').textContent = '+' + legacyPointsPreview();
    const canReb = ageYears() >= 30 && !G.dead;
    $('rebirthBtn').disabled = !canReb;
    $('rebirthHint').textContent = canReb ? '' : 'Possible dès 30 ans.';
    for (const p of PERKS) {
      const c = this.perkCards[p.id], r = perkRank(p.id), cost = perkCost(p);
      c.rank.textContent = p.max > 1 ? `${r} / ${p.max}` : (r ? '✔' : '');
      if (r >= p.max) { c.btn.textContent = p.max > 1 ? 'Maximum' : 'Acquis'; c.btn.disabled = true; }
      else { c.btn.textContent = `Acheter — ${cost} pt${cost > 1 ? 's' : ''}`; c.btn.disabled = G.legacy.points < cost; }
      c.card.classList.toggle('owned', r > 0);
    }
  },

  updateChallenges() {
    for (const c of CHALLENGES) {
      const r = this.challengeCards[c.id];
      const done = !!G.challengesDone[c.id], active = G.challenge === c.id;
      r.card.classList.toggle('done', done);
      r.card.classList.toggle('active', active);
      r.status.textContent = done ? '★' : '';
      r.btn.textContent = done ? 'Réussi' : active ? 'En cours…' : 'Commencer';
      r.btn.disabled = done || active || G.dead;
    }
  },

  updateAchievements() {
    let n = 0;
    for (const a of ACHIEVEMENTS) {
      const got = !!G.achievements[a.id];
      if (got) n++;
      this.achCards[a.id].classList.toggle('unlocked', got);
    }
    $('achCount').textContent = `${n} / ${ACHIEVEMENTS.length} — chaque haut fait donne +2 % d'XP.`;
  },

  updateStats() {
    const rows = [
      ['Vies transmises', G.legacy.rebirths],
      ['Meilleur âge atteint', `${Math.floor(Math.max(G.stats.bestAge, ageYears()))} ans`],
      ['Écus gagnés (toutes vies)', fmt(G.stats.coinsEarned)],
      ['Événements vécus', G.stats.events],
      ['Défis réussis', `${Object.keys(G.challengesDone).length} / ${CHALLENGES.length}`],
      ['Multiplicateur XP global', '×' + fmtMult(getMult('xp:all'))],
    ];
    const box = $('statsBox'); box.innerHTML = '';
    const t = el('table', 'grid stats');
    const tb = el('tbody');
    for (const [k, v] of rows) {
      const tr = el('tr'); tr.append(el('td', null, k), el('td', 'num', String(v))); tb.appendChild(tr);
    }
    t.appendChild(tb);
    const wrap = el('div', 'table-wrap'); wrap.appendChild(t);
    box.appendChild(wrap);
  },

  updateJournal() {
    const key = G.log.length + ':' + (G.log[0] ? G.log[0].msg : '');
    if (key === this.logKey) return;
    this.logKey = key;
    const ul = $('journal'); ul.innerHTML = '';
    for (const l of G.log) {
      const li = el('li', l.type || '');
      li.append(el('span', 'log-age', `${l.age} ans`), el('span', null, l.msg));
      ul.appendChild(li);
    }
    if (!G.log.length) ul.appendChild(el('li', 'muted', 'Rien à signaler pour l\'instant.'));
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
  },

  rendreMarque(d) {
    const cellule = {
      job: () => this.jobRows[d.cibleId] && this.jobRows[d.cibleId].tr.firstChild,
      housing: () => this.housingRows[d.cibleId] && this.housingRows[d.cibleId].cells[0],
      item: () => this.itemRows[d.cibleId] && this.itemRows[d.cibleId].cells[1],
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
    if (G.tutorial < 0 || G.tutorial >= TUTO.length || this.modalKind || G.dead) {
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
      $('tutoStep').textContent = `Tutoriel ${G.tutorial + 1} / ${TUTO.length}`;
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
      <p>Vous vous éteignez à <b>${Math.floor(ageYears())} ans</b>.</p>
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
  showOffline(r) {
    this.openModal('offline', `
      <h2>Pendant votre absence…</h2>
      <p>${fmtAge(r.days)} se sont écoulés${r.capped ? ` (limite : ${fmtTime(r.cap)})` : ''}.</p>
      <p>Écus : <b>${r.coins >= 0 ? '+' : ''}${fmt(r.coins)}</b> · Niveaux : <b>+${r.levels}</b></p>`,
      [{ label: 'Continuer', cls: 'primary' }]);
  },

  toast(msg, type) {
    const t = el('div', 'toast ' + (type || ''), msg);
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
