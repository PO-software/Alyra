# Voting DApp · front

Application Next.js du projet. Installation, lancement, variables d'environnement et déploiement : voir le [README du projet](../README.md).

```shell
pnpm dev          # http://localhost:3000
pnpm test         # tests unitaires (Vitest)
pnpm lint && pnpm typecheck && pnpm build
pnpm abi          # régénère src/contracts/votingAbi.ts après une compilation du contrat
pnpm sync:local   # recopie l'adresse du déploiement local dans .env.local
```
