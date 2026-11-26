'use strict';
// =====================================================================
//  Lignée — simulation de parties complètes (outil d'équilibrage)
//  Un joueur automatique enchaîne les vies jusqu'à l'épilogue (et au 100 % en
//  jeu actif), puis l'outil affiche quand chaque jalon est atteint : médiane (min–max).
//
//    node outils/simulation.js [profil] [parties]
//      profil  : actif (défaut) : joue sans s'arrêter, résultats en heures de jeu
//                1h, 3h… : joue N heures par jour et laisse tourner le hors-ligne, résultats en jours
//      parties : nombre de parties jouées en parallèle (défaut 4)
//
//  Durées indicatives : le joueur automatique décide sans délai, vise les sommets
//  qui manquent et prend le premier choix abordable des événements.
//  Compter 1,5 à 2 fois plus pour un humain. Une partie active prend quelques minutes.
// =====================================================================
const fs = require('fs'), path = require('path'), vm = require('vm'), { fork } = require('child_process');

const JEU = path.join(__dirname, '..', 'js');
const FICHIERS = ['data.js', 'game.js', 'sante.js', 'saisons.js', 'foi.js', 'lignee.js', 'evenements.js'];
const PLAFOND = { actif: 400, cal: 365 };   // heures de jeu actif, ou jours

