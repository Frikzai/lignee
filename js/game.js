'use strict';
// =====================================================================
//  Lignée — moteur de jeu
// =====================================================================

const byId = list => Object.fromEntries(list.map(x => [x.id, x]));
const JOB_BY_ID = byId(JOBS);
const SKILL_BY_ID = byId(SKILLS);
const HOUSING_BY_ID = byId(HOUSING);
const ITEM_BY_ID = byId(ITEMS);
const PERK_BY_ID = byId(PERKS);
const TRAIT_BY_ID = byId(TRAITS);
const CHALLENGE_BY_ID = byId(CHALLENGES);

const SAVE_KEY = 'lignee_save_v1';
let G = null;
let simulating = false;   // vrai pendant la simulation hors-ligne (pas de toasts)
let resetting = false;
let slowTimer = 0;

// ------------------------------------------------------------- Formatage
const UNITS = ['', 'k', 'M', 'Md', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
function fmt(n) {
  if (!isFinite(n)) return '∞';
  const a = Math.abs(n);
  if (a < 1000) return (a < 100 ? Math.round(n * 10) / 10 : Math.floor(n)).toLocaleString('fr-FR');
  const i = Math.floor(Math.log10(a) / 3);
  if (i >= UNITS.length) return n.toExponential(2);
  return (n / Math.pow(1000, i)).toFixed(2).replace('.', ',') + ' ' + UNITS[i];
}
function fmtMult(v) {
  if (v < 10) return v.toFixed(2).replace('.', ',');
  if (v < 100) return v.toFixed(1).replace('.', ',');
  return fmt(v);
}
function fmtTime(sec) {
  if (!isFinite(sec) || sec > 3.15e7) return '∞';
  if (sec < 1) return '< 1 s';
  const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600),
        m = Math.floor(sec % 3600 / 60), s = Math.floor(sec % 60);
  if (d) return `${d} j ${h} h`;
  if (h) return `${h} h ${m} min`;
  if (m) return `${m} min ${s} s`;
  return `${s} s`;
}
function fmtAge(days) {
  return `${Math.floor(days / DAYS_PER_YEAR)} ans, ${Math.floor(days % DAYS_PER_YEAR)} j`;
}

// ---------------------------------------------------------------- État
function freshEntities(list) {
  const o = {};
  for (const e of list) o[e.id] = { level: 0, xp: 0, maxLevel: 0 };
  return o;
}

function defaultState() {
  return {
    version: 1,
    days: START_AGE * DAYS_PER_YEAR,
    coins: 0,
    lifeBonusYears: 0,
    jobs: freshEntities(JOBS),
    skills: freshEntities(SKILLS),
    currentJob: 'glaneur',
    currentSkill: 'discipline',
    housing: 'etoile',
    items: {},
    unlocked: {},
    buffs: [],
    event: null,
    nextEventIn: 60,
    dead: false,
    paused: false,
    trait: null,
    pendingTraits: rollTraits(),
    corruption: 0,
    challenge: null,
    challengesDone: {},
    tutorial: 0,
    settings: { autoPromote: false, promoteMode: 'categorie', autoLearn: false, learnMode: 'lowest', offline: true, autoBuy: false, buyKeep: 30 },
    legacy: { points: 0, perks: {}, rebirths: 0, totalPoints: 0 },
    achievements: {},
    stats: { totalDays: 0, coinsEarned: 0, bestAge: START_AGE, events: 0, startedAt: Date.now() },
    log: [],
    lastSave: Date.now(),
  };
}

// --------------------------------------------------------- Calculs
const ageYears = () => G.days / DAYS_PER_YEAR;
const perkRank = id => G.legacy.perks[id] || 0;

function getMult(stat) {
  let m = 1;
  for (const s of SKILLS) {
    for (const e of s.effects) {
      if (e.stat !== stat) continue;
      const v = 1 + e.per * G.skills[s.id].level;
      m *= e.inverse ? 1 / v : v;
    }
  }
  if (stat === 'happiness') m *= HOUSING_BY_ID[G.housing].happiness;
  for (const id in G.items) {
    if (!G.items[id]) continue;
    for (const e of ITEM_BY_ID[id].effects) if (e.stat === stat) m *= e.mult;
  }
  for (const p of PERKS) {
    if (p.stat !== stat) continue;
    const v = 1 + p.per * perkRank(p.id);
    m *= p.inverse ? 1 / v : v;
  }
  if (stat === 'xp:all') m *= 1 + 0.02 * Object.keys(G.achievements).length;
  for (const b of G.buffs) if (b.stat === stat) m *= b.mult;
  const tr = currentTrait();
  if (tr) for (const e of tr.effects) if (e.stat === stat) m *= e.mult;
  const ch = currentChallenge();
  if (ch && ch.penalty) for (const e of ch.penalty) if (e.stat === stat) m *= e.mult;
  for (const c of CHALLENGES) {
    if (G.challengesDone[c.id] && c.reward) for (const e of c.reward) if (e.stat === stat) m *= e.mult;
  }
  if (stat === 'income:ombre') m *= 1 + G.corruption / 50;     // jusqu'à ×3
  if (stat === 'happiness') m *= 1 - G.corruption / 250;       // jusqu'à ×0,6
  return m;
}

