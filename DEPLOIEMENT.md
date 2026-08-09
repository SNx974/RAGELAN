# Déploiement sur Dokploy

Cible : **https://ragelan.rushxp.fr**

> ⚠️ Ce fichier est public sur GitHub. **Aucun mot de passe réel ne doit y figurer.**
> Les valeurs marquées `<...>` se saisissent uniquement dans l'interface Dokploy.

---

## 1. Créer l'application

Dans Dokploy : **Create Application** → **Provider : GitHub** (ou Git).

| Champ           | Valeur                                 |
| --------------- | -------------------------------------- |
| Repository      | `SNx974/RAGELAN`                       |
| Branch          | `main`                                 |
| Build Type      | **Dockerfile**                         |
| Dockerfile Path | `Dockerfile`                           |

Le port exposé par l'image est **3000**.

---

## 2. Variables d'environnement

À coller dans l'onglet **Environment** de l'application.

```env
DATABASE_URL=postgresql://postgres:<MOT_DE_PASSE>@<HOTE_INTERNE>:5432/LAN-RAGE
AUTH_SECRET=<CLE_32_CARACTERES_MINIMUM>
AUTH_COOKIE_NAME=rage_session

NEXT_PUBLIC_APP_URL=https://ragelan.rushxp.fr
NEXT_PUBLIC_EVENT_NAME=R.A.G.E LAN 2
NEXT_PUBLIC_EVENT_DATE=2026-10-17

NODE_ENV=production
SEED=true
```

- `<MOT_DE_PASSE>` et `<HOTE_INTERNE>` : onglet **Internal Credentials** de ta
  base PostgreSQL dans Dokploy. Utilise bien l'**hôte interne**, pas `localhost` :
  le conteneur applicatif et la base sont deux services distincts.
- Si le mot de passe contient `@ : / ? # & %`, il doit être **encodé en
  pourcentage** dans l'URL (ex. `@` → `%40`), sinon la connexion échoue.
- `AUTH_SECRET` : 32 caractères minimum, sinon l'application refuse de démarrer.
  Génère-le avec `openssl rand -base64 32`.

### `SEED`

- **`true`** au premier déploiement : crée les 9 tournois, le plan de salle et
  les comptes staff.
- **`false`** ensuite. Le seed n'utilise que des *upserts* (il ne supprime ni ne
  duplique rien), mais le laisser actif réécrit les tournois à chaque
  redémarrage et annule les réglages faits depuis l'admin.

---

## 3. Domaine

Onglet **Domains** :

| Champ         | Valeur                |
| ------------- | --------------------- |
| Host          | `ragelan.rushxp.fr`   |
| Container Port| `3000`                |
| HTTPS         | activé (Let's Encrypt)|

Côté DNS, un enregistrement **A** `ragelan` → IP du serveur Dokploy.

---

## 4. Premier déploiement

Clique sur **Deploy**. Au démarrage, le conteneur enchaîne :

1. `prisma migrate deploy` — crée les tables (extension `citext` incluse)
2. `node seed.cjs` — insère les 9 tournois et les comptes staff
3. `node server.js` — démarre Next.js

Suis les logs Dokploy : les trois étapes s'affichent en clair.

---

## 5. Comptes créés

| Rôle          | Email              | Mot de passe |
| ------------- | ------------------ | ------------ |
| `SUPER_ADMIN` | `admin@ragelan.gg` | `RageLan2!`  |
| `ORGANIZER`   | `staff@ragelan.gg` | `RageLan2!`  |

**Change-les dès la première connexion** — ils sont écrits en clair dans ce dépôt public.

---

## 6. Mises à jour

Chaque `git push` sur `main` peut redéclencher un déploiement si l'auto-deploy
est activé dans Dokploy (webhook GitHub). Sinon, bouton **Deploy**.

Les migrations futures se créent en local avec :

```bash
npx prisma migrate dev --name description_du_changement
```

puis se committent — `migrate deploy` les appliquera au prochain démarrage.

---

## Dépannage

| Symptôme                              | Cause probable                                    |
| ------------------------------------- | ------------------------------------------------- |
| `DATABASE_URL n'est pas defini`       | Variable absente dans Dokploy                     |
| `Authentication failed`               | Mot de passe erroné ou caractères non encodés     |
| `Can't reach database server`         | Hôte externe utilisé au lieu de l'hôte interne    |
| `AUTH_SECRET manquant ou trop court`  | Moins de 32 caractères                            |
| Page blanche sur `/tournois/<jeu>`    | Seed non exécuté (`SEED=true` au 1er déploiement) |
| **`Error: P3009`**                    | Migration précédente interrompue — voir ci-dessous |

### Résoudre un P3009

> `migrate found failed migrations in the target database`

Une migration s'est arrêtée en cours de route (base pas encore prête, coupure
réseau…). Prisma bloque alors tout déploiement suivant, par sécurité : il ne
sait pas quelles instructions ont été appliquées.

**Tant que la base ne contient aucune donnée à conserver**, le plus simple est
de repartir de zéro. Dans Dokploy : la base PostgreSQL → onglet terminal / ou
n'importe quel client `psql` connecté à `LAN-RAGE` :

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

Puis relance le déploiement. L'entrypoint attend désormais que PostgreSQL
réponde avant de migrer, ce qui évite que le problème se reproduise.

**Si la base contient déjà des inscriptions**, ne fais surtout pas le `DROP`.
Lis d'abord l'erreur d'origine :

```sql
SELECT migration_name, started_at, finished_at, logs
FROM _prisma_migrations
ORDER BY started_at DESC;
```
