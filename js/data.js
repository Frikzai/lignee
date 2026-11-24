'use strict';
// =====================================================================
//  Lignée — données du jeu (métiers, compétences, boutique, talents…)
// =====================================================================

const DAYS_PER_YEAR = 365;
const START_AGE = 14;          // âge de départ (années)
const BASE_LIFESPAN = 70;      // espérance de vie de base (années)
const BASE_SPEED = 2.5;      // jours de jeu par seconde réelle
const BASE_XP_PER_DAY = 10;    // XP gagnée par jour de jeu avant multiplicateurs

// ---------------------------------------------------------------- Métiers
const JOB_CATS = {
  paysannerie: { name: 'Paysannerie', color: '#6fae5a' },
  milice:      { name: 'Milice',      color: '#c8553d' },
  arcanes:     { name: 'Arcanes',     color: '#8a6fd1' },
  ombre:       { name: 'Ombre',       color: '#7d8a9c' },
};

const JOBS = [
  { id: 'glaneur',   cat: 'paysannerie', name: 'Glaneur',   income: 5,   xp: 50,   req: [],
    desc: 'Ramasser ce que les autres laissent dans les champs.' },
  { id: 'bucheron',  cat: 'paysannerie', name: 'Bûcheron',  income: 9,   xp: 100,  req: [{ job: 'glaneur', level: 10 }],
    desc: 'La hache, le froid et les ampoules.' },
  { id: 'pecheur',   cat: 'paysannerie', name: 'Pêcheur',   income: 15,  xp: 200,  req: [{ job: 'bucheron', level: 10 }],
    desc: 'Patience au bord de la rivière.' },
  { id: 'mineur',    cat: 'paysannerie', name: 'Mineur',    income: 40,  xp: 400,  req: [{ job: 'pecheur', level: 10 }, { skill: 'force', level: 10 }],
    desc: 'Arracher le fer aux entrailles de la montagne.' },
  { id: 'artisan',   cat: 'paysannerie', name: 'Artisan',   income: 80,  xp: 800,  req: [{ job: 'mineur', level: 10 }, { skill: 'discipline', level: 30 }],
    desc: 'Façonner des objets que l\'on s\'arrache au marché.' },
  { id: 'negociant', cat: 'paysannerie', name: 'Négociant', income: 150, xp: 1600, req: [{ job: 'artisan', level: 10 }, { skill: 'negoce', level: 50 }],
    desc: 'Acheter bas, vendre haut, sourire toujours.' },

  { id: 'recrue',     cat: 'milice', name: 'Recrue',     income: 5,     xp: 100,   req: [{ skill: 'force', level: 5 }],
    desc: 'On vous a donné une lance. Et des corvées.' },
  { id: 'garde',      cat: 'milice', name: 'Garde',      income: 50,    xp: 1000,  req: [{ job: 'recrue', level: 10 }, { skill: 'force', level: 20 }],
    desc: 'Veiller sur les remparts, nuit après nuit.' },
  { id: 'veteran',    cat: 'milice', name: 'Vétéran',    income: 120,   xp: 1e4,   req: [{ job: 'garde', level: 10 }, { skill: 'force', level: 40 }],
    desc: 'Des cicatrices et des histoires à raconter.' },
  { id: 'chevalier',  cat: 'milice', name: 'Chevalier',  income: 300,   xp: 1e5,   req: [{ job: 'veteran', level: 10 }, { skill: 'tactique', level: 40 }],
    desc: 'Adoubé, armuré, respecté.' },
  { id: 'capitaine',  cat: 'milice', name: 'Capitaine',  income: 1000,  xp: 1e6,   req: [{ job: 'chevalier', level: 10 }, { skill: 'tactique', level: 80 }, { skill: 'force', level: 100 }],
    desc: 'Cent épées obéissent à votre voix.' },
  { id: 'general',    cat: 'milice', name: 'Général',    income: 3000,  xp: 7.5e6, req: [{ job: 'capitaine', level: 10 }, { skill: 'tactique', level: 150 }],
    desc: 'Les batailles se gagnent sur la carte.' },
  { id: 'connetable', cat: 'milice', name: 'Connétable', income: 15000, xp: 4e7,   req: [{ job: 'general', level: 10 }, { skill: 'tactique', level: 250 }, { skill: 'force', level: 300 }],
    desc: 'Le bras armé du royaume.' },

  { id: 'novice',     cat: 'arcanes', name: 'Novice',           income: 100,    xp: 1e5,  req: [{ skill: 'mana', level: 30 }],
    desc: 'Balayer la tour et recopier des grimoires.' },
  { id: 'alchimiste', cat: 'arcanes', name: 'Alchimiste',       income: 1000,   xp: 1e6,  req: [{ job: 'novice', level: 10 }, { skill: 'mana', level: 100 }],
    desc: 'Le plomb n\'a qu\'à bien se tenir.' },
  { id: 'enchanteur', cat: 'arcanes', name: 'Enchanteur',       income: 7500,   xp: 1e7,  req: [{ job: 'alchimiste', level: 10 }, { skill: 'mana', level: 200 }],
    desc: 'Insuffler la magie dans l\'acier et la pierre.' },
  { id: 'sage',       cat: 'arcanes', name: 'Sage',             income: 15000,  xp: 1e8,  req: [{ job: 'enchanteur', level: 10 }, { skill: 'mana', level: 350 }, { skill: 'meditation', level: 300 }],
    desc: 'Les rois viennent vous demander conseil.' },
  { id: 'archimage',  cat: 'arcanes', name: 'Archimage',        income: 50000,  xp: 1e9,  req: [{ job: 'sage', level: 10 }, { skill: 'mana', level: 500 }],
    desc: 'Le sommet de la tour vous appartient.' },
  { id: 'gardien',    cat: 'arcanes', name: 'Gardien du Temps', income: 250000, xp: 1e10, req: [{ job: 'archimage', level: 10 }, { skill: 'chronomancie', level: 200 }],
    desc: 'Les années ne sont plus qu\'un fleuve que vous remontez.' },

  { id: 'tirelaine',     cat: 'ombre', name: 'Tire-laine',           income: 8,      xp: 80,    req: [{ skill: 'discretion', level: 5 }],
    desc: 'Une bourse par-ci, une bourse par-là. Fait monter la corruption.' },
  { id: 'contrebandier', cat: 'ombre', name: 'Contrebandier',        income: 60,     xp: 1200,  req: [{ job: 'tirelaine', level: 10 }, { skill: 'discretion', level: 25 }],
    desc: 'Le sel et le vin passent mieux sans taxes.' },
  { id: 'voleur',        cat: 'ombre', name: 'Monte-en-l\'air',      income: 200,    xp: 2e4,   req: [{ job: 'contrebandier', level: 10 }, { skill: 'discretion', level: 50 }],
    desc: 'Les toits de la ville sont votre royaume.' },
  { id: 'assassin',      cat: 'ombre', name: 'Assassin',             income: 800,    xp: 3e5,   req: [{ job: 'voleur', level: 10 }, { skill: 'cruaute', level: 60 }, { skill: 'force', level: 50 }],
    desc: 'Un contrat, une lame, aucun témoin.' },
  { id: 'chefguilde',    cat: 'ombre', name: 'Chef de guilde',       income: 4000,   xp: 5e6,   req: [{ job: 'assassin', level: 10 }, { skill: 'discretion', level: 150 }],
    desc: 'La pègre entière vous doit allégeance.' },
  { id: 'necromancien',  cat: 'ombre', name: 'Nécromancien',         income: 20000,  xp: 8e7,   req: [{ job: 'chefguilde', level: 10 }, { skill: 'magienoire', level: 200 }, { corruption: 60 }],
    desc: 'Les morts travaillent gratuitement.' },
  { id: 'seigneur',      cat: 'ombre', name: 'Seigneur des ombres',  income: 120000, xp: 2e9,   req: [{ job: 'necromancien', level: 10 }, { skill: 'magienoire', level: 400 }, { corruption: 90 }],
    desc: 'Même la nuit vous obéit.' },
];