const currentTrait = () => G.trait ? TRAIT_BY_ID[G.trait] : null;
const currentChallenge = () => G.challenge ? CHALLENGE_BY_ID[G.challenge] : null;
const happiness = () => getMult('happiness');
function legacyMult(entry) {
  const ch = currentChallenge();
  if (ch && ch.noLegacy) return 1;
  return 1 + entry.maxLevel / 10 * (1 + 0.1 * perkRank('destin') + (G.challengesDone.amnesique ? 0.2 : 0));
}
const maxXp = (base, level) => Math.round(base * (level + 1) * Math.pow(1.01, level));

function jobXpPerDay(j) {
  return BASE_XP_PER_DAY * getMult('xp:all') * getMult('xp:jobs') * getMult('xp:' + j.cat)
    * happiness() * legacyMult(G.jobs[j.id]);
}
function skillXpPerDay(s) {
  return BASE_XP_PER_DAY * getMult('xp:all') * getMult('xp:skills') * getMult('xp:' + s.cat)
    * happiness() * legacyMult(G.skills[s.id]);
}
function jobIncome(j) {
  const lvl = G.jobs[j.id].level;
  return j.income * (1 + Math.log10(lvl + 1)) * getMult('income:all') * getMult('income:' + j.cat);
}
const income = () => jobIncome(JOB_BY_ID[G.currentJob]);
function rawExpenses() {
  let c = HOUSING_BY_ID[G.housing].cost;
  for (const id in G.items) if (G.items[id]) c += ITEM_BY_ID[id].cost;
  return c;
}
const expenses = () => rawExpenses() * getMult('expenses');
const netIncome = () => income() - expenses();
const lifespanYears = () => (BASE_LIFESPAN + 5 * perkRank('vigueur') + G.lifeBonusYears) * getMult('lifespan');
let debugSpeed = 1;   // multiplicateur réglé par le panneau de debug (js/debug.js)
const speed = () => BASE_SPEED * getMult('speed') * debugSpeed;
const etaSeconds = (entry, base, xpPerDay) => (maxXp(base, entry.level) - entry.xp) / (xpPerDay * speed());

// ------------------------------------------------------- Prérequis
function reqProgress(r) {
  if (r.job) return { cur: G.jobs[r.job].level, need: r.level, label: JOB_BY_ID[r.job].name };
  if (r.skill) return { cur: G.skills[r.skill].level, need: r.level, label: SKILL_BY_ID[r.skill].name };
  if (r.corruption != null) return { cur: Math.floor(G.corruption), need: r.corruption, label: 'Corruption' };
  return { cur: 0, need: 1, label: '?' };
}
const reqMet = r => { const p = reqProgress(r); return p.cur >= p.need; };

// Catégorie (ou boutique) interdite par le défi en cours ?
function isForbidden(cat) {
  const ch = currentChallenge();
  return !!(ch && ch.forbid && ch.forbid.includes(cat));
}

function checkUnlocks(silent) {
  for (const j of JOBS) {
    const k = 'job:' + j.id;
    if (!G.unlocked[k] && !isForbidden(j.cat) && j.req.every(reqMet)) {
      G.unlocked[k] = true;
      if (!silent && j.req.length) notify(`Nouveau métier disponible : ${j.name}`, 'good');
    }
  }
  for (const s of SKILLS) {
    const k = 'skill:' + s.id;
    if (!G.unlocked[k] && !isForbidden(s.cat) && s.req.every(reqMet)) {
      G.unlocked[k] = true;
      if (!silent && s.req.length) notify(`Nouvelle compétence : ${s.name}`, 'good');
    }
  }
  if (isForbidden('shop')) return;
  const inc = income();
  for (const x of [...HOUSING, ...ITEMS]) {
    const k = 'shop:' + x.id;
    if (!G.unlocked[k] && (x.cost <= Math.max(12, inc * 1.5))) {
      G.unlocked[k] = true;
      if (!silent && x.cost > 0) log(`Nouveauté en boutique : ${x.name}`, '');
    }
  }
}

