'use strict';
// =====================================================================
//  Lignée — module Saisons
//  L'année est découpée en 4 saisons qui modifient revenus, XP et bonheur,
//  et déclenchent des événements saisonniers.
// =====================================================================

const SEASONS = [
  { id: 'printemps', name: 'Printemps', icon: '🌱',
    mods: { 'income:paysannerie': 1.25, 'happiness': 1.1 } },
  { id: 'ete', name: 'Été', icon: '☀️',
    mods: { 'income:paysannerie': 1.5, 'xp:jobs': 1.1, 'income:milice': 0.9 } },
  { id: 'automne', name: 'Automne', icon: '🍂',
    mods: { 'income:paysannerie': 1.2, 'xp:skills': 1.15 } },
  { id: 'hiver', name: 'Hiver', icon: '❄️',
    mods: { 'income:paysannerie': 0.6, 'income:milice': 1.25, 'income:ombre': 1.25, 'xp:arcanes': 1.25, 'xp:mystique': 1.25, 'happiness': 0.9 } },
];
const SEASON_DAYS = DAYS_PER_YEAR / SEASONS.length;

const seasonIndex = () => Math.floor((G.days % DAYS_PER_YEAR) / SEASON_DAYS) % SEASONS.length;
const currentSeason = () => SEASONS[seasonIndex()];
const seasonDaysLeft = () => SEASON_DAYS - (G.days % DAYS_PER_YEAR) % SEASON_DAYS;

function describeSeason(s) {
  return Object.entries(s.mods).map(([stat, m]) => {
    const pct = Math.round((m - 1) * 100);
    return `${pct > 0 ? '+' : '−'}${Math.abs(pct)} % ${STAT_LABELS[stat] || stat}`;
  }).join(', ');
}

HOOKS.mult.push(stat => currentSeason().mods[stat] || 1);

// ------------------------------------------------------------ Événements
const SEASON_EVENTS = [
  { id: 'recolte', title: 'La grande récolte', weight: 3, cond: () => currentSeason().id === 'automne',
    init: () => ({ gain: Math.max(30, refIncome() * 25), cost: Math.max(40, refIncome() * 20) }),
    text: () => 'Les greniers débordent : tout le village se prépare pour la récolte.',
    choices: [
      { label: d => `Prêter main-forte (+${fmt(d.gain)} écus)`,
        run: d => { G.coins += d.gain; return [`Une saison bien remplie : +${fmt(d.gain)} écus.`, 'good']; } },
      { label: d => `Organiser la foire (${fmt(d.cost)}) : bonheur ×1,3 jusqu'à l'hiver`, can: d => G.coins >= d.cost,
        run: d => { G.coins -= d.cost; addBuff('happiness', 1.3, seasonDaysLeft(), 'Foire d\'automne'); return ['La foire est un triomphe !', 'good']; } },
    ] },
  { id: 'hiverrude', title: 'Un hiver rigoureux', weight: 3, cond: () => currentSeason().id === 'hiver',
    init: () => ({ cost: Math.max(30, refIncome() * 15) }),
    text: () => 'Le froid mord, la neige bloque les routes et le bois vient à manquer.',
    choices: [
      { label: d => `Acheter du bois (${fmt(d.cost)})`, can: d => G.coins >= d.cost,
        run: d => { G.coins -= d.cost; return ['Un bon feu crépite dans l\'âtre.', 'good']; } },
      { label: () => 'Grelotter : bonheur ×0,7 jusqu\'au printemps',
        run: () => { addBuff('happiness', 0.7, seasonDaysLeft(), 'Grand froid'); return ['Vous claquez des dents tout l\'hiver.', 'bad']; } },
    ] },
  { id: 'canicule', title: 'Canicule', weight: 2, cond: () => currentSeason().id === 'ete',
    init: () => ({}),
    text: () => 'Une chaleur écrasante s\'abat sur la région.',
    choices: [
      { label: () => 'Travailler à l\'aube : XP métiers ×1,3, bonheur ×0,85 (fin de l\'été)',
        run: () => { const n = seasonDaysLeft(); addBuff('xp:jobs', 1.3, n, 'Lève-tôt'); addBuff('happiness', 0.85, n, 'Fatigue'); return ['Vous profitez de la fraîcheur du matin.', 'good']; } },
      { label: () => 'Faire la sieste', run: () => ['Rien ne presse.', ''] },
    ] },
  { id: 'eveil', title: 'Le renouveau', weight: 2, cond: () => currentSeason().id === 'printemps',
    init: () => ({}),
    text: () => 'La nature s\'éveille et vous vous sentez plein d\'énergie.',
    choices: [
      { label: () => 'Étudier au grand air : XP compétences ×1,5 (fin du printemps)',
        run: () => { addBuff('xp:skills', 1.5, seasonDaysLeft(), 'Air du printemps'); return ['Votre esprit est vif comme jamais.', 'good']; } },
      { label: () => 'Flâner : bonheur ×1,2 (fin du printemps)',
        run: () => { addBuff('happiness', 1.2, seasonDaysLeft(), 'Flânerie'); return ['Quelle douceur de vivre.', 'good']; } },
    ] },
];
for (const ev of SEASON_EVENTS) { EVENTS.push(ev); EVENT_BY_ID[ev.id] = ev; }

// ------------------------------------------------------------- Interface
const SeasonUI = {
  built: false,
  span: null,
  build() {
    const style = document.createElement('style');
    style.textContent = `.season-tag { margin-left: 10px; color: var(--muted, #9c8c76); cursor: help; }`;
    document.head.appendChild(style);
    this.span = el('span', 'season-tag');
    $('ageText').after(this.span);
    this.built = true;
  },
  update() {
    if (!this.built) this.build();
    const s = currentSeason();
    this.span.textContent = `${s.icon} ${s.name}`;
    this.span.title = `${describeSeason(s)}\nFin de la saison dans ${Math.ceil(seasonDaysLeft())} jours`;
  },
};
HOOKS.ui.push(() => SeasonUI.update());
