#!/usr/bin/env python3
"""Génère img/accueil.svg : le grand arbre mort de l'écran d'accueil (graine fixe = même arbre à chaque fois).

Usage : python3 outils/arbre.py [graine]
Les places des lanternes (bouts de branches) sont écrites dans data-places du groupe #lanternes,
de la plus basse à la plus haute ; la dernière (le sommet) est celle de la vie en cours.
"""
import math, random, sys, os

def generer(graine=11):
    random.seed(graine)
    formes, bouts = [], []
    def courbe(x, y, cx, cy, x2, y2, w1, w2, n):
        g, d = [], []
        for i in range(n + 1):
            t = i / n
            px = (1-t)**2*x + 2*(1-t)*t*cx + t*t*x2
            py = (1-t)**2*y + 2*(1-t)*t*cy + t*t*y2
            dx = 2*(1-t)*(cx-x) + 2*t*(x2-cx); dy = 2*(1-t)*(cy-y) + 2*t*(y2-cy)
            l = math.hypot(dx, dy) or 1
            nx, ny = -dy/l, dx/l
            w = (w1 + (w2-w1)*t) / 2
            g.append((px + nx*w, py + ny*w)); d.append((px - nx*w, py - ny*w))
        return 'M' + ' '.join(f'{a:.0f} {b:.0f}' for a, b in g + d[::-1]) + 'Z'
    def branche(x, y, ang, L, w, prof):
        x2 = x + L*math.cos(ang); y2 = y - L*math.sin(ang)
        pli = random.uniform(-.28, .28)
        cx = (x+x2)/2 + L*pli*math.sin(ang); cy = (y+y2)/2 + L*pli*math.cos(ang)
        w2 = w * .66
        formes.append(courbe(x, y, cx, cy, x2, y2, w, w2, 10 if w > 8 else 5 if w > 3 else 3))
        if prof == 0 or w2 < 1.1:
            bouts.append((x2, y2)); return
        n = 3 if prof >= 4 and random.random() < .45 else 2
        ecart = random.uniform(.55, .8)
        for i in range(n):
            a = ang + (i - (n-1)/2) * ecart * (2/n + .3) + random.uniform(-.18, .18)
            branche(x2, y2, a + (math.pi/2 - a) * -.12, L*random.uniform(.68, .84), w2, prof-1)
    branche(800, 815, math.pi/2, 215, 60, 6)
    for ang, L in [(math.pi*0.96, 150), (math.pi*0.03, 160), (math.pi*1.06, 90), (-math.pi*0.07, 100)]:
        x2 = 800 + L*math.cos(ang); y2 = 812 - L*math.sin(ang)*0.5
        formes.append(courbe(800, 805, (800+x2)/2, 818, x2, y2 + 8, 26, 3, 8))
    return formes, bouts

def places(bouts):
    cands = sorted([p for p in bouts if 110 < p[1] < 620], key=lambda p: p[1])
    retenues = []
    for p in cands:
        if all(math.hypot(p[0]-q[0], p[1]-q[1]) > 78 for q in retenues): retenues.append(p)
    sommet = min((p for p in bouts if 650 < p[0] < 950), key=lambda p: p[1])
    autres = [p for p in retenues if 150 < p[1] < 520 and math.hypot(p[0]-sommet[0], p[1]-sommet[1]) > 60]
    autres.sort(key=lambda p: -p[1])           # des branches basses (anciens) vers le haut (récents)
    return [(round(x), round(y)) for x, y in autres + [sommet]]

def svg(graine=11):
    formes, bouts = generer(graine)
    pl = ';'.join(f'{x},{y}' for x, y in places(bouts))
    braises = ''.join(f'<circle class="braise-ac" cx="{560+k*58}" cy="860" r="{1.6+(k%3)*.6:.1f}" style="animation-delay:{-k*1.3:.1f}s"/>' for k in range(9))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" class="accueil-svg arbre-lignee" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
  <!-- Généré par outils/arbre.py (graine {graine}) — ne pas modifier à la main. -->
  <defs>
    <linearGradient id="ac-ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0910"/><stop offset=".55" stop-color="#2c1512"/><stop offset=".85" stop-color="#6b2f17"/><stop offset="1" stop-color="#1a0f0a"/></linearGradient>
    <radialGradient id="ac-lueur" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#a5461a" stop-opacity=".55"/><stop offset="1" stop-color="#a5461a" stop-opacity="0"/></radialGradient>
    <linearGradient id="ac-brume" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a7060" stop-opacity="0"/><stop offset="1" stop-color="#8a7060" stop-opacity=".18"/></linearGradient>
  </defs>
  <g class="fond">
    <rect width="1600" height="900" fill="url(#ac-ciel)"/>
    <circle class="lune" cx="1320" cy="150" r="46"/>
    <ellipse cx="800" cy="760" rx="760" ry="260" fill="url(#ac-lueur)"/>
    <path class="collines" d="M0 800 Q200 700 420 730 T860 720 T1260 700 T1600 720 V900 H0 Z"/>
    <path class="sol" d="M0 900 V790 Q300 750 620 772 Q800 784 980 768 Q1300 744 1600 770 V900 Z"/>
  </g>
  <path class="arbre" d="{' '.join(formes)}"/>
  <g id="lanternes" data-places="{pl}"></g>
  <g class="avant"><g class="braises">{braises}</g>
  <rect class="brume" y="760" width="1600" height="140" fill="url(#ac-brume)"/></g>
</svg>
'''

if __name__ == '__main__':
    graine = int(sys.argv[1]) if len(sys.argv) > 1 else 11
    sortie = os.path.join(os.path.dirname(__file__), '..', 'img', 'accueil.svg')
    open(sortie, 'w', encoding='utf-8').write(svg(graine))
    print('img/accueil.svg écrit,', len(places(generer(graine)[1])), 'places de lanternes')