// ------------------------------------------------------------ Actions
function addXp(entry, base, amount) {
  entry.xp += amount;
  let need = maxXp(base, entry.level);
  while (entry.xp >= need) {
    entry.xp -= need;
    entry.level++;
    need = maxXp(base, entry.level);
  }
}
function addLevels(entry, n) { entry.level += n; }

function setJob(id) { if (G.unlocked['job:' + id]) G.currentJob = id; }
function setSkill(id) { if (G.unlocked['skill:' + id]) G.currentSkill = id; }
function setHousing(id) { if (G.unlocked['shop:' + id] && !isForbidden('shop')) G.housing = id; }
function toggleItem(id) {
  if (!G.unlocked['shop:' + id] || isForbidden('shop')) return;
  if (G.items[id]) delete G.items[id]; else G.items[id] = true;
}
function addBuff(stat, mult, days, name) {
  G.buffs.push({ stat, mult, until: G.days + days, name });
}

function handleDebt() {
  // Amélioration : au lieu de tout perdre, on revend du plus cher au moins cher
  const owned = ITEMS.filter(i => G.items[i.id]).sort((a, b) => b.cost - a.cost);
  for (const it of owned) {
    if (netIncome() >= 0) break;
    delete G.items[it.id];
    notify(`Dettes ! Vous revendez : ${it.name}.`, 'bad');
  }
  if (netIncome() < 0) {
    const idx = HOUSING.findIndex(h => h.id === G.housing);
    for (let i = idx - 1; i >= 0; i--) {
      G.housing = HOUSING[i].id;
      if (netIncome() >= 0) break;
    }
    notify(`Dettes ! Vous déménagez : ${HOUSING_BY_ID[G.housing].name}.`, 'bad');
  }
  G.coins = 0;
}

function autoManage() {
  const st = G.settings;
  if (st.autoPromote && perkRank('intendant')) {
    let best = null;
    if (st.promoteMode === 'revenu') {
      let bi = -1;
      for (const j of JOBS) {
        if (!G.unlocked['job:' + j.id]) continue;
        const inc = jobIncome(j);
        if (inc > bi) { bi = inc; best = j; }
      }
    } else {
      const cur = JOB_BY_ID[G.currentJob];
      const list = JOBS.filter(j => j.cat === cur.cat && G.unlocked['job:' + j.id]);
      const top = list[list.length - 1];
      if (top && JOBS.indexOf(top) > JOBS.indexOf(cur)) best = top;
    }
    if (best && best.id !== G.currentJob) {
      G.currentJob = best.id;
      log(`Promotion automatique : ${best.name}`, 'good');
    }
  }
  if (st.autoLearn && perkRank('precepteur')) {
    const list = SKILLS.filter(s => G.unlocked['skill:' + s.id]);
    let best = null, bv = Infinity;
    for (const s of list) {
      const e = G.skills[s.id];
      const v = st.learnMode === 'fastest' ? etaSeconds(e, s.xp, skillXpPerDay(s)) : e.level;
      if (v < bv) { bv = v; best = s; }
    }
    if (best) G.currentSkill = best.id;
  }
  if (st.autoBuy && perkRank('majordome')) autoShop();
}

// Achat automatique : on améliore le logement puis on achète les possessions,
// tant que le revenu net reste au-dessus du pourcentage de revenu à garder.
function autoShop() {
  if (isForbidden('shop')) return;
  const em = getMult('expenses');
  const keep = G.settings.buyKeep / 100 * income();
  const curIdx = HOUSING.findIndex(h => h.id === G.housing);
  for (let i = HOUSING.length - 1; i > curIdx; i--) {
    const h = HOUSING[i];
    if (!G.unlocked['shop:' + h.id]) continue;
    if (netIncome() + (HOUSING[curIdx].cost - h.cost) * em >= keep) {
      G.housing = h.id;
      log(`Achat auto : ${h.name}`, 'good');
      break;
    }
  }
  for (const it of ITEMS) {
    if (!G.unlocked['shop:' + it.id] || G.items[it.id]) continue;
    if (netIncome() - it.cost * em >= keep) {
      G.items[it.id] = true;
      log(`Achat auto : ${it.name}`, 'good');
    }
  }
}

// --------------------------------------------------- Traits & défis
function rollTraits() {
  const pool = TRAITS.map(t => t.id), out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}
