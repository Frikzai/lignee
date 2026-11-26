'use strict';
// =====================================================================
//  Lignée — module Foi
//  La foi (0 à 100) monte en servant l'Église (voie Clergé) et retombe sinon,
//  plus vite dans l'Ombre. C'est le contrepoids de la corruption : le Clergé
//  purifie l'âme, et ses revenus grandissent avec la foi.
//  Les métiers de haut rang du Clergé demandent de la foi (req { foi: N }, game.js).
// =====================================================================

const FOI = {
  gainClerge: 3,      // par an, en exerçant un métier du Clergé
  perteOmbre: 3,      // par an, dans l'Ombre
  perte: 1,           // par an, ailleurs
  purification: 2,    // corruption retirée par an au Clergé (en plus de la baisse normale)
};

const foiOf = () => G.foi || 0;
const auClerge = () => JOB_BY_ID[G.currentJob].cat === 'clerge';

HOOKS.init.push(() => { if (G.foi == null) G.foi = 0; });
HOOKS.newLife.push(() => { G.foi = 0; });
HOOKS.tick.push(d => {
  const cat = JOB_BY_ID[G.currentJob].cat, tr = currentTrait();
  const rate = cat === 'clerge' ? FOI.gainClerge * (tr && tr.foi || 1) : cat === 'ombre' ? -FOI.perteOmbre : -FOI.perte;
  G.foi = Math.min(100, Math.max(0, foiOf() + rate * d / DAYS_PER_YEAR));
  if (cat === 'clerge') G.corruption = Math.max(0, G.corruption - FOI.purification * d / DAYS_PER_YEAR);
});
// Revenus du Clergé jusqu'à ×3 (comme la corruption pour l'Ombre), bonheur jusqu'à ×1,2
HOOKS.mult.push(stat => {
  if (stat === 'income:clerge') return 1 + foiOf() / 50;
  if (stat === 'happiness') return 1 + foiOf() / 500;
  return 1;
});

// ------------------------------------------------------------ Événements
const FOI_EVENTS = [
  { id: 'pelerinage', title: 'Le pèlerinage', weight: 2, cond: auClerge,
    init: () => ({}),
    text: () => 'Des pèlerins partent pour un sanctuaire lointain et vous proposent de les accompagner.',
    choices: [
      { label: () => 'Partir 3 mois : foi +20, bonheur ×1,2 (1 an)',
        run: () => { G.days += 90; G.foi = Math.min(100, foiOf() + 20); addBuff('happiness', 1.2, 365, 'Souvenirs du pèlerinage'); return ['Vous revenez transformé.', 'good']; } },
      { label: () => 'Rester à l\'ouvrage', run: () => ['Les cloches n\'attendent pas.', ''] },
    ] },
  { id: 'indulgences', title: 'Le marchand d\'indulgences', weight: 2, cond: () => auClerge() && G.corruption >= 10,
    init: () => ({ gain: Math.max(100, refIncome() * 80) }),
    text: d => `Un collègue vous propose de vendre des indulgences. Bénéfice : ${fmt(d.gain)} écus.`,
    choices: [
      { label: d => `Vendre (+${fmt(d.gain)}) : foi −15`,
        run: d => { G.coins += d.gain; G.foi = Math.max(0, foiOf() - 15); return ['Les écus tintent, la conscience grince.', 'bad']; } },
      { label: () => 'Le dénoncer : foi +10',
        run: () => { G.foi = Math.min(100, foiOf() + 10); return ['L\'évêque vous félicite.', 'good']; } },
    ] },
  { id: 'miracle', title: 'Un miracle ?', weight: 2, cond: () => foiOf() >= 50,
    init: () => ({}),
    text: () => 'Un aveugle affirme avoir recouvré la vue après votre bénédiction. Les fidèles affluent.',
    choices: [
      { label: () => 'Accueillir les fidèles : revenus Clergé ×2 (1 an)',
        run: () => { addBuff('income:clerge', 2, 365, 'Afflux de fidèles'); return ['Les dons pleuvent sur votre église.', 'good']; } },
      { label: () => 'Rester humble : foi +10',
        run: () => { G.foi = Math.min(100, foiOf() + 10); return ['Vous renvoyez le mérite au ciel.', 'good']; } },
    ] },
];
for (const ev of FOI_EVENTS) { EVENTS.push(ev); EVENT_BY_ID[ev.id] = ev; }

// ------------------------------------------------------------- Interface
// Jauge Foi dans la colonne du personnage, cachée tant que le Clergé n'est pas ouvert.
UI.ajouterJauge({
  id: 'foi',
  icone: 'aureole',
  libelle: 'Foi',
  etat: () => {
    const f = foiOf();
    return {
      cache: f <= 0 && !JOBS.some(j => j.cat === 'clerge' && G.unlocked['job:' + j.id]),
      pct: f,
      texte: Math.floor(f) + ' / 100',
      ton: 'bon',
      info: `Revenus Clergé ×${fmtMult(1 + f / 50)}`,
      titre: 'Monte au Clergé, retombe ailleurs (plus vite dans l\'Ombre). Le Clergé purifie la corruption.',
    };
  },
});
