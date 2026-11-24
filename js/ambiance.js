'use strict';
// =====================================================================
//  Lignée — ambiance de saison (équipe visuels)
//  Quelques particules discrètes derrière l'interface : braises au printemps
//  et en été, feuilles mortes en automne, neige en hiver.
//  Lit la saison du module saisons s'il est chargé ; n'écrit jamais dans G.
// =====================================================================

const Ambiance = (() => {
  const NB = 18;
  const saison = () =>
    (typeof currentSeason === 'function' && typeof G !== 'undefined' && G) ? currentSeason().id : 'printemps';

  // générateur à graine fixe : la même disposition à chaque chargement
  let graine = 7;
  const alea = () => (graine = (graine * 16807) % 2147483647) / 2147483647;

  function init() {
    const calque = document.getElementById('ambiance');
    if (!calque) return;
    for (let i = 0; i < NB; i++) {
      const p = document.createElement('i');
      p.style.setProperty('--x', (alea() * 100).toFixed(1) + 'vw');
      p.style.setProperty('--duree', (12 + alea() * 10).toFixed(1) + 's');
      p.style.setProperty('--retard', (-alea() * 22).toFixed(1) + 's');   // déjà en route au chargement
      p.style.setProperty('--taille', (0.6 + alea() * 0.8).toFixed(2));
      p.style.setProperty('--derive', ((alea() - 0.5) * 140).toFixed(0) + 'px');
      calque.appendChild(p);
    }
    // changement de saison : fondu du calque (0,8 s), puis nouvelles particules
    let actuelle = null, fondu = null;
    const maj = () => {
      const s = saison();
      if (s === actuelle || fondu) return;
      if (actuelle === null) { actuelle = calque.dataset.saison = s; return; }
      calque.classList.add('change');
      fondu = setTimeout(() => {
        actuelle = calque.dataset.saison = saison();
        calque.classList.remove('change');
        fondu = null;
      }, 800);
    };
    maj();
    setInterval(maj, 1000);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
  return { saison };
})();