function chooseTrait(id) {
  if (!G.pendingTraits || !G.pendingTraits.includes(id)) return;
  const t = TRAIT_BY_ID[id];
  G.trait = id;
  G.pendingTraits = null;
  if (t.startCoins) G.coins += t.startCoins;
  log(`Trait de naissance : ${t.name} (${t.desc})`, 'gold');
}
function startChallenge(id) {
  if (G.challengesDone[id] || G.challenge === id) return;
  rebirth(id);
}
function abandonChallenge() {
  const ch = currentChallenge();
  if (!ch) return;
  G.challenge = null;
  log(`Défi abandonné : ${ch.name}`, 'bad');
  checkUnlocks(false);
}
function checkChallenge() {
  const ch = currentChallenge();
  if (!ch || !ch.goal()) return;
  G.challengesDone[ch.id] = true;
  G.challenge = null;
  notify(`Défi réussi : ${ch.name} ! ${ch.rewardText}`, 'gold');
}

// ---------------------------------------------------------- Hauts faits
const maxJobLevel = () => Math.max(...JOBS.map(j => G.jobs[j.id].level));
const maxSkillLevel = () => Math.max(...SKILLS.map(s => G.skills[s.id].level));
const ACHIEVEMENTS = [
  { id: 'age25',     name: 'Jeune adulte',        desc: 'Atteindre 25 ans',             check: () => ageYears() >= 25 },
  { id: 'age50',     name: 'Force de l\'âge',     desc: 'Atteindre 50 ans',             check: () => ageYears() >= 50 },
  { id: 'age80',     name: 'Patriarche',          desc: 'Atteindre 80 ans',             check: () => ageYears() >= 80 },
  { id: 'age120',    name: 'Presque immortel',    desc: 'Atteindre 120 ans',            check: () => ageYears() >= 120 },
  { id: 'coins1k',   name: 'Bourse ronde',        desc: 'Posséder 1 000 écus',          check: () => G.coins >= 1e3 },
  { id: 'coins1m',   name: 'Millionnaire',        desc: 'Posséder 1 M d\'écus',         check: () => G.coins >= 1e6 },
  { id: 'coins1b',   name: 'Banquier du roi',     desc: 'Posséder 1 Md d\'écus',        check: () => G.coins >= 1e9 },
  { id: 'job25',     name: 'Compagnon',           desc: 'Un métier au niveau 25',       check: () => maxJobLevel() >= 25 },
  { id: 'job100',    name: 'Maître artisan',      desc: 'Un métier au niveau 100',      check: () => maxJobLevel() >= 100 },
  { id: 'job300',    name: 'Légende vivante',     desc: 'Un métier au niveau 300',      check: () => maxJobLevel() >= 300 },
  { id: 'skill50',   name: 'Studieux',            desc: 'Une compétence au niveau 50',  check: () => maxSkillLevel() >= 50 },
  { id: 'skill200',  name: 'Érudit',              desc: 'Une compétence au niveau 200', check: () => maxSkillLevel() >= 200 },
  { id: 'skill1000', name: 'Omniscient',          desc: 'Une compétence au niveau 1000', check: () => maxSkillLevel() >= 1000 },
  { id: 'manoir',    name: 'Seigneur du domaine', desc: 'Vivre dans un manoir',         check: () => HOUSING.findIndex(h => h.id === G.housing) >= 4 },
  { id: 'chevalier', name: 'Adoubé',              desc: 'Devenir Chevalier',            check: () => !!G.unlocked['job:chevalier'] },
  { id: 'novice',    name: 'Premiers sortilèges', desc: 'Devenir Novice',               check: () => !!G.unlocked['job:novice'] },
  { id: 'archimage', name: 'Au sommet de la tour', desc: 'Devenir Archimage',           check: () => !!G.unlocked['job:archimage'] },
  { id: 'gardien',   name: 'Maître des heures',   desc: 'Devenir Gardien du Temps',     check: () => !!G.unlocked['job:gardien'] },
  { id: 'reb1',      name: 'Héritier',            desc: 'Transmettre un héritage',      check: () => G.legacy.rebirths >= 1 },
  { id: 'reb5',      name: 'Dynastie',            desc: 'Transmettre 5 héritages',      check: () => G.legacy.rebirths >= 5 },
  { id: 'reb20',     name: 'Lignée éternelle',    desc: 'Transmettre 20 héritages',     check: () => G.legacy.rebirths >= 20 },
  { id: 'ev10',      name: 'Aventurier',          desc: 'Vivre 10 événements',          check: () => G.stats.events >= 10 },
  { id: 'ev50',      name: 'Conteur',             desc: 'Vivre 50 événements',          check: () => G.stats.events >= 50 },
  { id: 'assassin',  name: 'Lame dans la nuit',   desc: 'Devenir Assassin',             check: () => !!G.unlocked['job:assassin'] },
  { id: 'seigneur',  name: 'Prince des ténèbres', desc: 'Devenir Seigneur des ombres',  check: () => !!G.unlocked['job:seigneur'] },
  { id: 'corrompu',  name: 'Âme damnée',          desc: 'Atteindre 100 de corruption',  check: () => G.corruption >= 100 },
  { id: 'defi1',     name: 'Relever le gant',     desc: 'Réussir un défi',              check: () => Object.keys(G.challengesDone).length >= 1 },
  { id: 'defiAll',   name: 'Invaincu',            desc: 'Réussir tous les défis',       check: () => Object.keys(G.challengesDone).length >= CHALLENGES.length },
];
function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (!G.achievements[a.id] && a.check()) {
      G.achievements[a.id] = true;
      notify(`Haut fait : ${a.name} (+2 % d'XP)`, 'gold');
    }
  }
}