// ------------------------------------------------------------ Compétences
const SKILL_CATS = {
  fondamentaux: { name: 'Fondamentaux', color: '#d4a64a' },
  combat:       { name: 'Combat',       color: '#c8553d' },
  mystique:     { name: 'Mystique',     color: '#8a6fd1' },
  tenebres:     { name: 'Ténèbres',     color: '#7d8a9c' },
};

// effects: per = gain par niveau (multiplicateur 1 + per × niveau) ; inverse = réduction
const SKILLS = [
  { id: 'discipline', cat: 'fondamentaux', name: 'Discipline', xp: 100, req: [],
    effects: [{ stat: 'xp:skills', per: 0.01 }], desc: 'Apprendre à apprendre.' },
  { id: 'assiduite',  cat: 'fondamentaux', name: 'Assiduité',  xp: 100, req: [{ skill: 'discipline', level: 5 }],
    effects: [{ stat: 'xp:jobs', per: 0.01 }], desc: 'Arriver tôt, partir tard.' },
  { id: 'labeur',     cat: 'fondamentaux', name: 'Labeur',     xp: 100, req: [{ skill: 'discipline', level: 10 }],
    effects: [{ stat: 'income:paysannerie', per: 0.01 }], desc: 'Le travail bien fait paie mieux.' },
  { id: 'negoce',     cat: 'fondamentaux', name: 'Négoce',     xp: 100, req: [{ skill: 'discipline', level: 20 }],
    effects: [{ stat: 'expenses', per: 0.01, inverse: true }], desc: 'Tout se marchande.' },

  { id: 'force',     cat: 'combat', name: 'Force',     xp: 100, req: [],
    effects: [{ stat: 'income:milice', per: 0.01 }], desc: 'Soulever, frapper, tenir.' },
  { id: 'tactique',  cat: 'combat', name: 'Tactique',  xp: 100, req: [{ skill: 'discipline', level: 20 }, { job: 'recrue', level: 5 }],
    effects: [{ stat: 'xp:milice', per: 0.01 }], desc: 'Gagner avant même de combattre.' },
  { id: 'endurance', cat: 'combat', name: 'Endurance', xp: 300, req: [{ skill: 'force', level: 40 }],
    effects: [{ stat: 'lifespan', per: 0.0005 }], desc: 'Un corps entretenu dure plus longtemps.' },

  { id: 'meditation',    cat: 'mystique', name: 'Méditation',       xp: 100,  req: [{ skill: 'discipline', level: 30 }],
    effects: [{ stat: 'happiness', per: 0.005 }], desc: 'La paix intérieure rend tout plus doux.' },
  { id: 'mana',          cat: 'mystique', name: 'Maîtrise du mana', xp: 500,  req: [{ skill: 'discipline', level: 100 }, { skill: 'meditation', level: 50 }],
    effects: [{ stat: 'xp:arcanes', per: 0.01 }], desc: 'Sentir le flux invisible du monde.' },
  { id: 'vitalite',      cat: 'mystique', name: 'Vitalité',         xp: 1000, req: [{ skill: 'mana', level: 50 }],
    effects: [{ stat: 'lifespan', per: 0.001 }], desc: 'Le mana répare ce que le temps abîme.' },
  { id: 'transmutation', cat: 'mystique', name: 'Transmutation',    xp: 2000, req: [{ job: 'alchimiste', level: 10 }],
    effects: [{ stat: 'income:arcanes', per: 0.01 }], desc: 'Changer le vil en précieux.' },
  { id: 'chronomancie',  cat: 'mystique', name: 'Chronomancie',     xp: 5000, req: [{ job: 'enchanteur', level: 10 }, { skill: 'mana', level: 300 }],
    effects: [{ stat: 'speed', per: 0.001 }], desc: 'Plier les secondes à sa volonté.' },

  { id: 'discretion', cat: 'tenebres', name: 'Discrétion',   xp: 100,  req: [{ skill: 'discipline', level: 15 }],
    effects: [{ stat: 'income:ombre', per: 0.01 }], desc: 'Passer inaperçu, toujours.' },
  { id: 'cruaute',    cat: 'tenebres', name: 'Cruauté',      xp: 300,  req: [{ job: 'tirelaine', level: 10 }],
    effects: [{ stat: 'xp:ombre', per: 0.01 }], desc: 'La pitié est un luxe.' },
  { id: 'magienoire', cat: 'tenebres', name: 'Magie noire',  xp: 1000, req: [{ skill: 'discretion', level: 50 }, { corruption: 20 }],
    effects: [{ stat: 'xp:all', per: 0.003 }], desc: 'Un savoir interdit, terriblement efficace.' },
  { id: 'pacte',      cat: 'tenebres', name: 'Pacte de sang', xp: 3000, req: [{ skill: 'magienoire', level: 100 }, { corruption: 50 }],
    effects: [{ stat: 'lifespan', per: 0.001 }], desc: 'Quelques années volées à d\'autres.' },
];

