'use strict';
// =====================================================================
//  Lignée — mémoire des générations (équipe visuels)
//  Chaque lignée a un nom de maison, chaque génération un prénom ; à chaque
//  transmission, la vie qui s'achève rejoint l'arbre des ancêtres.
//  Données : G.lignee (sauvegardée avec la partie, comme G.health pour la santé).
// =====================================================================

const PRENOMS = [
  'Adélaïde', 'Aldric', 'Aliénor', 'Amaury', 'Anselme', 'Baudouin', 'Béatrix', 'Bertrade', 'Blanche', 'Bran',
  'Clotaire', 'Constance', 'Éloi', 'Enguerrand', 'Ermengarde', 'Faustine', 'Foulques', 'Gaspard', 'Gauvain', 'Gerberge',
  'Godefroy', 'Héloïse', 'Hildegarde', 'Hugues', 'Ida', 'Isaure', 'Jehan', 'Jehanne', 'Landry', 'Lancelin',
  'Léonor', 'Mahaut', 'Mathilde', 'Mathurin', 'Mélisende', 'Mélusine', 'Odile', 'Orderic', 'Perceval', 'Pétronille',
  'Radegonde', 'Raoul', 'Renaud', 'Roland', 'Sancie', 'Séverin', 'Sibylle', 'Tancrède', 'Thibaut', 'Tiphaine',
  'Ulric', 'Ursule', 'Valdrade', 'Ysolde', 'Yolande', 'Yvain', 'Zénobie',
];

// Prénom tiré au sort, jamais le même que la génération précédente.
function choisirPrenom(precedent, alea = Math.random) {
  const choix = PRENOMS.filter(p => p !== precedent);
  return choix[Math.floor(alea() * choix.length) % choix.length];
}

// Résumé d'une vie : âge, métier le plus haut (à égalité, le plus avancé dans la liste), trait, fin.
function resumeVie({ age, jobs, trait, mort, alliance }, metiers) {
  let meilleur = metiers[0], niveau = 0;
  for (const m of metiers) {
    const lv = (jobs[m.id] && jobs[m.id].level) || 0;
    if (lv > niveau || (lv === niveau && lv > 0)) { meilleur = m; niveau = lv; }   // tout à 0 : le premier métier
  }
  return { age: Math.floor(age), metier: meilleur.name, niveau, trait: trait || null, fin: mort ? 'mort' : 'transmission', ...(alliance ? { alliance } : {}) };
}

// oublies : vies transmises avant l'arrivée de la lignée (vieilles sauvegardes) — des lanternes sans nom.
function creerLignee(rebirths, prenom) {
  return { maison: null, oublies: rebirths, vies: [], courante: { prenom } };
}

function enregistrerVie(lignee, resume, nouveauPrenom) {
  lignee.vies.push({ prenom: lignee.courante.prenom, ...resume });
  lignee.courante = { prenom: nouveauPrenom };
  return lignee;
}

function nomComplet(lignee) {
  return lignee.maison ? `${lignee.courante.prenom} ${lignee.maison}` : lignee.courante.prenom;
}

// Nom de maison saisi par le joueur : sans balise, espaces normalisés, majuscule, 24 caractères.
function nettoyerMaison(texte) {
  const n = String(texte).replace(/[<>&"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24).trim();
  return n ? n[0].toUpperCase() + n.slice(1) : null;
}

// ------------------------------------------------------------ Navigateur
if (typeof HOOKS !== 'undefined') {
  let derniereVie = null;   // résumé tenu à jour à chaque rafraîchissement : la transmission remet tout à zéro

  HOOKS.init.push(() => {
    if (!G.lignee) G.lignee = creerLignee(G.legacy.rebirths, choisirPrenom(null));
  });
  HOOKS.ui.push(() => {
    const t = currentTrait();
    const cj = G.conjoint && G.conjoint.trait ? `${G.conjoint.prenom} ${G.conjoint.maison}` : null;
    derniereVie = resumeVie({ age: ageYears(), jobs: G.jobs, trait: t && t.name, mort: G.dead, alliance: cj }, JOBS);
  });
  HOOKS.newLife.push(() => {
    const resume = derniereVie || resumeVie({ age: START_AGE, jobs: {}, trait: null, mort: false }, JOBS);
    enregistrerVie(G.lignee, resume, choisirPrenom(G.lignee.courante.prenom));
    derniereVie = null;
    log(`${nomComplet(G.lignee)} voit le jour.`, 'gold');
  });
}

const Lignee = {
  nommer(texte) {
    const n = nettoyerMaison(texte);
    if (n) G.lignee.maison = n;
    return n;
  },
};

if (typeof module !== 'undefined') module.exports = { PRENOMS, choisirPrenom, resumeVie, creerLignee, enregistrerVie, nomComplet, nettoyerMaison };