// ----------------------------------------------------------- Événements
const refIncome = () => Math.max(5, income());
const EVENTS = [
  { id: 'marchand', title: 'Le marchand d\'élixirs', weight: 3, cond: () => true,
    init: () => ({ cost: Math.max(100, refIncome() * 120) }),
    text: d => `Un vieil homme vous tend une fiole irisée : « La jeunesse en bouteille, pour ${fmt(d.cost)} écus. »`,
    choices: [
      { label: d => `Acheter (${fmt(d.cost)}) : +1 an de vie`, can: d => G.coins >= d.cost,
        run: d => { G.coins -= d.cost; G.lifeBonusYears += 1; return ['Une chaleur vous envahit : +1 an d\'espérance de vie.', 'good']; } },
      { label: () => 'Refuser', run: () => ['Le marchand s\'éloigne en haussant les épaules.', ''] },
    ] },
  { id: 'maitre', title: 'Un maître itinérant', weight: 3, cond: () => true,
    init: () => ({ skill: G.currentSkill, cost: Math.max(50, refIncome() * 60) }),
    text: d => `Un maître de passage remarque vos efforts en ${SKILL_BY_ID[d.skill].name} et propose de vous enseigner.`,
    choices: [
      { label: () => 'Leçon gratuite : +1 niveau',
        run: d => { addLevels(G.skills[d.skill], 1); return [`${SKILL_BY_ID[d.skill].name} +1 niveau.`, 'good']; } },
      { label: d => `Leçon intensive (${fmt(d.cost)}) : +5 niveaux`, can: d => G.coins >= d.cost,
        run: d => { G.coins -= d.cost; addLevels(G.skills[d.skill], 5); return [`${SKILL_BY_ID[d.skill].name} +5 niveaux.`, 'good']; } },
    ] },
  { id: 'brigands', title: 'Brigands !', weight: 2, cond: () => ageYears() >= 16,
    init: () => { const f = G.skills.force.level; return { chance: Math.min(0.9, (f + 5) / (f + 60)), reward: Math.max(50, refIncome() * 60) }; },
    text: d => `Des brigands vous barrent la route. Chances de victoire : ${Math.round(d.chance * 100)} % (selon votre Force).`,
    choices: [
      { label: () => 'Combattre',
        run: d => {
          if (Math.random() < d.chance) { G.coins += d.reward; addLevels(G.skills.force, 2); return [`Victoire ! Butin : ${fmt(d.reward)} écus, Force +2.`, 'good']; }
          const loss = G.coins * 0.25; G.coins -= loss; return [`Défaite… Ils vous dérobent ${fmt(loss)} écus.`, 'bad'];
        } },
      { label: () => 'Fuir (perdre 5 % de la bourse)',
        run: () => { const l = G.coins * 0.05; G.coins -= l; return [`Vous fuyez en abandonnant ${fmt(l)} écus.`, '']; } },
    ] },
  { id: 'tresor', title: 'Une carte au trésor', weight: 2, cond: () => true,
    init: () => ({ reward: Math.max(100, refIncome() * 150) }),
    text: () => 'Vous trouvez une carte griffonnée. Creuser vous prendra un mois entier…',
    choices: [
      { label: () => 'Creuser (−30 jours de vie, 55 %)',
        run: d => {
          G.days += 30;
          if (Math.random() < 0.55) { G.coins += d.reward; return [`Un coffre ! +${fmt(d.reward)} écus.`, 'good']; }
          return ['Rien qu\'un vieux soulier…', 'bad'];
        } },
      { label: () => 'Ignorer', run: () => ['Vous jetez la carte au feu.', ''] },
    ] },
  { id: 'festival', title: 'La fête du village', weight: 2, cond: () => true,
    init: () => ({ cost: Math.max(20, refIncome() * 20), bonus: Math.max(20, refIncome() * 15) }),
    text: () => 'Lampions, musique et cidre doux : tout le village est en fête.',
    choices: [
      { label: d => `Festoyer (${fmt(d.cost)}) : bonheur ×1,5 pendant 2 ans`, can: d => G.coins >= d.cost,
        run: d => { G.coins -= d.cost; addBuff('happiness', 1.5, 730, 'Souvenirs de fête'); return ['Quelle fête ! Vous vous sentez léger.', 'good']; } },
      { label: d => `Travailler pendant la fête (+${fmt(d.bonus)})`,
        run: d => { G.coins += d.bonus; return [`Vous empochez ${fmt(d.bonus)} écus pendant que les autres dansent.`, '']; } },
    ] },
  { id: 'contremaitre', title: 'Le contremaître', weight: 2, cond: () => true,
    init: () => ({}),
    text: () => 'Votre supérieur vous propose des heures supplémentaires pendant six mois.',
    choices: [
      { label: () => 'Accepter : XP métiers ×2, bonheur ×0,8 (6 mois)',
        run: () => { addBuff('xp:jobs', 2, 182, 'Heures sup.'); addBuff('happiness', 0.8, 182, 'Fatigue'); return ['Vous retroussez vos manches.', 'good']; } },
      { label: () => 'Refuser poliment', run: () => ['Vous préférez vos soirées.', ''] },
    ] },
  { id: 'reve', title: 'Un rêve étrange', weight: 1, cond: () => G.skills.meditation.level >= 10,
    init: () => ({}),
    text: () => 'Une voix lointaine vous murmure des secrets oubliés…',
    choices: [
      { label: () => 'Méditer : XP compétences ×2 pendant 1 an',
        run: () => { addBuff('xp:skills', 2, 365, 'Rêve lucide'); return ['Votre esprit s\'éclaircit.', 'good']; } },
      { label: () => 'Se rendormir', run: () => ['Le rêve s\'évanouit.', ''] },
    ] },
  { id: 'fievre', title: 'La fièvre des marais', weight: 1, cond: () => ageYears() >= 35,
    init: () => ({ cost: Math.max(100, refIncome() * 90) }),
    text: () => 'Une fièvre vous cloue au lit. Un guérisseur réputé peut vous soigner.',
    choices: [
      { label: d => `Payer le guérisseur (${fmt(d.cost)})`, can: d => G.coins >= d.cost,
        run: d => { G.coins -= d.cost; return ['Vous êtes sur pied en quelques jours.', 'good']; } },
      { label: () => 'Endurer (50 % de perdre 2 ans de vie)',
        run: () => {
          if (Math.random() < 0.5) { G.lifeBonusYears -= 2; return ['La fièvre laisse des séquelles : −2 ans d\'espérance de vie.', 'bad']; }
          return ['Vous vous en remettez seul.', 'good'];
        } },
    ] },
  { id: 'garde', title: 'La garde vous recherche', weight: 3, cond: () => G.corruption >= 15,
    init: () => ({ cost: Math.max(100, refIncome() * 60) }),
    text: () => 'Des affiches portant votre visage fleurissent sur les murs de la ville.',
    choices: [
      { label: d => `Soudoyer le capitaine (${fmt(d.cost)})`, can: d => G.coins >= d.cost,
        run: d => { G.coins -= d.cost; return ['Le capitaine regarde ailleurs.', '']; } },
      { label: () => 'Se rendre : 2 ans de cachot, corruption −30',
        run: () => { G.days += 730; G.corruption = Math.max(0, G.corruption - 30); return ['Deux longues années derrière les barreaux…', 'bad']; } },
      { label: () => 'Fuir (perdre 30 % de la bourse)',
        run: () => { const l = G.coins * 0.3; G.coins -= l; return [`Vous filez en abandonnant ${fmt(l)} écus.`, 'bad']; } },
    ] },
  { id: 'culte', title: 'Le culte des ombres', weight: 2, cond: () => G.corruption >= 40,
    init: () => ({}),
    text: () => 'Des silhouettes encapuchonnées vous convient à une cérémonie sous la lune noire.',
    choices: [
      { label: () => 'Rejoindre : XP Ombre et Ténèbres ×2 (1 an), corruption +15',
        run: () => {
          addBuff('xp:ombre', 2, 365, 'Bénédiction noire'); addBuff('xp:tenebres', 2, 365, 'Savoir interdit');
          G.corruption = Math.min(100, G.corruption + 15);
          return ['Les ténèbres vous accueillent.', 'event'];
        } },
      { label: () => 'Décliner', run: () => ['Vous rentrez chez vous en frissonnant.', ''] },
    ] },
  { id: 'pretre', title: 'Un prêtre errant', weight: 2, cond: () => G.corruption >= 25,
    init: () => ({ cost: Math.max(50, refIncome() * 30) }),
    text: () => 'Un prêtre lit la noirceur dans vos yeux et vous propose la pénitence.',
    choices: [
      { label: d => `Faire pénitence (${fmt(d.cost)}) : corruption −20`, can: d => G.coins >= d.cost,
        run: d => { G.coins -= d.cost; G.corruption = Math.max(0, G.corruption - 20); return ['Vous vous sentez plus léger.', 'good']; } },
      { label: () => 'Le chasser (corruption +5)',
        run: () => { G.corruption = Math.min(100, G.corruption + 5); return ['Il s\'éloigne en priant pour vous.', '']; } },
    ] },
];
const EVENT_BY_ID = byId(EVENTS);