// ---------------------------------------------------------------- Boutique
const HOUSING = [
  { id: 'etoile',    name: 'À la belle étoile', cost: 0,      happiness: 1 },
  { id: 'cabane',    name: 'Cabane',            cost: 15,     happiness: 1.4 },
  { id: 'chaumiere', name: 'Chaumière',         cost: 100,    happiness: 2 },
  { id: 'maison',    name: 'Maison bourgeoise', cost: 1500,   happiness: 3.5 },
  { id: 'manoir',    name: 'Manoir',            cost: 15000,  happiness: 6 },
  { id: 'chateau',   name: 'Château',           cost: 300000, happiness: 12 },
  { id: 'palais',    name: 'Palais céleste',    cost: 5e6,    happiness: 25 },
];

const ITEMS = [
  { id: 'livre',        name: 'Livre usé',            cost: 10,     effects: [{ stat: 'xp:skills', mult: 1.5 }] },
  { id: 'outils',       name: 'Outils de qualité',    cost: 25,     effects: [{ stat: 'income:paysannerie', mult: 1.5 }] },
  { id: 'pierres',      name: 'Pierres d\'entraînement', cost: 50,  effects: [{ stat: 'xp:combat', mult: 2 }] },
  { id: 'cheval',       name: 'Cheval de selle',      cost: 400,    effects: [{ stat: 'xp:milice', mult: 1.5 }] },
  { id: 'serviteur',    name: 'Serviteur',            cost: 2000,   effects: [{ stat: 'happiness', mult: 1.5 }] },
  { id: 'grimoire',     name: 'Grimoire ancien',      cost: 5000,   effects: [{ stat: 'xp:mystique', mult: 1.5 }] },
  { id: 'atelier',      name: 'Atelier alchimique',   cost: 25000,  effects: [{ stat: 'xp:arcanes', mult: 2 }] },
  { id: 'bibliotheque', name: 'Bibliothèque privée',  cost: 1e5,    effects: [{ stat: 'xp:skills', mult: 1.5 }] },
  { id: 'jardin',       name: 'Jardin des simples',   cost: 1e6,    effects: [{ stat: 'lifespan', mult: 1.1 }] },
  { id: 'observatoire', name: 'Observatoire',         cost: 2e7,    effects: [{ stat: 'xp:all', mult: 2 }] },
];

