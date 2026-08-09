# Logo

Dépose le logo officiel ici sous le nom **`logo.png`**.

- Format conseillé : PNG **à fond transparent** (le fond du site est déjà noir),
  ou SVG si tu as le vectoriel.
- Recadre les marges noires autour du lettrage : le composant dimensionne
  l'image par sa hauteur, donc du padding vide dans le fichier rétrécit
  visuellement le logo.
- Hauteur utile : ~120 px minimum (il est affiché en 40 px dans le header
  et 56 px dans le footer, donc du 2× pour les écrans Retina).

Si tu utilises une autre extension, change `LOGO_SRC` dans
[`src/components/layout/logo.tsx`](../src/components/layout/logo.tsx).

Tant que le fichier est absent, le site affiche automatiquement le wordmark
typographique de repli — rien ne casse.