function scheduleEvent() { G.nextEventIn = 90 + Math.random() * 150; }
function spawnEvent() {
  const pool = EVENTS.filter(e => e.cond());
  let r = Math.random() * pool.reduce((s, e) => s + e.weight, 0);
  const ev = pool.find(e => (r -= e.weight) < 0) || pool[0];
  G.event = { id: ev.id, data: ev.init(), expires: 60, uid: Date.now() };
  notify(`Événement : ${ev.title}`, 'event');
}
function updateEvents(dt) {
  if (G.event) {
    G.event.expires -= dt;
    if (G.event.expires <= 0) {
      log(`Occasion manquée : ${EVENT_BY_ID[G.event.id].title}`, '');
      G.event = null;
      scheduleEvent();
    }
  } else if ((G.nextEventIn -= dt) <= 0) {
    spawnEvent();
  }
}
function chooseEvent(i) {
  if (!G.event || G.dead) return;
  const ev = EVENT_BY_ID[G.event.id], c = ev.choices[i], d = G.event.data;
  if (c.can && !c.can(d)) return;
  const [msg, type] = c.run(d);
  notify(`${ev.title} — ${msg}`, type);
  G.stats.events++;
  G.event = null;
  scheduleEvent();
}

// --------------------------------------------------------------- Boucle
function tick(dt, offline = false) {
  if (G.dead || G.paused || G.pendingTraits) return;
  const d = dt * speed();
  G.days += d;
  G.stats.totalDays += d;

  const j = JOB_BY_ID[G.currentJob], s = SKILL_BY_ID[G.currentSkill];

  // Corruption : monte en travaillant dans l'Ombre, redescend sinon
  const tr = currentTrait(), ch = currentChallenge();
  let rate = j.cat === 'ombre' ? 3 * (tr && tr.corruption || 1) : (ch && ch.noDecay ? 0 : -1);
  G.corruption = Math.min(100, Math.max(0, G.corruption + rate * d / DAYS_PER_YEAR));

  addXp(G.jobs[j.id], j.xp, jobXpPerDay(j) * d);
  addXp(G.skills[s.id], s.xp, skillXpPerDay(s) * d);

  const net = netIncome() * d;
  G.coins += net;
  if (net > 0) G.stats.coinsEarned += net;
  if (G.coins < 0) handleDebt();

  if (G.buffs.length) G.buffs = G.buffs.filter(b => b.until > G.days);

  slowTimer += dt;
  if (slowTimer >= 0.5) {
    slowTimer = 0;
    checkUnlocks(false);
    checkChallenge();
    autoManage();
    checkAchievements();
  }
  if (!offline) updateEvents(dt);
  if (ageYears() >= lifespanYears()) die();
}

