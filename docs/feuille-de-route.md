# Lignée — feuille de route de la refonte visuelle « L'Arbre aux Lanternes »

*Équipe visuels — 24/11/2026*

## Répartition
- **Équipe visuels** : toute la couche d'interface — `index.html`, `js/ui.js`, `css/`, `img/`, `fonts/`, et les modules visuels (`js/scene.js`, `js/ambiance.js`…).
- **Équipe moteur** : `js/game.js`, `js/data.js` et les modules de jeu (`js/sante.js`, `js/saisons.js`, `js/debug.js`…). Leurs modules **déclarent** ce qu'ils veulent afficher via l'API d'interface (`UI.ajouterRessource`, `UI.ajouterJauge`, `UI.ajouterMarque` — voir `docs/specs/2026-11-24-socle-arbre.md`) ; le rendu est fait par la couche visuelle.

## Décisions de direction artistique
- Palette « Braise & suie », polices IM Fell (romaine + petites capitales) — `docs/specs/2026-11-24-direction-artistique-et-scene.md`.
- Fil conducteur : **l'Arbre aux Lanternes** — un arbre mort sous un ciel de braise, une lanterne par génération.
- Mise en page : disposition actuelle (barre du haut, colonne du personnage, scène, onglets) **ornée**.
- Kit : **Brindilles** pour le courant, **Enluminure** (filigranes, double filet, lanterne — jamais d'aplat d'or) pour l'important.
- Ressources : **inscriptions gravées** (petite icône + nom en petites capitales au-dessus de la valeur).
- Ambiance : particules de **saison** discrètes derrière l'interface.
- Identité : chaque lignée a un **nom de maison** et chaque génération un **prénom**.

## Branches (une spec + un plan chacune)
| # | Branche | Contenu | État |
|---|---|---|---|
| — | `feature/direction-artistique` | Palette, polices, matières | ✅ mergée |
| — | `feature/scene-animee` | Bandeau animé, médaillons, voie Paysannerie | ✅ mergée |
| 1 | `feature/socle-arbre` | Kit Brindilles/Enluminure, icônes, barre du haut, API d'interface (+ migration santé/saisons), ambiance de saison | ✅ prête (à merger) |
| 2 | `feature/lignee` | Mémoire des générations (`G.lignee`), nom de maison, prénoms | ✅ prête (à merger) |
| — | `feature/scene-boutique` | Les achats de la boutique dans la scène : logis sur l'horizon, possessions autour du personnage | ✅ prête (à merger) |
| 3 | `feature/ecran-accueil` | Arbre animé, lanternes des ancêtres, « Fonder une lignée » / « Continuer » | ✅ prête (à merger) |
| 4 | `feature/naissance-mort` | Choix du trait en « destins », mort (lanterne qui s'éteint), transmission | ✅ prête (à merger) |
| 5 | `feature/onglet-heritage` | L'arbre généalogique + talents | ✅ prête (à merger) |
| 6 | `feature/panneau-vie` | Colonne du personnage : identité, santé, métier/compétence, corruption, événements, automatisation | |
| 7 | `feature/onglets-metiers-competences` | Registres illustrés avec icônes | |
| 8 | `feature/onglet-boutique` | Logements et possessions | |
| 9 | `feature/onglets-secondaires` | Défis, Hauts faits, Journal, Statistiques, Options | |
| 10 | `feature/scene-milice` / `-arcanes` / `-ombre` | Les 3 voies restantes + 12 médaillons | |
| 11 | `feature/scene-saisons-sante` | La scène réagit aux saisons et à la santé | |
| 12 | `feature/finitions` | Tutoriel, notifications, favicon, transitions d'onglets, passe mobile | |

Après les branches 1 et 2, les suivantes peuvent avancer en parallèle.
