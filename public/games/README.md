# Visuels des jeux

Dépose ici une image **par jeu**, nommée d'après le slug du tournoi.

## Nommage

| Fichier                     | Où il apparaît                         |
| --------------------------- | -------------------------------------- |
| `<slug>-card.webp`          | Carte du jeu (accueil + `/tournois`)   |
| `<slug>-banner.webp`        | Fond du bandeau `/tournois/<slug>`     |
| `<slug>-character.png`      | Personnage détouré, à droite du bandeau |

Extensions acceptées : `.webp`, `.jpg`, `.jpeg`, `.png`.
**Exception** : le personnage n'accepte que `.png` et `.webp` (canal alpha requis) —
un `.jpg` serait ignoré, pour éviter un rectangle de fond visible.

Les 9 slugs : `valorant`, `rocket-league`, `tft`, `fortnite`, `tcg`, `ssbu`,
`mario-kart`, `tekken-8`, `fc27`.

Exemple : `valorant-card.webp`, `valorant-banner.webp`.

## Dimensions

| Usage                   | Dimensions        | Ratio  | Poids visé |
| ----------------------- | ----------------- | ------ | ---------- |
| Carte (`-card`)         | **1200 × 900**    | 4:3    | < 150 Ko   |
| Bandeau (`-banner`)     | **2560 × 960**    | 8:3    | < 300 Ko   |
| Personnage (`-character`) | **hauteur 1600**, largeur libre | libre | < 400 Ko |

Ces tailles couvrent l'affichage en 2× (écrans Retina) :

- la carte fait au maximum ~600 px de large à l'écran (1 colonne sur mobile,
  ~435 px en grille 3 colonnes sur grand écran) ;
- le bandeau fait au maximum ~1352 px de large (largeur du conteneur).

## Consignes de composition

Les images passent **sous l'effet glass**, avec un voile sombre par-dessus :

- **Carte** : opacité 30 % (50 % au survol) + dégradé noir du bas vers le haut.
- **Bandeau** : opacité 45 % + dégradé noir de la gauche vers la droite.

Donc :

1. **Pas de texte ni de logo dans l'image** — ils deviendraient illisibles.
2. **Sujet décalé à droite** : le titre et les blocs d'info occupent la gauche.
3. **Privilégie des visuels sombres et contrastés** (key art, screenshot
   d'ambiance). Une image claire ou chargée passera mal sous le voile.
4. Cadre **large et sans détail critique dans les bords** : le recadrage est en
   `object-cover`, les bords sont rognés selon la taille d'écran.

## Le personnage

Il est posé **par-dessus** le bandeau, à droite, et déborde volontairement :

- **96 px au-dessus** du bord haut du bandeau ;
- **24 px à droite** du bord droit.

Ses pieds sont alignés sur le bas du bandeau. La hauteur affichée est d'environ
**566 px** sur un écran de 1440 px — d'où les 1600 px de source (≈ 2,8×, large
marge pour les grands écrans).

### Comment préparer le fichier

1. **Détourage propre**, fond 100 % transparent (PNG-24 ou WebP alpha).
2. **Pas de marge vide** autour du personnage : recadre au plus près. Le cadrage
   pilote directement la taille affichée, donc du vide se traduit par un
   personnage rapetissé.
3. **Pieds collés au bord bas** du cadre : c'est ce bord qui s'aligne sur le
   bandeau. Un espace en bas ferait « flotter » le personnage.
4. **Pose verticale**, plutôt étroite. Largeur idéale entre 45 % et 70 % de la
   hauteur (soit ~700 à 1100 px pour 1600 px de haut).

   > Une source **en paysage** (ex. 1200 × 900) n'abîme rien : un garde-fou
   > `max-w-[34%]` la réduit automatiquement pour l'empêcher de recouvrir le
   > texte. Mais elle s'affichera alors bien plus petite que prévu — d'où
   > l'intérêt d'exporter en portrait.
5. Ce qui dépasse en haut (arme levée, cape, effet) est **visible hors du cadre**
   du bandeau : c'est justement l'effet recherché.

### Affichage responsive

Le personnage est **masqué en dessous de 1024 px de large** : sous ce seuil le
bandeau devient portrait et le texte occupe toute la place. Le bloc de texte se
resserre automatiquement à 60 % de largeur quand un personnage est présent.

## Fallback

Si un fichier est absent, la carte et le bandeau conservent simplement leur
dégradé de couleur actuel — rien ne casse, et aucune requête 404 n'est émise
(l'existence est vérifiée côté serveur).

## Alternative : URL en base

Le champ `tournaments.cover_image` prime sur le fichier local s'il est renseigné,
pratique pour héberger les visuels sur un CDN.