function simulateOffline(seconds) {
  const before = { days: G.days, coins: G.coins, levels: sumLevels() };
  simulating = true;
  const step = Math.max(0.5, seconds / 20000);
  let remaining = seconds;
  while (remaining > 0 && !G.dead && !G.paused && !G.pendingTraits) {
    const dt = Math.min(step, remaining);
    tick(dt, true);
    remaining -= dt;
  }
  simulating = false;
  return { days: G.days - before.days, coins: G.coins - before.coins, levels: sumLevels() - before.levels };
}

// ---------------------------------------------------- Mort & héritage
function sumLevels() {
  let s = 0;
  for (const id in G.jobs) s += G.jobs[id].level;
  for (const id in G.skills) s += G.skills[id].level;
  return s;
}
const legacyPointsPreview = () => Math.floor(Math.pow(sumLevels() / 40, 0.85));
const startCoins = () => perkRank('fortune') ? 50 * Math.pow(10, perkRank('fortune')) : 0;
const perkCost = p => Math.ceil(p.base * Math.pow(p.growth, perkRank(p.id)));

function die() {
  G.dead = true;
  G.stats.bestAge = Math.max(G.stats.bestAge, ageYears());
  log(`Vous vous éteignez paisiblement à ${Math.floor(ageYears())} ans.`, 'bad');
  const ch = currentChallenge();
  if (ch) log(`Défi échoué : ${ch.name}`, 'bad');
  if (typeof UI !== 'undefined' && UI.ready) UI.showDeath();
}