// Une partie, dans un contexte neuf : le moteur et ses modules, sans interface.
function partie(params) {
  const ctx = vm.createContext({
    PARAMS: params,
    UI: { ready: false, ajouterJauge() {}, ajouterMarque() {}, ajouterRessource() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  });
  const src = FICHIERS.map(f => fs.readFileSync(path.join(JEU, f), 'utf8')).join('\n;\n');
  return vm.runInContext(`${src}\n;(${joueur})()`, ctx);
}

// Le joueur automatique. Il s'exécute dans le contexte du jeu (il y voit G, JOBS, tick()…), jamais ici.
function joueur() {
  const H = 3600, SEUIL = 5;   // graines minimum pour faire fleurir l'arbre
  G = defaultState(); for (const f of HOOKS.init) f();

  const TRAIT_PRIO = ['fleur', 'lame', 'temps', 'nuit', 'saintete', 'genie', 'curieux', 'travailleur', 'etoile', 'ambitieux',
    'robuste', 'colosse', 'sombre', 'pieux', 'joyeux', 'neriche', 'charmeur'];
  const rang = id => { const i = TRAIT_PRIO.indexOf(id); return i < 0 ? 99 : i; };
  const choisirTrait = () => chooseTrait([...G.pendingTraits].sort((a, b) => rang(a) - rang(b))[0]);
  // à partir de ce métier, on reste dans la voie jusqu'à son sommet (corruption et foi demandent une vie dédiée)
  const FOCUS = { milice: 'general', arcanes: 'archimage', ombre: 'chefguilde', clerge: 'eveque' };

  const xpEntre = (base, de, a) => { let s = 0; for (let l = de; l < a; l++) s += maxXp(base, l); return s; };
  const meilleurDe = cat => {
    let best = null, bi = -1;
    for (const j of JOBS) if ((!cat || j.cat === cat) && G.unlocked['job:' + j.id]) { const v = jobIncome(j); if (v > bi) { bi = v; best = j; } }
    return best;
  };
  const aDebloquer = e => !G.unlocked[(JOB_BY_ID[e.id] === e ? 'job:' : 'skill:') + e.id] && !isForbidden(e.cat);

  function gerer() {
    let best = null;
    for (const v in FOCUS) {
      if (G.floraison.fleuries[v] || G.floraison.cycle[v] || isForbidden(v)) continue;
      if (G.unlocked['job:' + FOCUS[v]] && !G.unlocked['job:' + SOMMETS[v]]) { best = meilleurDe(v); break; }
    }
    if (!best) {   // le prérequis de métier le plus rapide à atteindre
      let bt = Infinity;
      for (const e of JOBS) {
        if (!aDebloquer(e)) continue;
        for (const r of e.req) {
          if (!r.job || !G.unlocked['job:' + r.job]) continue;
          const ent = G.jobs[r.job]; if (ent.level >= r.level) continue;
          const j = JOB_BY_ID[r.job], t = (xpEntre(j.xp, ent.level, r.level) - ent.xp) / jobXpPerDay(j);
          if (t < bt) { bt = t; best = j; }
        }
      }
    }
    if (!best) for (const e of JOBS) {   // une jauge manque : la voie qui la fait monter
      if (!aDebloquer(e) || !e.req.every(r => r.foi != null || r.corruption != null || reqMet(r))) continue;
      const cat = e.req.some(r => r.foi != null && !reqMet(r)) ? 'clerge' : e.req.some(r => r.corruption != null && !reqMet(r)) ? 'ombre' : null;
      if (cat && (best = meilleurDe(cat))) break;
    }
    if (!best) best = meilleurDe(null);
    if (best) G.currentJob = best.id;

    let cible = null, bt = Infinity;   // compétence : le prérequis le plus rapide, sinon la plus rapide à monter
    for (const e of [...JOBS, ...SKILLS]) {
      if (!aDebloquer(e)) continue;
      for (const r of e.req) {
        if (!r.skill || !G.unlocked['skill:' + r.skill]) continue;
        const ent = G.skills[r.skill]; if (ent.level >= r.level) continue;
        const s = SKILL_BY_ID[r.skill], t = (xpEntre(s.xp, ent.level, r.level) - ent.xp) / skillXpPerDay(s);
        if (t < bt) { bt = t; cible = s; }
      }
    }
    if (!cible) for (const s of SKILLS) if (G.unlocked['skill:' + s.id]) {
      const t = etaSeconds(G.skills[s.id], s.xp, skillXpPerDay(s)); if (t < bt) { bt = t; cible = s; }
    }
    if (cible) G.currentSkill = cible.id;
    autoShop();
  }

  // Événements : l'alliance au meilleur destin, sinon le premier choix abordable
  function repondre() {
    const ev = EVENT_BY_ID[G.event.id], d = G.event.data;
    if (ev.id === 'alliance') return chooseEvent([0, 1, 2].sort((a, b) => rang(d.candidats[a].trait) - rang(d.candidats[b].trait))[0]);
    chooseEvent(Math.max(0, ev.choices.findIndex(c => !c.can || c.can(d))));
  }

  const acheter = (liste, rangDe, cout, solde, achat) => {
    for (;;) {
      const c = liste.filter(p => rangDe(p.id) < p.max && cout(p) <= solde()).sort((a, b) => cout(a) - cout(b));
      if (!c.length) break; achat(c[0].id);
    }
  };
  const toutAcheter = () => {
    acheter(PERKS, perkRank, perkCost, () => G.legacy.points, buyPerk);
    acheter(RACINES, racineRank, racineCost, () => G.floraison.graines, buyRacine);
  };

  // ------------------------------------------------------------ Jalons
  const jalons = {}; let t = 0, jour = 0;
  const noter = cle => { if (!(cle in jalons)) jalons[cle] = { h: +(t / H).toFixed(1), jour, vie: G.legacy.rebirths + 1 }; };
  function observer() {
    for (const j of JOBS) if (G.unlocked['job:' + j.id]) noter('métier ' + j.id);
    if (JOBS.every(j => ('métier ' + j.id) in jalons)) noter('tous les métiers');
    if (Object.keys(G.achievements).length >= ACHIEVEMENTS.length) noter('tous les hauts faits');
    if (Object.keys(G.challengesDone).length >= CHALLENGES.length) noter('tous les défis');
    if (G.conjoint && G.conjoint.trait) noter('1re alliance');
    for (let k = 1; k <= Object.keys(G.floraison.fleuries).length; k++) noter(`voie fleurie ${k}`);
    if (G.floraison.fin) noter('épilogue');
  }

  // Fin d'une vie : fleurir si une nouvelle voie est prête, sinon tenter un défi à portée, sinon transmettre
  function finDeVie() {
    const owned = ITEMS.filter(i => G.items[i.id]);
    if (owned.length) G.relique = owned[owned.length - 1].id;
    const defi = !G.challenge && CHALLENGES.find(c => !G.challengesDone[c.id] && challengeOpen(c) && c.goal());
    G.dead = false;   // en vrai, on transmet puis on fait fleurir au début de la vie suivante : même résultat
    if (floraisonPossible() && grainesPreview() >= SEUIL && (voiesAFleurir().length || G.floraison.fin)) floraison();
    else if (defi) startChallenge(defi.id);
    else rebirth();
    toutAcheter();
    choisirTrait();
  }

  function jouer(secondes, enLigne) {
    // en ligne, le joueur gère tout ; hors-ligne, seuls les serviteurs (talents d'automatisation) agissent
    Object.assign(G.settings, { autoPromote: !enLigne, autoLearn: !enLigne, autoBuy: !enLigne });
    const DT = enLigne ? 1 : 5;
    let vie = 0, repere = 0, ref = 0, n = 0;
    for (let s = 0; s < secondes; s += DT) {
      if (G.dead) { if (!enLigne) break; finDeVie(); vie = repere = ref = 0; }
      if (enLigne) {
        if (G.event) repondre();
        if (n % 2 === 0) gerer();
        if (vie - repere >= H) {   // transmission volontaire : moins de 2 % de points en plus sur la dernière heure
          const p = legacyPointsPreview();
          if (ageYears() >= 30 && p > 0 && p < ref * 1.02) { finDeVie(); vie = repere = ref = 0; continue; }
          ref = p; repere = vie;
        }
      }
      tick(DT, !enLigne);
      vie += DT; if (enLigne) t += DT;
      if (n++ % 20 === 0) observer();
    }
    observer();
  }

  choisirTrait(); checkUnlocks(true);
  if (PARAMS.mode === 'actif') {
    while (t < PARAMS.cap * H && !('épilogue' in jalons && 'tous les défis' in jalons && 'tous les hauts faits' in jalons)) jouer(H, true);
  } else {
    while (jour < PARAMS.cap && !('épilogue' in jalons)) {
      jour++;
      jouer(PARAMS.hpj * H, true);
      jouer(Math.min(24 - PARAMS.hpj, 4 + 4 * perkRank('horstemps')) * H, false);
    }
  }
  return {
    jalons, heures: +(t / H).toFixed(1), jours: jour, vies: G.legacy.rebirths + 1,
    hautsFaitsManquants: ACHIEVEMENTS.filter(a => !G.achievements[a.id]).map(a => a.id),
    defisManquants: CHALLENGES.filter(c => !G.challengesDone[c.id]).map(c => c.id),
  };
}

// ------------------------------------------------------------ Affichage
const JALONS = [
  ['1re alliance', '1re alliance'], ['métier negociant', 'Paysannerie : Négociant'],
  ['métier connetable', 'Milice : Connétable'], ['métier gardien', 'Arcanes : Gardien du Temps'],
  ['métier seigneur', 'Ombre : Seigneur des ombres'], ['métier saint', 'Clergé : Saint'], ['tous les métiers', 'Les 33 métiers'],
  ['voie fleurie 1', '1re voie fleurie'], ['voie fleurie 2', '2e voie fleurie'], ['voie fleurie 3', '3e voie fleurie'],
  ['épilogue', 'Épilogue (4e voie fleurie)'], ['tous les défis', 'Les 12 défis'], ['tous les hauts faits', 'Les 35 hauts faits'],
];
function afficher(parties, cal) {
  const unite = cal ? 'jours' : 'h de jeu';
  const stat = vals => {
    const s = [...vals].sort((a, b) => a - b), med = s[Math.floor((s.length - 1) / 2)];
    return s.length > 1 ? `${med} (${s[0]}–${s[s.length - 1]})` : String(med);
  };
  console.log(`\n| Jalon | ${unite} |\n|---|---|`);
  for (const [cle, nom] of JALONS) {
    const vals = parties.map(p => p.jalons[cle]).filter(Boolean).map(j => (cal ? j.jour : j.h));
    if (!vals.length && cal && (cle.startsWith('tous les d') || cle.startsWith('tous les h'))) continue;   // non mesuré : on s'arrête à l'épilogue
    console.log(`| ${nom} | ${vals.length ? stat(vals) : '—'}${vals.length && vals.length < parties.length ? ` (${vals.length}/${parties.length} parties)` : ''} |`);
  }
  console.log();
  parties.forEach((p, i) => console.log(`Partie ${i + 1} : ${p.heures} h de jeu actif${cal ? `, ${p.jours} jours` : ''}, ${p.vies} vies`
    + (cal ? '' : ` · défis manquants : ${p.defisManquants.join(', ') || 'aucun'} · hauts faits manquants : ${p.hautsFaitsManquants.join(', ') || 'aucun'}`)));
}

// ------------------------------------------------------------ Lancement
if (process.argv[2] === '--partie') {
  process.send(partie(JSON.parse(process.argv[3])), () => process.exit(0));
} else {
  const profil = process.argv[2] || 'actif', n = Math.max(1, parseInt(process.argv[3] || '4', 10));
  const hpj = profil === 'actif' ? 0 : parseFloat(profil);
  if (profil !== 'actif' && !(hpj > 0 && hpj < 24)) { console.error('Profil : actif, ou des heures par jour comme 1h ou 3h.'); process.exit(1); }
  const params = hpj ? { mode: 'cal', hpj, cap: PLAFOND.cal } : { mode: 'actif', cap: PLAFOND.actif };
  console.log(`${n} partie(s) en parallèle, ${hpj ? `${hpj} h de jeu par jour` : 'jeu actif'}. Comptez quelques minutes…`);
  Promise.all(Array.from({ length: n }, () => new Promise((ok, ko) => {
    const c = fork(__filename, ['--partie', JSON.stringify(params)]);
    c.on('message', ok);
    c.on('exit', code => { if (code) ko(new Error(`une partie s'est arrêtée (code ${code})`)); });
  }))).then(parties => afficher(parties, !!hpj), err => { console.error(err.message); process.exit(1); });
}