// ---------------------------------------------------- Talents d'héritage
const PERKS = [
  { id: 'intendant',  name: 'Intendant',  desc: 'Débloque la promotion automatique des métiers',  max: 1, base: 5,  growth: 1, setting: 'autoPromote' },
  { id: 'precepteur', name: 'Précepteur', desc: 'Débloque l\'apprentissage automatique des compétences', max: 1, base: 8,  growth: 1, setting: 'autoLearn' },
  { id: 'majordome',  name: 'Majordome',  desc: 'Débloque l\'achat automatique en boutique',       max: 1, base: 12, growth: 1, setting: 'autoBuy' },
  { id: 'memoire',  name: 'Mémoire ancestrale', desc: '+15 % d\'XP (tout) par rang',               max: 20, base: 1, growth: 1.4, stat: 'xp:all', per: 0.15 },
  { id: 'vigueur',   name: 'Sang vigoureux',     desc: '+5 ans d\'espérance de vie par rang',        max: 10, base: 2, growth: 1.5 },
  { id: 'prodige',   name: 'Prodige',            desc: '+25 % d\'XP de compétences par rang',        max: 10, base: 2, growth: 1.5, stat: 'xp:skills', per: 0.25 },
  { id: 'heritier',  name: 'Héritier',           desc: '+20 % de revenus par rang',                  max: 10, base: 2, growth: 1.5, stat: 'income:all', per: 0.2 },
  { id: 'mecene',    name: 'Mécène',             desc: '−5 % de dépenses par rang',                  max: 8,  base: 3, growth: 1.5, stat: 'expenses', per: 0.05, inverse: true },
  { id: 'fortune',   name: 'Fortune familiale',  desc: 'Chaque vie commence avec un pécule (×10 par rang)', max: 6, base: 3, growth: 2 },
  { id: 'destin',    name: 'Fil du destin',      desc: 'Multiplicateurs d\'héritage +10 % par rang', max: 10, base: 5, growth: 1.6 },
  { id: 'sablier',   name: 'Sablier',            desc: '+10 % de vitesse du temps par rang',         max: 5,  base: 8, growth: 2,   stat: 'speed', per: 0.1 },
  { id: 'horstemps', name: 'Hors du temps',      desc: '+4 h de progression hors-ligne par rang',    max: 5,  base: 2, growth: 1.5 },
];