function rebirth(challengeId = null) {
  const pts = legacyPointsPreview();
  G.legacy.points += pts;
  G.legacy.totalPoints += pts;
  G.legacy.rebirths++;
  G.stats.bestAge = Math.max(G.stats.bestAge, ageYears());
  for (const group of [G.jobs, G.skills]) {
    for (const id in group) {
      const e = group[id];
      e.maxLevel = Math.max(e.maxLevel, e.level);
      e.level = 0; e.xp = 0;
    }
  }
  Object.assign(G, {
    days: START_AGE * DAYS_PER_YEAR, coins: startCoins(), lifeBonusYears: 0,
    currentJob: 'glaneur', currentSkill: 'discipline', housing: 'etoile', items: {},
    unlocked: {}, buffs: [], event: null, dead: false,
    trait: null, pendingTraits: rollTraits(), corruption: 0, challenge: challengeId,
  });
  scheduleEvent();
  checkUnlocks(true);
  log(`Une nouvelle vie commence. +${pts} point(s) d'héritage.`, 'gold');
  if (challengeId) log(`Défi commencé : ${CHALLENGE_BY_ID[challengeId].name}`, 'event');
  save();
}

function buyPerk(id) {
  const p = PERK_BY_ID[id], cost = perkCost(p);
  if (perkRank(id) >= p.max || G.legacy.points < cost) return;
  G.legacy.points -= cost;
  G.legacy.perks[id] = perkRank(id) + 1;
  if (p.setting) G.settings[p.setting] = true;   // talent d'automatisation : activé d'office
  log(`Talent acquis : ${p.name} (rang ${perkRank(id)})`, 'gold');
}

// ------------------------------------------------------- Journal
function log(msg, type) {
  G.log.unshift({ age: Math.floor(ageYears()), msg, type });
  if (G.log.length > 150) G.log.length = 150;
}
function notify(msg, type) {
  log(msg, type);
  if (!simulating && typeof UI !== 'undefined' && UI.ready) UI.toast(msg, type);
}

// ---------------------------------------------------------- Sauvegarde
function mergeDeep(def, src) {
  for (const k in src) {
    const a = def[k], b = src[k];
    if (b && typeof b === 'object' && !Array.isArray(b) && a && typeof a === 'object' && !Array.isArray(a)) def[k] = mergeDeep(a, b);
    else def[k] = b;
  }
  return def;
}
function save() {
  if (resetting || !G) return;
  G.lastSave = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* stockage indisponible */ }
}
function load() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { /* ignore */ }
  if (!raw) { G = defaultState(); return 0; }
  try {
    G = mergeDeep(defaultState(), JSON.parse(raw));
    return Math.max(0, (Date.now() - G.lastSave) / 1000);
  } catch (e) {
    G = defaultState();
    return 0;
  }
}
function exportSave() { return btoa(unescape(encodeURIComponent(JSON.stringify(G)))); }
function importSave(text) {
  const data = JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
  G = mergeDeep(defaultState(), data);
  G.lastSave = Date.now();
  save();
}
function hardReset() {
  resetting = true;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  location.reload();
}

// ---------------------------------------------------------- Démarrage
function main() {
  const away = load();
  checkUnlocks(true);
  let report = null;
  if (away > 10 && G.settings.offline && !G.dead && !G.paused) {
    const cap = (4 + 4 * perkRank('horstemps')) * 3600;
    report = simulateOffline(Math.min(away, cap));
    report.away = away;
    report.capped = away > cap;
    report.cap = cap;
  }
  UI.init();
  if (report && !G.dead && !G.pendingTraits) UI.showOffline(report);

  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    if (dt > 5) simulateOffline(dt);   // onglet en arrière-plan / mise en veille
    else tick(dt);
  }, 50);
  setInterval(() => UI.update(), 100);
  setInterval(save, 10000);
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
}
