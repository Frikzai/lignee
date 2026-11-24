'use strict';
// =====================================================================
//  Lignée — icône gravée (img/icones.svg) de chaque métier, compétence et
//  catégorie de data.js. Un test vérifie que rien ne manque.
// =====================================================================

const ICONES_METIERS = {
  glaneur: 'panier', bucheron: 'hache', pecheur: 'canne', mineur: 'pioche', artisan: 'marteau', negociant: 'balance',
  recrue: 'lance', garde: 'tour', veteran: 'epee', chevalier: 'heaume', capitaine: 'etendard', general: 'carte', connetable: 'couronne',
  novice: 'balai', alchimiste: 'alambic', enchanteur: 'baton', sage: 'parchemin', archimage: 'orbe', gardien: 'sablier',
  tirelaine: 'ciseaux', contrebandier: 'tonneau', voleur: 'grappin', assassin: 'dague', chefguilde: 'masque', necromancien: 'crane', seigneur: 'lune',
};

const ICONES_COMPETENCES = {
  discipline: 'age', assiduite: 'sablier', labeur: 'faucille', negoce: 'ecus',
  force: 'poing', tactique: 'pion', endurance: 'bouclier',
  meditation: 'lotus', mana: 'etincelle', vitalite: 'automne', transmutation: 'cercle', chronomancie: 'horloge',
  discretion: 'capuche', cruaute: 'dague', magienoire: 'crane', pacte: 'goutte',
};

const ICONES_CATEGORIES = {
  paysannerie: 'epi', milice: 'epee', arcanes: 'etoile', ombre: 'capuche',
  fondamentaux: 'livre', combat: 'poing', mystique: 'oeil', tenebres: 'lune',
};

const ICONES_OBJETS = {
  livre: 'livre', outils: 'marteau', pierres: 'pierre', cheval: 'cheval', serviteur: 'plateau',
  grimoire: 'grimoire', atelier: 'alambic', bibliotheque: 'etagere', jardin: 'feuille', observatoire: 'lunette',
};

const ICONES_DEFIS = {
  ascete: 'lotus', ephemere: 'sablier', pauvrete: 'revenu', amnesique: 'oeil', pacifiste: 'feuille', renegat: 'masque',
};

// Médaille de chaque haut fait (game.js et modules)
const ICONES_HAUTS_FAITS = {
  age25: 'age', age50: 'age', age80: 'sablier', age120: 'sablier',
  coins1k: 'ecus', coins1m: 'ecus', coins1b: 'balance',
  job25: 'marteau', job100: 'marteau', job300: 'etoile',
  skill50: 'livre', skill200: 'parchemin', skill1000: 'orbe',
  manoir: 'couronne', chevalier: 'heaume', novice: 'balai', archimage: 'orbe', gardien: 'horloge',
  reb1: 'lignee', reb5: 'lignee', reb20: 'lignee', ev10: 'carte', ev50: 'parchemin',
  assassin: 'dague', seigneur: 'lune', corrompu: 'crane', defi1: 'etendard', defiAll: 'bouclier',
  bonpied: 'sante', increvable: 'soin',
};

// Icône d'une entrée du journal selon son type (log(msg, type) dans game.js)
function iconeJournal(type) {
  return { good: 'acquis', bad: 'risque', event: 'parchemin', gold: 'etoile' }[type] || 'age';
}

// Icône d'un bonus temporaire selon la statistique touchée (clés de STAT_LABELS)
function iconeStat(stat) {
  const famille = stat.split(':')[0];
  return { xp: 'etoile', income: 'revenu', happiness: 'bonheur', lifespan: 'sante', speed: 'sablier', expenses: 'ecus' }[famille] || 'etoile';
}

if (typeof module !== 'undefined') module.exports = { ICONES_METIERS, ICONES_COMPETENCES, ICONES_CATEGORIES, ICONES_OBJETS, ICONES_DEFIS, ICONES_HAUTS_FAITS, iconeStat, iconeJournal };
