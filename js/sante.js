'use strict';
// =====================================================================
//  Lignée — module Santé
//  La santé (0 à 100) baisse avec l'âge et les métiers pénibles, et remonte
//  grâce au logement, à certaines possessions et compétences.
//  Une bonne santé accélère l'apprentissage ; une mauvaise raccourcit la vie.
// =====================================================================

const HEALTH = {
  // Pénibilité : points de santé perdus par an en exerçant ce métier
  jobRisk: {
    bucheron: 1, pecheur: 0.5, mineur: 2.5,
    recrue: 1, garde: 1, veteran: 1.5, chevalier: 2, capitaine: 1, general: 0.5, connetable: 0.5,
    alchimiste: 1,
    tirelaine: 1, contrebandier: 1, voleur: 2, assassin: 3, chefguilde: 1, necromancien: 2, seigneur: 2,
  },
  // Récupération par an selon le logement et les possessions
  housingRegen: { etoile: 0, cabane: 1, chaumiere: 2, maison: 3, manoir: 4, chateau: 5, palais: 6 },
  itemRegen: { serviteur: 1, jardin: 3 },
  baseRegen: 1,
  agingStart: 25,      // âge à partir duquel le corps s'use
  agingPerYear: 0.12,  // usure supplémentaire par année au-delà
};

const healthOf = () => (G.health == null ? 100 : G.health);
const jobRisk = id => HEALTH.jobRisk[id] || 0;

// Variation de santé par an (positive = récupération)
function healthBreakdown() {
  let regen = HEALTH.baseRegen + (HEALTH.housingRegen[G.housing] || 0);
  for (const id in G.items) if (G.items[id]) regen += HEALTH.itemRegen[id] || 0;
  regen += G.skills.vitalite.level * 0.02 + G.skills.endurance.level * 0.03 + G.skills.meditation.level * 0.005;
  const aging = Math.max(0, ageYears() - HEALTH.agingStart) * HEALTH.agingPerYear;
  const risk = jobRisk(G.currentJob);
  return { regen, aging, risk, net: regen - aging - risk };
}

// Effets : XP de ×0,5 (santé 0) à ×1,1 (santé 100) ; sous 40, la vie raccourcit (jusqu'à ×0,8)
const healthXpMult = () => 0.5 + healthOf() / 100 * 0.6;
const healthLifeMult = () => (healthOf() >= 40 ? 1 : 0.8 + healthOf() / 200);

HOOKS.init.push(() => { if (G.health == null) G.health = 100; });
HOOKS.newLife.push(() => { G.health = 100; });
HOOKS.tick.push(d => {
  G.health = Math.min(100, Math.max(0, healthOf() + healthBreakdown().net * d / DAYS_PER_YEAR));
});
HOOKS.mult.push(stat => {
  if (stat === 'xp:all') return healthXpMult();
  if (stat === 'lifespan') return healthLifeMult();
  return 1;
});

// ------------------------------------------------------------ Événements
const addHealth = n => { G.health = Math.min(100, Math.max(0, healthOf() + n)); };
const HEALTH_EVENTS = [
  { id: 'accident', title: 'Accident de travail', weight: 3, cond: () => jobRisk(G.currentJob) >= 1,
    init: () => ({}),
    text: () => 'Une mauvaise chute au travail : votre dos vous fait souffrir.',
    choices: [
      { label: () => 'Se reposer 3 mois : santé +15',
        run: () => { G.days += 90; addHealth(15); return ['Le repos vous fait le plus grand bien.', 'good']; } },
      { label: () => 'Serrer les dents : santé −15',
        run: () => { addHealth(-15); return ['Vous continuez, mais la douleur s\'installe.', 'bad']; } },
    ] },
  { id: 'medecin', title: 'Un médecin réputé', weight: 3, cond: () => healthOf() < 60,
    init: () => ({ cost: Math.max(80, refIncome() * 40) }),
    text: () => 'Un médecin de la capitale est de passage et accepte de vous examiner.',
    choices: [
      { label: d => `Se faire soigner (${fmt(d.cost)}) : santé +35`, can: d => G.coins >= d.cost,
        run: d => { G.coins -= d.cost; addHealth(35); return ['Ses remèdes font des merveilles.', 'good']; } },
      { label: () => 'Refuser', run: () => ['Vous n\'aimez pas les médecins.', ''] },
    ] },
  { id: 'cure', title: 'Cure thermale', weight: 2, cond: () => healthOf() < 85 && ageYears() >= 30,
    init: () => ({ cost: Math.max(50, refIncome() * 25) }),
    text: () => 'Des sources chaudes réputées pour leurs vertus vous tendent les bras.',
    choices: [
      { label: d => `Partir en cure (${fmt(d.cost)}) : santé +20, bonheur ×1,2 (1 an)`, can: d => G.coins >= d.cost,
        run: d => { G.coins -= d.cost; addHealth(20); addBuff('happiness', 1.2, 365, 'Souvenirs de cure'); return ['Vous revenez ragaillardi.', 'good']; } },
      { label: () => 'Pas le temps', run: () => ['Le travail n\'attend pas.', ''] },
    ] },
];
for (const ev of HEALTH_EVENTS) { EVENTS.push(ev); EVENT_BY_ID[ev.id] = ev; }

