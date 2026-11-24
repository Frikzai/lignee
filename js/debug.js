'use strict';
// =====================================================================
//  Lignée — panneau de debug (outil de développement)
//  Ouverture : Ctrl + Maj + D, ou ajouter ?debug à l'adresse.
//  Tout est dans ce fichier (styles compris) pour ne pas gêner le reste du jeu.
// =====================================================================

const Debug = {
  open: false,
  panel: null,
  info: null,
  speedBtns: [],

  init() {
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') { e.preventDefault(); this.toggle(); }
    });
    if (new URLSearchParams(location.search).has('debug')) this.toggle();
    setInterval(() => this.refresh(), 250);
  },

  toggle() {
    if (!this.panel) this.build();
    this.open = !this.open;
    this.panel.classList.toggle('dbg-hidden', !this.open);
    this.refresh();
  },

  // Exécute une action de debug puis rafraîchit l'interface
  act(fn, msg) {
    fn();
    G.stats.debugUsed = true;
    checkUnlocks(false);
    UI.update();
    this.refresh();
    if (msg) UI.toast('[debug] ' + msg, '');
  },

  build() {
    const style = document.createElement('style');
    style.textContent = `
      .dbg { position: fixed; top: 70px; right: 16px; z-index: 70; width: 290px; max-height: calc(100vh - 90px); overflow-y: auto;
        background: #101418; color: #d8e1ea; border: 1px solid #3f6f8f; border-radius: 10px; padding: 10px 12px;
        font: 12px/1.4 ui-monospace, Consolas, monospace; box-shadow: 0 10px 40px rgba(0,0,0,.6); }
      .dbg-hidden { display: none; }
      .dbg h4 { margin: 10px 0 4px; font: 600 11px ui-monospace, Consolas, monospace; color: #7fb7dc; text-transform: uppercase; letter-spacing: .08em; }
      .dbg-head { display: flex; justify-content: space-between; align-items: center; font-weight: 700; color: #7fb7dc; }
      .dbg-row { display: flex; flex-wrap: wrap; gap: 4px; }
      .dbg button { background: #1b242d; color: #d8e1ea; border: 1px solid #34495a; border-radius: 5px; padding: 3px 7px; font: inherit; cursor: pointer; }
      .dbg button:hover { border-color: #7fb7dc; }
      .dbg button.on { background: #3f6f8f; border-color: #7fb7dc; }
      .dbg button.warn { color: #f0a196; border-color: #7a3a32; }
      .dbg-info { white-space: pre; color: #9fb3c4; background: #0b0e11; border-radius: 6px; padding: 6px 8px; margin-top: 4px; }
    `;
    document.head.appendChild(style);

    const p = el('div', 'dbg dbg-hidden');
    const head = el('div', 'dbg-head');
    const close = el('button', null, '✕');
    close.addEventListener('click', () => this.toggle());
    head.append(el('span', null, '🛠 DEBUG'), close);
    p.appendChild(head);

    const section = (title, buttons) => {
      p.appendChild(el('h4', null, title));
      const row = el('div', 'dbg-row');
      for (const [label, fn, cls] of buttons) {
        const b = el('button', cls || null, label);
        b.addEventListener('click', fn);
        row.appendChild(b);
      }
      p.appendChild(row);
      return row;
    };

    const speeds = [1, 10, 100, 1000];
    const sr = section('Vitesse du temps', speeds.map(s => [`×${s}`, () => { debugSpeed = s; this.refresh(); }]));
    this.speedBtns = [...sr.children].map((b, i) => [b, speeds[i]]);

    section('Écus', [
      ['+1 k', () => this.act(() => { G.coins += 1e3; }, '+1 000 écus')],
      ['+1 M', () => this.act(() => { G.coins += 1e6; }, '+1 M écus')],
      ['×10', () => this.act(() => { G.coins = Math.max(10, G.coins * 10); }, 'écus ×10')],
      ['= 0', () => this.act(() => { G.coins = 0; }, 'écus à 0')],
    ]);
    section('Héritage', [
      ['+10 pts', () => this.act(() => { G.legacy.points += 10; }, '+10 points')],
      ['+100 pts', () => this.act(() => { G.legacy.points += 100; }, '+100 points')],
      ['Transmettre', () => this.act(() => { rebirth(); }, 'nouvelle vie')],
    ]);
    section('Niveaux', [
      ['Métier +10', () => this.act(() => { G.jobs[G.currentJob].level += 10; }, 'métier +10')],
      ['Compét. +10', () => this.act(() => { G.skills[G.currentSkill].level += 10; }, 'compétence +10')],
      ['Toutes compét. +50', () => this.act(() => {
        for (const s of SKILLS) if (G.unlocked['skill:' + s.id]) G.skills[s.id].level += 50;
      }, 'compétences débloquées +50')],
      ['Tout débloquer', () => this.act(() => {
        for (const j of JOBS) G.unlocked['job:' + j.id] = true;
        for (const s of SKILLS) G.unlocked['skill:' + s.id] = true;
        for (const x of [...HOUSING, ...ITEMS]) G.unlocked['shop:' + x.id] = true;
      }, 'tout est débloqué')],
    ]);
    section('Temps & vie', [
      ['+1 an', () => this.act(() => { G.days += DAYS_PER_YEAR; }, '+1 an')],
      ['+10 ans', () => this.act(() => { G.days += 10 * DAYS_PER_YEAR; }, '+10 ans')],
      ['Rajeunir 10 ans', () => this.act(() => { G.days = Math.max(START_AGE * DAYS_PER_YEAR, G.days - 10 * DAYS_PER_YEAR); }, '−10 ans')],
      ['Mourir', () => this.act(() => { if (!G.dead) die(); }), 'warn'],
    ]);
    section('Divers', [
      ['Événement', () => this.act(() => { G.event = null; spawnEvent(); })],
      ['Corruption +20', () => this.act(() => { G.corruption = Math.min(100, G.corruption + 20); }, 'corruption +20')],
      ['Nouveaux traits', () => this.act(() => { G.trait = null; G.pendingTraits = rollTraits(); UI.closeModal(); })],
      ['Fin tutoriel', () => this.act(() => { G.tutorial = -1; })],
    ]);

    p.appendChild(el('h4', null, 'État'));
    this.info = el('div', 'dbg-info');
    p.appendChild(this.info);
    document.body.appendChild(p);
    this.panel = p;
  },

  refresh() {
    if (!this.open || !this.panel || !G) return;
    for (const [b, s] of this.speedBtns) b.classList.toggle('on', debugSpeed === s);
    const f = v => fmtMult(v);
    this.info.textContent = [
      `âge        ${fmtAge(G.days)}`,
      `espérance  ${lifespanYears().toFixed(1)} ans`,
      `vitesse    ${f(speed())} j/s`,
      `revenu     ${fmt(income())} − ${fmt(expenses())} /j`,
      `bonheur    ×${f(happiness())}`,
      `XP tout    ×${f(getMult('xp:all'))}`,
      `XP métiers ×${f(getMult('xp:jobs'))}`,
      `XP compét. ×${f(getMult('xp:skills'))}`,
      `corruption ${G.corruption.toFixed(1)}`,
      `événement  ${G.event ? G.event.id : '—'} (${Math.round(G.nextEventIn)} s)`,
      `pts légués ${legacyPointsPreview()}`,
    ].join('\n');
  },
};

Debug.init();