const STAT_LABELS = {
  'xp:all': 'XP (tout)', 'xp:jobs': 'XP métiers', 'xp:skills': 'XP compétences',
  'xp:paysannerie': 'XP Paysannerie', 'xp:milice': 'XP Milice', 'xp:arcanes': 'XP Arcanes',
  'xp:fondamentaux': 'XP Fondamentaux', 'xp:combat': 'XP Combat', 'xp:mystique': 'XP Mystique',
  'income:all': 'revenus', 'income:paysannerie': 'revenus Paysannerie', 'income:milice': 'revenus Milice',
  'income:arcanes': 'revenus Arcanes', 'happiness': 'bonheur', 'lifespan': 'espérance de vie',
  'speed': 'vitesse du temps', 'expenses': 'dépenses',
  'xp:ombre': 'XP Ombre', 'xp:tenebres': 'XP Ténèbres', 'income:ombre': 'revenus Ombre',
};

// ------------------------------------------------------ Traits de naissance
// Un trait est tiré parmi 3 au début de chaque vie.
const TRAITS = [
  { id: 'robuste',     name: 'Robuste',            desc: 'Espérance de vie ×1,15',                      effects: [{ stat: 'lifespan', mult: 1.15 }] },
  { id: 'curieux',     name: 'Curieux',            desc: 'XP compétences ×1,5',                         effects: [{ stat: 'xp:skills', mult: 1.5 }] },
  { id: 'travailleur', name: 'Travailleur',        desc: 'XP métiers ×1,4',                             effects: [{ stat: 'xp:jobs', mult: 1.4 }] },
  { id: 'neriche',     name: 'Né riche',           desc: 'Commence avec 2 000 écus, dépenses ×0,9',     effects: [{ stat: 'expenses', mult: 0.9 }], startCoins: 2000 },
  { id: 'charmeur',    name: 'Beau parleur',       desc: 'Dépenses ×0,75',                              effects: [{ stat: 'expenses', mult: 0.75 }] },
  { id: 'colosse',     name: 'Colosse',            desc: 'XP Combat ×2, XP Mystique ×0,7',              effects: [{ stat: 'xp:combat', mult: 2 }, { stat: 'xp:mystique', mult: 0.7 }] },
  { id: 'etoile',      name: 'Né sous une étoile', desc: 'XP Mystique ×1,75, XP Arcanes ×1,25',         effects: [{ stat: 'xp:mystique', mult: 1.75 }, { stat: 'xp:arcanes', mult: 1.25 }] },
  { id: 'joyeux',      name: 'Joyeux',             desc: 'Bonheur ×1,3',                                effects: [{ stat: 'happiness', mult: 1.3 }] },
  { id: 'ambitieux',   name: 'Ambitieux',          desc: 'Revenus ×1,3, bonheur ×0,85',                 effects: [{ stat: 'income:all', mult: 1.3 }, { stat: 'happiness', mult: 0.85 }] },
  { id: 'sombre',      name: 'Âme sombre',         desc: 'XP Ombre et Ténèbres ×1,75, corruption ×2',   effects: [{ stat: 'xp:ombre', mult: 1.75 }, { stat: 'xp:tenebres', mult: 1.75 }], corruption: 2 },
  { id: 'genie',       name: 'Génie fragile',      desc: 'XP (tout) ×1,3, espérance de vie ×0,85',      effects: [{ stat: 'xp:all', mult: 1.3 }, { stat: 'lifespan', mult: 0.85 }] },
  { id: 'pieux',       name: 'Pieux',              desc: 'Bonheur ×1,15, corruption ×0,5',              effects: [{ stat: 'happiness', mult: 1.15 }], corruption: 0.5 },
];