ACHIEVEMENTS.push(
  { id: 'bonpied',   name: 'Bon pied, bon œil', desc: 'Avoir 70 ans avec une santé d\'au moins 80', check: () => ageYears() >= 70 && healthOf() >= 80 },
  { id: 'increvable', name: 'Increvable',       desc: 'Remonter à 100 de santé après 60 ans',       check: () => ageYears() >= 60 && healthOf() >= 100 },
);

// ------------------------------------------------------------- Interface
const HealthUI = {
  built: false,
  build() {
    const style = document.createElement('style');
    style.textContent = `
      .health-box { margin-bottom: 8px; }
      #healthFill { transition: width .2s linear; }
      .risk-mark { margin-left: 6px; font-size: 11px; color: #e0a456; cursor: help; }
      .regen-mark { margin-left: 6px; font-size: 11px; font-weight: 400; color: #7fb069; }
    `;
    document.head.appendChild(style);

    const box = el('div', 'health-box');
    const line = el('div', 'age-line small');
    line.append(el('span', null, 'Santé'), Object.assign(el('span'), { id: 'healthText' }));
    const bar = el('div', 'bar');
    bar.appendChild(Object.assign(el('div'), { id: 'healthFill' }));
    box.append(line, bar, Object.assign(el('div', 'muted small'), { id: 'healthInfo' }));
    $('traitLine').after(box);

    // Pénibilité dans le tableau des métiers
    for (const j of JOBS) {
      const r = jobRisk(j.id);
      if (!r) continue;
      const m = el('span', 'risk-mark', r >= 2 ? '⚠⚠' : '⚠');
      m.title = `Métier pénible : −${String(r).replace('.', ',')} santé / an`;
      UI.jobRows[j.id].tr.firstChild.appendChild(m);
    }
    // Récupération dans la boutique
    for (const h of HOUSING) {
      const g = HEALTH.housingRegen[h.id];
      if (g) UI.housingRows[h.id].cells[0].appendChild(el('span', 'regen-mark', `+${g} santé/an`));
    }
    for (const id in HEALTH.itemRegen) {
      UI.itemRows[id].cells[1].appendChild(el('span', 'regen-mark', `+${HEALTH.itemRegen[id]} santé/an`));
    }
    this.built = true;
  },
  update() {
    if (!this.built) this.build();
    const h = healthOf(), b = healthBreakdown();
    $('healthText').textContent = Math.floor(h) + ' / 100';
    const fill = $('healthFill');
    fill.style.width = h + '%';
    fill.style.background = h >= 60 ? '#6fae5a' : h >= 35 ? '#d4a64a' : '#e06456';
    const sign = b.net >= 0 ? '+' : '−';
    $('healthInfo').textContent = `${sign}${Math.abs(b.net).toFixed(1).replace('.', ',')} / an · XP ×${fmtMult(healthXpMult())}`
      + (healthLifeMult() < 1 ? ` · vie ×${fmtMult(healthLifeMult())}` : '');
    $('healthInfo').title = `Récupération +${b.regen.toFixed(1)} · usure de l'âge −${b.aging.toFixed(1)} · pénibilité −${b.risk.toFixed(1)}`;
  },
};
HOOKS.ui.push(() => HealthUI.update());
