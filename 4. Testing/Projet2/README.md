# Tests du contrat Voting

Tests écrits en TypeScript (`mocha` + `ethers`) dans `test/Voting.ts` : 34 tests répartis en 7 groupes.

- **Déploiement** : propriétaire correct, statut initial `RegisteringVoters`, `winningProposalID` à 0.
- **Enregistrement des votants** : ajout par l'owner avec événement `VoterRegistered` ; refus si l'appelant n'est pas l'owner, si le votant est déjà inscrit ou si la phase est fermée.
- **Propositions** : ajout par un votant avec événement `ProposalRegistered` ; refus pour un non-votant, une proposition vide ou hors phase.
- **Session de vote** : vote avec événement `Voted` ; refus pour un non-votant, une proposition inexistante, un double vote ou hors phase.
- **Dépouillement** : `tallyVotes` désigne la proposition gagnante ; réservé à l'owner et seulement après la fin du vote.
- **Workflow** : chaque passage d'un statut au suivant émet `WorkflowStatusChange` ; chaque transition faite au mauvais moment est rejetée.
- **Getters** : `winningProposalID`, `getVoter` et `getOneProposal` renvoient les bonnes valeurs ; refus pour un non-votant et panic `0x32` pour une proposition inexistante.

Lancer les tests :

```shell
npx hardhat test
```