// --------------------------------------------------------------------- Défis
// forbid : catégories (ou 'shop') interdites ; penalty : malus pendant le défi ;
// reward : bonus permanent une fois l'objectif atteint.
const CHALLENGES = [
  { id: 'ascete', name: 'Ascète', rules: 'La boutique est interdite : ni logement, ni possessions.',
    goalText: 'Débloquer le métier Artisan', goal: () => !!G.unlocked['job:artisan'],
    forbid: ['shop'], reward: [{ stat: 'happiness', mult: 1.25 }], rewardText: 'Bonheur ×1,25 pour toujours' },
  { id: 'ephemere', name: 'Vie éphémère', rules: 'Votre espérance de vie est divisée par 2.',
    goalText: 'Débloquer le métier Négociant', goal: () => !!G.unlocked['job:negociant'],
    penalty: [{ stat: 'lifespan', mult: 0.5 }], reward: [{ stat: 'lifespan', mult: 1.1 }], rewardText: 'Espérance de vie ×1,1 pour toujours' },
  { id: 'pauvrete', name: 'Vœu de pauvreté', rules: 'Tous vos revenus sont divisés par 4.',
    goalText: 'Posséder 100 k écus', goal: () => G.coins >= 1e5, progress: () => `${fmt(G.coins)} / 100 k écus`,
    penalty: [{ stat: 'income:all', mult: 0.25 }], reward: [{ stat: 'income:all', mult: 1.25 }], rewardText: 'Revenus ×1,25 pour toujours' },
  { id: 'amnesique', name: 'Amnésique', rules: 'Vos multiplicateurs d\'héritage sont désactivés.',
    goalText: 'Débloquer le métier Vétéran', goal: () => !!G.unlocked['job:veteran'],
    noLegacy: true, rewardText: 'Multiplicateurs d\'héritage +20 % pour toujours' },
  { id: 'pacifiste', name: 'Pacifiste', rules: 'Milice, Ombre et compétences de Combat interdites.',
    goalText: 'Débloquer le métier Novice', goal: () => !!G.unlocked['job:novice'],
    forbid: ['milice', 'ombre', 'combat'], reward: [{ stat: 'xp:arcanes', mult: 1.5 }], rewardText: 'XP Arcanes ×1,5 pour toujours' },
  { id: 'renegat', name: 'Renégat', rules: 'Milice et Arcanes interdites. La corruption ne redescend jamais.',
    goalText: 'Débloquer le métier Assassin', goal: () => !!G.unlocked['job:assassin'],
    forbid: ['milice', 'arcanes'], noDecay: true, reward: [{ stat: 'xp:ombre', mult: 1.5 }, { stat: 'xp:tenebres', mult: 1.5 }], rewardText: 'XP Ombre et Ténèbres ×1,5 pour toujours' },
];
