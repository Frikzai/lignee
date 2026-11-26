'use strict';
// =====================================================================
//  Lignée — événements supplémentaires et alliances
//  Des événements par âge, par voie, par logis, par fortune et par lignée,
//  pour que la même histoire ne revienne pas sans cesse (voir aussi G.recents
//  dans game.js). Ajoutés à EVENTS comme ceux de sante.js, saisons.js et foi.js.
//  L'alliance : vers 20 ans, trois maisons proposent un conjoint dont le destin
//  s'ajoute à celui de la vie en cours, et que l'enfant pourra hériter.
// =====================================================================
{
  const catJob = () => JOB_BY_ID[G.currentJob].cat;
  const rangLogis = () => HOUSING.findIndex(h => h.id === G.housing);
  const perdre = f => { const l = G.coins * f; G.coins -= l; return l; };
  const foi = n => { G.foi = Math.min(100, Math.max(0, (G.foi || 0) + n)); };
  const corrompre = n => { G.corruption = Math.min(100, Math.max(0, G.corruption + n)); };
  const parForce = () => { const f = G.skills.force.level; return Math.min(0.9, (f + 5) / (f + 60)); };
  const tirer = liste => liste.splice(Math.floor(Math.random() * liste.length), 1)[0];

  const MAISONS = ['Corbelune', 'Valcourt', 'Blancherive', 'Hautecombe', 'Cendrebourg', 'Brisemont', 'Feuillemorte',
    'Ombreval', 'Aubépine', 'Morteaux', 'Givrecœur', 'Lancelune', 'Roncefer', 'Sombreval'];

  const NOUVEAUX = [
    // ------------------------------------------------------------ Alliance
    { id: 'alliance', title: 'Une alliance', weight: 6, cond: () => ageYears() >= 20 && !G.conjoint,
      init: () => {
        const traits = TRAITS.filter(t => !t.voie && t.id !== G.trait).map(t => t.id);
        const maisons = MAISONS.filter(m => !G.lignee || m !== G.lignee.maison);
        const prenoms = typeof PRENOMS !== 'undefined' ? [...PRENOMS] : ['Ysolde', 'Aldric', 'Mahaut'];
        return { candidats: [0, 1, 2].map(() => ({ prenom: tirer(prenoms), maison: tirer(maisons), trait: tirer(traits) })) };
      },
      text: () => 'Trois maisons proposent une alliance. Le destin de votre conjoint s\'ajoute au vôtre pour cette vie, et votre enfant pourra en hériter.',
      choices: [
        ...[0, 1, 2].map(i => ({
          label: d => { const c = d.candidats[i], t = TRAIT_BY_ID[c.trait]; return `${c.prenom} ${c.maison} : ${t.name} (${t.desc})`; },
          run: d => { const c = d.candidats[i]; G.conjoint = c; return [`Alliance avec ${c.prenom} de la maison ${c.maison}.`, 'gold']; },
        })),
        { label: () => 'Décliner toute alliance', run: () => { G.conjoint = { refus: true }; return ['Vous suivrez votre chemin sans alliance.', '']; } },
      ] },

    // ------------------------------------------------------------ Âges de la vie
    { id: 'apprenti', title: 'Un maître d\'apprentissage', weight: 2, cond: () => ageYears() < 25,
      init: () => ({}),
      text: () => 'Un maître artisan propose de vous prendre sous son aile. Les gages sont maigres, mais on apprend vite.',
      choices: [
        { label: () => 'Entrer en apprentissage : XP métiers ×1,6, revenus ×0,7 (2 ans)',
          run: () => { addBuff('xp:jobs', 1.6, 730, 'Apprentissage'); addBuff('income:all', 0.7, 730, 'Gages d\'apprenti'); return ['Vous apprenez le métier à la dure.', 'good']; } },
        { label: () => 'Rester libre', run: () => ['Vous préférez apprendre seul.', ''] },
      ] },
    { id: 'amour', title: 'Un premier amour', weight: 2, cond: () => ageYears() >= 16 && ageYears() < 30,
      init: () => ({}),
      text: () => 'Un regard au marché, une danse à la fête : votre cœur s\'emballe.',
      choices: [
        { label: () => 'Vivre cet amour : bonheur ×1,4 (2 ans)',
          run: () => { addBuff('happiness', 1.4, 730, 'Premier amour'); return ['Deux années lumineuses.', 'good']; } },
        { label: () => 'Le travail d\'abord : XP compétences ×1,3 (1 an)',
          run: () => { addBuff('xp:skills', 1.3, 365, 'Cœur fermé'); return ['Vous noyez vos sentiments dans l\'étude.', ''] ; } },
      ] },
    { id: 'memoires', title: 'Les vieux jours', weight: 2, cond: () => ageYears() >= 60,
      init: () => ({}),
      text: () => 'Vos mains tremblent un peu, mais votre mémoire est intacte.',
      choices: [
        { label: () => 'Écrire vos mémoires : XP compétences ×2 (1 an)',
          run: () => { addBuff('xp:skills', 2, 365, 'Mémoires'); return ['Chaque page vous apprend quelque chose sur vous-même.', 'good']; } },
        { label: () => 'Profiter du soleil : bonheur ×1,5 (2 ans)',
          run: () => { addBuff('happiness', 1.5, 730, 'Douce vieillesse'); return ['Le temps ralentit, enfin.', 'good']; } },
      ] },
    { id: 'anniversaire', title: 'Un anniversaire rond', weight: 3, cond: () => ageYears() >= 30 && Math.floor(ageYears()) % 10 === 0,
      init: () => ({ cost: Math.max(30, refIncome() * 20) }),
      text: () => `Vous fêtez vos ${Math.floor(ageYears())} ans. Vos proches veulent marquer le coup.`,
      choices: [
        { label: d => `Grande fête (${fmt(d.cost)}) : bonheur ×1,5 (1 an)`, can: d => G.coins >= d.cost,
          run: d => { G.coins -= d.cost; addBuff('happiness', 1.5, 365, 'Grande fête'); return ['On en parlera longtemps.', 'good']; } },
        { label: () => 'Repas en famille : bonheur ×1,15 (1 an)',
          run: () => { addBuff('happiness', 1.15, 365, 'Repas de famille'); return ['Simple et chaleureux.', 'good']; } },
      ] },

    // ------------------------------------------------------------ Paysannerie
    { id: 'secheresse', title: 'La sécheresse', weight: 2, cond: () => catJob() === 'paysannerie',
      init: () => ({ cost: Math.max(40, refIncome() * 40) }),
      text: () => 'Pas une goutte depuis des semaines. La terre se fend.',
      choices: [
        { label: d => `Creuser un puits (${fmt(d.cost)})`, can: d => G.coins >= d.cost,
          run: d => { G.coins -= d.cost; return ['L\'eau jaillit : la récolte est sauvée.', 'good']; } },
        { label: () => 'Prier pour la pluie (50 % : revenus Paysannerie ×0,5 pendant 1 an)',
          run: () => {
            if (Math.random() < 0.5) { foi(5); return ['La pluie arrive enfin. Foi +5.', 'good']; }
            addBuff('income:paysannerie', 0.5, 365, 'Sécheresse'); return ['Le ciel reste sec : une année de misère.', 'bad'];
          } },
      ] },
    { id: 'foire', title: 'La foire aux bestiaux', weight: 2, cond: () => catJob() === 'paysannerie',
      init: () => ({ cost: Math.max(50, refIncome() * 50) }),
      text: d => `Un maquignon vous vante un bœuf de labour pour ${fmt(d.cost)} écus.`,
      choices: [
        { label: d => `L'acheter (${fmt(d.cost)}) : revenus Paysannerie ×1,4 (2 ans)`, can: d => G.coins >= d.cost,
          run: d => { G.coins -= d.cost; addBuff('income:paysannerie', 1.4, 730, 'Bœuf de labour'); return ['Une bête robuste et docile.', 'good']; } },
        { label: () => 'Passer son chemin', run: () => ['Vous gardez vos écus.', ''] },
      ] },
    { id: 'loups', title: 'Les loups', weight: 2, cond: () => catJob() === 'paysannerie' && ageYears() >= 16,
      init: () => ({ chance: parForce(), reward: Math.max(40, refIncome() * 40) }),
      text: d => `Une meute rôde autour du village. Chances de la repousser : ${Math.round(d.chance * 100)} % (selon votre Force).`,
      choices: [
        { label: () => 'Chasser la meute',
          run: d => {
            if (Math.random() < d.chance) { G.coins += d.reward; addLevels(G.skills.force, 2); return [`Les loups fuient. Le village vous offre ${fmt(d.reward)} écus. Force +2.`, 'good']; }
            G.lifeBonusYears -= 1; return ['Une morsure mal soignée : −1 an d\'espérance de vie.', 'bad'];
          } },
        { label: () => 'Rentrer les bêtes (perdre 5 % de la bourse)',
          run: () => { const l = perdre(0.05); return [`Quelques bêtes perdues : −${fmt(l)} écus.`, '']; } },
      ] },

    // ------------------------------------------------------------ Milice
    { id: 'siege', title: 'Le siège', weight: 2, cond: () => catJob() === 'milice',
      init: () => ({ gain: Math.max(80, refIncome() * 60) }),
      text: () => 'Une armée campe sous les remparts. La ville tiendra-t-elle ?',
      choices: [
        { label: () => 'Tenir les remparts : XP Milice ×2 (6 mois), 25 % de perdre 2 ans de vie',
          run: () => {
            addBuff('xp:milice', 2, 182, 'Siège');
            if (Math.random() < 0.25) { G.lifeBonusYears -= 2; return ['La ville tient, mais une flèche vous a touché : −2 ans.', 'bad']; }
            return ['La ville tient. On chante votre courage.', 'good'];
          } },
        { label: d => `Négocier la reddition (+${fmt(d.gain)}) : corruption +10`,
          run: d => { G.coins += d.gain; corrompre(10); return ['L\'ennemi paie bien ceux qui ouvrent les portes.', 'bad']; } },
      ] },
    { id: 'mission', title: 'Une mission secrète', weight: 2, cond: () => catJob() === 'milice',
      init: () => ({}),
      text: () => 'Un officier vous confie une mission loin de la ville. Trois mois, et une promotion à la clé.',
      choices: [
        { label: () => 'Accepter : métier actuel +3 niveaux, 3 mois d\'absence',
          run: () => { G.days += 90; addLevels(G.jobs[G.currentJob], 3); return ['Mission accomplie : vous montez en grade.', 'good']; } },
        { label: () => 'Décliner', run: () => ['Quelqu\'un d\'autre ira.', ''] },
      ] },
    { id: 'duel', title: 'Un duel d\'honneur', weight: 1, cond: () => ageYears() >= 18,
      init: () => ({ chance: parForce(), reward: Math.max(60, refIncome() * 50) }),
      text: d => `Un noble vous provoque en duel. Chances de victoire : ${Math.round(d.chance * 100)} % (selon votre Force).`,
      choices: [
        { label: () => 'Relever le défi',
          run: d => {
            if (Math.random() < d.chance) { G.coins += d.reward; addBuff('happiness', 1.3, 365, 'Honneur sauf'); return [`Victoire ! L'enjeu : ${fmt(d.reward)} écus.`, 'good']; }
            const l = perdre(0.15); return [`Blessé, vous payez le chirurgien : −${fmt(l)} écus.`, 'bad'];
          } },
        { label: () => 'Présenter des excuses : bonheur ×0,85 (1 an)',
          run: () => { addBuff('happiness', 0.85, 365, 'Honte'); return ['On ricane sur votre passage.', 'bad']; } },
      ] },

    // ------------------------------------------------------------ Arcanes
    { id: 'familier', title: 'Un familier', weight: 2, cond: () => catJob() === 'arcanes',
      init: () => ({}),
      text: () => 'Un corbeau aux yeux d\'argent se pose chaque soir sur votre fenêtre.',
      choices: [
        { label: () => 'L\'adopter : XP Mystique ×1,5 (3 ans)',
          run: () => { addBuff('xp:mystique', 1.5, 1095, 'Familier'); return ['Il vous souffle des secrets à l\'oreille.', 'good']; } },
        { label: () => 'Le chasser', run: () => ['Il s\'envole en croassant.', ''] },
      ] },
    { id: 'bibliotheque', title: 'La bibliothèque interdite', weight: 2, cond: () => catJob() === 'arcanes' || G.skills.mana.level >= 50,
      init: () => ({ skill: G.currentSkill }),
      text: () => 'Une clé rouillée ouvre la réserve interdite de la tour.',
      choices: [
        { label: d => `S'y enfermer un hiver (3 mois) : ${SKILL_BY_ID[d.skill].name} +5 niveaux`,
          run: d => { G.days += 90; addLevels(G.skills[d.skill], 5); return [`${SKILL_BY_ID[d.skill].name} +5 niveaux.`, 'good']; } },
        { label: () => 'Remettre la clé à sa place', run: () => ['La curiosité est un vilain défaut.', ''] },
      ] },
    { id: 'golem', title: 'Un golem à vendre', weight: 2, cond: () => catJob() === 'arcanes',
      init: () => ({ cost: Math.max(80, refIncome() * 80) }),
      text: d => `Un mage ruiné vend son golem d'argile pour ${fmt(d.cost)} écus.`,
      choices: [
        { label: d => `L'acheter (${fmt(d.cost)}) : revenus Arcanes ×1,5 (2 ans)`, can: d => G.coins >= d.cost,
          run: d => { G.coins -= d.cost; addBuff('income:arcanes', 1.5, 730, 'Golem'); return ['Il travaille sans jamais se plaindre.', 'good']; } },
        { label: () => 'Refuser', run: () => ['Les golems finissent toujours par se fissurer.', ''] },
      ] },

    // ------------------------------------------------------------ Ombre
    { id: 'trahison', title: 'Trahi par un complice', weight: 2, cond: () => catJob() === 'ombre',
      init: () => ({ gain: Math.max(60, refIncome() * 50) }),
      text: () => 'Votre complice a filé avec le butin du dernier coup.',
      choices: [
        { label: d => `Le retrouver (+${fmt(d.gain)}) : corruption +10`,
          run: d => { G.coins += d.gain; corrompre(10); return ['On ne vous trahira plus de sitôt.', 'bad']; } },
        { label: () => 'Disparaître (perdre 20 % de la bourse)',
          run: () => { const l = perdre(0.2); return [`Vous changez de ville : −${fmt(l)} écus.`, '']; } },
      ] },
    { id: 'taxeguilde', title: 'La taxe de la guilde', weight: 2, cond: () => catJob() === 'ombre',
      init: () => ({ cost: Math.max(30, refIncome() * 30) }),
      text: d => `La guilde des voleurs réclame sa part : ${fmt(d.cost)} écus.`,
      choices: [
        { label: d => `Payer (${fmt(d.cost)})`, can: d => G.coins >= d.cost,
          run: d => { G.coins -= d.cost; return ['La guilde vous laisse travailler en paix.', '']; } },
        { label: () => 'Refuser (50 % : revenus Ombre ×0,5 pendant 1 an)',
          run: () => {
            if (Math.random() < 0.5) return ['La guilde a d\'autres soucis : elle vous oublie.', 'good'];
            addBuff('income:ombre', 0.5, 365, 'Boycott de la guilde'); return ['Plus aucun receleur ne vous ouvre sa porte.', 'bad'];
          } },
      ] },
    { id: 'poison', title: 'Une commande de poison', weight: 2, cond: () => G.corruption >= 30,
      init: () => ({ gain: Math.max(100, refIncome() * 80) }),
      text: d => `Une dame masquée vous offre ${fmt(d.gain)} écus pour une fiole « discrète ».`,
      choices: [
        { label: d => `Vendre le poison (+${fmt(d.gain)}) : corruption +10`,
          run: d => { G.coins += d.gain; corrompre(10); return ['Un baron meurt la semaine suivante.', 'bad']; } },
        { label: () => 'Refuser : corruption −5', run: () => { corrompre(-5); return ['Il y a des lignes que vous ne franchirez pas.', 'good']; } },
      ] },

    // ------------------------------------------------------------ Clergé
    { id: 'reliquesainte', title: 'Une relique sainte', weight: 2, cond: () => catJob() === 'clerge',
      init: () => ({}),
      text: () => 'Sous les dalles de la chapelle, vous trouvez un reliquaire d\'argent.',
      choices: [
        { label: () => 'L\'exposer aux fidèles : revenus Clergé ×1,5 (1 an)',
          run: () => { addBuff('income:clerge', 1.5, 365, 'Relique exposée'); return ['Les pèlerins affluent.', 'good']; } },
        { label: () => 'La garder secrète : foi +10', run: () => { foi(10); return ['Vous priez devant elle chaque nuit.', 'good']; } },
      ] },
    { id: 'heretique', title: 'Un hérétique', weight: 2, cond: () => catJob() === 'clerge',
      init: () => ({}),
      text: () => 'Un vieil homme prêche une doctrine interdite. Il vous demande asile.',
      choices: [
        { label: () => 'Le dénoncer : foi +5, corruption +5',
          run: () => { foi(5); corrompre(5); return ['Justice est faite, dit-on.', '']; } },
        { label: () => 'Le cacher : foi −5, bonheur ×1,2 (1 an)',
          run: () => { foi(-5); addBuff('happiness', 1.2, 365, 'Conscience tranquille'); return ['Vous dormez bien, malgré tout.', 'good']; } },
      ] },

    // ------------------------------------------------------------ Logis et fortune
    { id: 'incendie', title: 'Un incendie', weight: 2, cond: () => rangLogis() >= 2,
      init: () => ({}),
      text: () => 'Une nuit, une odeur de fumée vous réveille : le feu a pris dans la grange.',
      choices: [
        { label: () => 'Combattre le feu (60 %, sinon perdre 20 % de la bourse)',
          run: () => {
            if (Math.random() < 0.6) return ['Le feu est maîtrisé avant l\'aube.', 'good'];
            const l = perdre(0.2); return [`Le feu ravage tout : −${fmt(l)} écus.`, 'bad'];
          } },
        { label: () => 'Sauver les meubles (perdre 8 % de la bourse)',
          run: () => { const l = perdre(0.08); return [`Vous sauvez l'essentiel : −${fmt(l)} écus.`, '']; } },
      ] },
    { id: 'bal', title: 'Le bal du comte', weight: 2, cond: () => rangLogis() >= 3,
      init: () => ({ cost: Math.max(80, refIncome() * 40) }),
      text: () => 'Une invitation scellée de cire rouge : le comte donne un bal.',
      choices: [
        { label: d => `S'y rendre (${fmt(d.cost)}) : bonheur ×1,3 et revenus ×1,1 (1 an)`, can: d => G.coins >= d.cost,
          run: d => { G.coins -= d.cost; addBuff('happiness', 1.3, 365, 'Souvenirs du bal'); addBuff('income:all', 1.1, 365, 'Relations'); return ['Vous y nouez de précieuses relations.', 'good']; } },
        { label: () => 'Décliner', run: () => ['Les bals vous ennuient.', ''] },
      ] },
    { id: 'cambrioleurs', title: 'Des cambrioleurs', weight: 2, cond: () => G.coins >= 500 && G.coins >= refIncome() * 100,
      init: () => ({}),
      text: () => 'Des silhouettes rôdent autour de votre coffre depuis quelques nuits.',
      choices: [
        { label: () => 'Engager des gardes (5 % de la bourse)',
          run: () => { const l = perdre(0.05); return [`Les gardes coûtent ${fmt(l)} écus, mais le coffre est sauf.`, '']; } },
        { label: () => 'Ne rien faire (50 % de perdre 25 % de la bourse)',
          run: () => {
            if (Math.random() < 0.5) return ['Fausse alerte.', 'good'];
            const l = perdre(0.25); return [`Le coffre est vide un matin : −${fmt(l)} écus.`, 'bad'];
          } },
      ] },
    { id: 'compagnie', title: 'Une compagnie de commerce', weight: 2, cond: () => G.coins >= 1000,
      init: () => ({}),
      text: () => 'Des armateurs cherchent des associés pour une expédition vers les îles aux épices.',
      choices: [
        { label: () => 'Investir 30 % de la bourse (50 % : la tripler)',
          run: () => {
            const mise = G.coins * 0.3;
            if (Math.random() < 0.5) { G.coins += mise * 2; return [`Les navires reviennent chargés : +${fmt(mise * 2)} écus.`, 'good']; }
            G.coins -= mise; return [`La flotte a sombré : −${fmt(mise)} écus.`, 'bad'];
          } },
        { label: () => 'Refuser', run: () => ['La mer est trop capricieuse.', ''] },
      ] },
    { id: 'percepteur', title: 'Le percepteur', weight: 2, cond: () => G.coins >= 1000,
      init: () => ({}),
      text: () => 'Le percepteur du roi frappe à votre porte, son registre sous le bras.',
      choices: [
        { label: () => 'Payer l\'impôt (10 % de la bourse)',
          run: () => { const l = perdre(0.1); return [`Vous payez ${fmt(l)} écus. Le roi vous remercie.`, '']; } },
        { label: () => 'Frauder (60 % : rien ; sinon −30 % et corruption +5)',
          run: () => {
            if (Math.random() < 0.6) return ['Le percepteur ne remarque rien.', 'good'];
            const l = perdre(0.3); corrompre(5); return [`Fraude découverte : −${fmt(l)} écus d'amende.`, 'bad'];
          } },
      ] },

    // ------------------------------------------------------------ Lignée
    { id: 'tombeau', title: 'Le tombeau des ancêtres', weight: 2, cond: () => !!G.lignee && G.lignee.vies.length >= 5,
      init: () => ({ cost: Math.max(50, refIncome() * 30) }),
      text: () => 'Les ronces envahissent le tombeau de la famille. Les noms gravés s\'effacent.',
      choices: [
        { label: d => `Le restaurer (${fmt(d.cost)}) : XP (tout) ×1,3 (2 ans)`, can: d => G.coins >= d.cost,
          run: d => { G.coins -= d.cost; addBuff('xp:all', 1.3, 730, 'Bénédiction des ancêtres'); return ['Les ancêtres veillent sur vous.', 'good']; } },
        { label: () => 'Le laisser aux ronces : bonheur ×0,9 (1 an)',
          run: () => { addBuff('happiness', 0.9, 365, 'Remords'); return ['Une ombre de remords vous suit.', 'bad']; } },
      ] },
    { id: 'portrait', title: 'La galerie des portraits', weight: 2, cond: () => !!G.lignee && !!G.lignee.maison,
      init: () => ({ cost: Math.max(40, refIncome() * 25) }),
      text: () => `Un peintre propose d'ajouter votre portrait à la galerie de la maison ${G.lignee.maison}.`,
      choices: [
        { label: d => `Poser (${fmt(d.cost)}) : bonheur ×1,3 (2 ans)`, can: d => G.coins >= d.cost,
          run: d => { G.coins -= d.cost; addBuff('happiness', 1.3, 730, 'Portrait de famille'); return ['Votre visage rejoint ceux des ancêtres.', 'good']; } },
        { label: () => 'Refuser', run: () => ['Vous n\'aimez pas votre profil.', ''] },
      ] },
    { id: 'barde', title: 'La geste de la maison', weight: 2, cond: () => G.legacy.rebirths >= 10,
      init: () => ({ cost: Math.max(40, refIncome() * 20) }),
      text: () => 'Un barde chante dans les tavernes les exploits de vos ancêtres.',
      choices: [
        { label: d => `Le payer pour continuer (${fmt(d.cost)}) : XP métiers ×1,5 (2 ans)`, can: d => G.coins >= d.cost,
          run: d => { G.coins -= d.cost; addBuff('xp:jobs', 1.5, 730, 'Geste de la maison'); return ['Votre nom inspire le respect.', 'good']; } },
        { label: () => 'Le faire taire', run: () => ['Les morts n\'ont pas besoin de chansons.', ''] },
      ] },

    // ------------------------------------------------------------ Rencontres et présages
    { id: 'eclipse', title: 'Une éclipse', weight: 1, cond: () => ageYears() >= 16,
      init: () => ({}),
      text: () => 'En plein midi, le soleil s\'éteint. Les chiens hurlent.',
      choices: [
        { label: () => 'Observer l\'éclipse : XP Ténèbres ×2 (1 an), corruption +5',
          run: () => { addBuff('xp:tenebres', 2, 365, 'Midi noir'); corrompre(5); return ['Quelque chose a changé en vous.', 'event']; } },
        { label: () => 'Se terrer chez soi', run: () => ['Vous attendez que la lumière revienne.', ''] },
      ] },
    { id: 'mendiant', title: 'Un mendiant', weight: 2, cond: () => true,
      init: () => ({ cost: Math.max(5, refIncome() * 2) }),
      text: () => 'Un mendiant aveugle tend sa sébile au coin de la rue.',
      choices: [
        { label: d => `Donner (${fmt(d.cost)}) : foi +5, bonheur ×1,1 (6 mois)`, can: d => G.coins >= d.cost,
          run: d => { G.coins -= d.cost; foi(5); addBuff('happiness', 1.1, 182, 'Bonne action'); return ['Il vous bénit d\'une voix douce.', 'good']; } },
        { label: () => 'Passer son chemin', run: () => ['Vous pressez le pas.', ''] },
      ] },
    { id: 'des', title: 'Une partie de dés', weight: 2, cond: () => ageYears() >= 16 && G.coins >= 50,
      init: () => ({}),
      text: () => 'À la taverne, un inconnu vous défie aux dés.',
      choices: [
        { label: () => 'Miser 10 % de la bourse (45 % : doubler la mise)',
          run: () => {
            const mise = G.coins * 0.1;
            if (Math.random() < 0.45) { G.coins += mise; return [`Double six ! +${fmt(mise)} écus.`, 'good']; }
            G.coins -= mise; return [`Les dés étaient pipés : −${fmt(mise)} écus.`, 'bad'];
          } },
        { label: () => 'Refuser', run: () => ['Vous finissez votre bière en paix.', ''] },
      ] },
    { id: 'sorciere', title: 'La sorcière des bois', weight: 2, cond: () => ageYears() >= 16,
      init: () => ({ cost: Math.max(30, refIncome() * 30) }),
      text: () => 'Au fond de la forêt, une vieille femme fait bouillir d\'étranges herbes.',
      choices: [
        { label: d => `Acheter une potion (${fmt(d.cost)}) : XP Combat ×2 (1 an)`, can: d => G.coins >= d.cost,
          run: d => { G.coins -= d.cost; addBuff('xp:combat', 2, 365, 'Potion de vigueur'); return ['Vos muscles brûlent d\'une force nouvelle.', 'good']; } },
        { label: () => 'La chasser : foi +5', run: () => { foi(5); return ['Elle s\'enfuit en vous maudissant.', '']; } },
      ] },
    { id: 'pelerin', title: 'Un voyageur égaré', weight: 2, cond: () => true,
      init: () => ({}),
      text: () => 'Un soir d\'orage, un voyageur trempé frappe à votre porte.',
      choices: [
        { label: () => 'L\'héberger : XP compétences ×1,2 (1 an), foi +3',
          run: () => { addBuff('xp:skills', 1.2, 365, 'Récits du voyageur'); foi(3); return ['Il vous raconte le monde jusqu\'à l\'aube.', 'good']; } },
        { label: () => 'Garder la porte close', run: () => ['L\'orage gronde toute la nuit.', ''] },
      ] },
  ];
  for (const ev of NOUVEAUX) { EVENTS.push(ev); EVENT_BY_ID[ev.id] = ev; }
}
