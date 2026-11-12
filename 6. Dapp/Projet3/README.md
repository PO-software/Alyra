# Voting DApp · Alyra Projet 3

DApp de vote construite sur le contrat `Voting.sol` (correction du défi « Système de vote » #2, avec une limite de 1000 propositions). Le contrat est la source de vérité : il n'est pas modifié par la DApp.

- **Démo en ligne (Sepolia)** : <!-- URL Vercel à compléter --> à venir
- **Vidéo de démonstration** : <!-- lien vidéo à compléter --> à venir
- **Dépôt GitHub** : https://github.com/PO-software/Alyra/tree/main/6.%20Dapp/Projet3

## Ce que permet la DApp

| Fonctionnalité demandée | Qui | Où dans l'interface |
|---|---|---|
| Enregistrer une liste blanche d'électeurs | Administrateur | « Vos actions » › Inscrire un électeur |
| Commencer l'enregistrement des propositions | Administrateur | « Ouvrir le dépôt des propositions » |
| Enregistrer ses propositions | Électeurs inscrits | « Déposer une proposition » |
| Mettre fin à l'enregistrement des propositions | Administrateur | « Clore le dépôt des propositions » |
| Commencer la session de vote | Administrateur | « Ouvrir la session de vote » |
| Voter pour sa proposition préférée | Électeurs inscrits | « Choisissez une proposition » › Voter |
| Mettre fin à la session de vote | Administrateur | « Clore la session de vote » |
| Comptabiliser les votes | Administrateur | « Comptabiliser les votes » |
| Consulter le résultat | **Tout le monde**, sans wallet | Carte « Proposition gagnante » à l'étape 6 |

Une seule page : une barre de progression des 6 étapes, à gauche les actions possibles **maintenant** pour le compte connecté, à droite les propositions et les électeurs, mis à jour en direct.

## Stack

- **Contrat** : Solidity 0.8.34, Hardhat 3, Ignition, OpenZeppelin `Ownable` (`backend/`)
- **Front** : Next.js (App Router), React, TypeScript, Tailwind CSS 4, shadcn/ui (`frontend/`)
- **Web3** : wagmi 2, viem, RainbowKit (wallets de navigateur, MetaMask)
- **Tests** : Mocha + ethers côté contrat, Vitest côté front
- **Gestionnaire de paquets** : pnpm

```
Projet3/
├── backend/    contrat, tests, module Ignition
├── frontend/   application Next.js
└── docs/       conception, plan d'implémentation, script de la démo
```

## Lancer en local

Prérequis : Node.js 24, pnpm ≥ 12.16.1, MetaMask.

```shell
# Terminal 1 : nœud Hardhat local (chain id 31337)
cd backend
pnpm install
pnpm node

# Terminal 2 : déploiement du contrat, puis le front
cd backend
pnpm deploy:local          # redéploie à neuf (--reset)
cd ../frontend
pnpm install
pnpm sync:local            # écrit l'adresse du contrat dans .env.local
pnpm dev                   # http://localhost:3000
```

Dans MetaMask, ajoutez le réseau **Hardhat** (RPC `http://127.0.0.1:8545`, chain id `31337`, symbole `ETH`) et importez les comptes de test affichés par `pnpm node`. Le pas-à-pas complet est dans [`docs/demo-script.md`](docs/demo-script.md).

Pour tester sans MetaMask, `NEXT_PUBLIC_DEV_WALLETS=true pnpm dev` affiche un panneau « Comptes de test Hardhat » qui permet de changer de compte en un clic. Ce panneau n'existe qu'en développement : il est retiré du build de production.

Après un redémarrage du nœud, relancez `pnpm deploy:local` : la page détecte la nouvelle chaîne et repart de l'étape 1, sans rechargement.

## Tests

```shell
cd backend && pnpm test                 # 89 tests du contrat (100 % des lignes)
cd frontend && pnpm test                # 109 tests du front (unitaires + chemin Sepolia via /api/rpc)
cd frontend && pnpm lint && pnpm typecheck && pnpm build
```

Les tests du front couvrent la logique sans interface : décodage des événements et des propositions, dépouillement et égalités, droits par rôle et par étape, validation des saisies, traduction des erreurs du contrat, synchronisation de l'historique, et la route `/api/rpc`.

## Déploiement

**Contrat sur Sepolia** (variables `SEPOLIA_RPC_URL` et `SEPOLIA_PRIVATE_KEY` dans le keystore Hardhat) :

```shell
cd backend
pnpm deploy:sepolia        # profil de build « production » : optimiseur activé
```

Le compte qui déploie devient l'administrateur. Le contrat public est volontairement laissé à l'étape 1 : le parcours complet est montré dans la vidéo, sur le nœud local.

**Front sur Vercel**, depuis `frontend/` avec la CLI Vercel :

```shell
pnpm dlx vercel link
pnpm dlx vercel env add SEPOLIA_RPC_URL production                     # URL Infura, côté serveur uniquement
pnpm dlx vercel env add NEXT_PUBLIC_VOTING_ADDRESS_SEPOLIA production
pnpm dlx vercel env add NEXT_PUBLIC_DEPLOYMENT_BLOCK_SEPOLIA production
pnpm dlx vercel --prod
```

Toutes les variables sont décrites dans [`frontend/.env.example`](frontend/.env.example). Le build de production n'expose que Sepolia.

## Sécurité côté DApp

- **Clé Infura jamais envoyée au navigateur** : les lectures sur Sepolia passent par la route serveur `/api/rpc`. Elle n'accepte qu'une liste blanche de méthodes de lecture, uniquement pour l'adresse du contrat Voting, refuse toute écriture, les requêtes trop grosses et les lots de plus de 20 appels, et ne renvoie jamais l'URL du nœud dans ses erreurs. Les transactions partent directement du wallet de l'utilisateur.
- **Seules les actions acceptées par le contrat sont proposées**, selon le rôle, l'étape et le réseau. Chaque transaction est d'abord simulée : une action devenue invalide (par exemple une étape déjà close depuis un autre onglet) échoue avant d'ouvrir le wallet.
- **Saisies vérifiées avant l'envoi** : adresse valide, non nulle et pas déjà inscrite ; proposition non vide, 280 caractères maximum, pas de doublon ; un seul vote.
- **Erreurs du contrat traduites en français**, refus dans le wallet signalé sans alarme.
- **Confirmation obligatoire** avant chaque changement d'étape, irréversible.
- `renounceOwnership` et `transferOwnership` ne sont exposés nulle part.
- Les descriptions des propositions sont affichées comme du texte, jamais comme du HTML.

## Limites connues

- **Le contrat n'est pas modifié**, donc certaines limites lui appartiennent :
  - les votes sont publics (événements `Voted`) ;
  - l'administrateur contrôle la liste blanche et le calendrier ;
  - un électeur qui appelle le contrat directement peut contourner les règles du front (doublons, textes longs) et occuper les 999 places de propositions ;
  - en cas d'égalité, la proposition au plus petit numéro l'emporte, et GENESIS (#0) gagne si personne ne vote.
- **Pour un visiteur**, les getters du contrat étant réservés aux électeurs, le texte des propositions est lu dans les données de la transaction `addProposal`. Si une proposition a été déposée via un autre contrat (smart wallet), son texte apparaît comme « Description indisponible », sauf pour un électeur connecté.
- **La route `/api/rpc` n'a pas de limitation de débit.**
