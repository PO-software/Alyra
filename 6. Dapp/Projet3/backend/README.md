# Contrat Voting

Contrat `contracts/Voting.sol`, ses tests et son module de déploiement Ignition (`ignition/modules/Voting.ts`). Vue d'ensemble du projet : voir le [README du projet](../README.md).

```shell
pnpm test             # 89 tests
pnpm node             # nœud Hardhat local (chain id 31337)
pnpm deploy:local     # déploie à neuf sur le nœud local (--reset)
pnpm deploy:sepolia   # déploie sur Sepolia (keystore : SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY)
```

## Tests

Tests écrits en TypeScript (`mocha` + `ethers`) dans `test/Voting.ts` : 89 tests, 100 % des lignes de `Voting.sol` couvertes.

Chaque test part d'une fixture (`loadFixture`) correspondant à un statut du workflow : `deployFixture`, `votersRegisteredFixture`, `proposalsStartedFixture`, `proposalsEndedFixture`, `votingStartedFixture`, `votingEndedFixture`, `talliedFixture`. La fixture `oneProposalSlotLeftFixture` remplit le tableau à 999 propositions (GENESIS comprise) pour tester la limite. L'état est restauré par snapshot entre les tests, sans redéployer le contrat.

- **Déploiement** : propriétaire correct, statut initial `RegisteringVoters`, `winningProposalID` à 0, aucune proposition.
- **`addVoter`** : événement `VoterRegistered` et votant enregistré ; refus si l'appelant n'est pas l'owner, si le votant est déjà inscrit, et dans chacun des 5 autres statuts.
- **`addProposal`** : proposition `GENESIS` à l'id 0, ids séquentiels, description stockée, plusieurs propositions par votant, doublons acceptés ; refus pour une proposition vide, un non-votant, l'owner non inscrit, et dans chacun des 5 autres statuts. Limite de 1000 propositions, GENESIS comprise : l'id 999 est accepté, la suivante est refusée, et `tallyVotes` fonctionne toujours avec le tableau plein.
- **`setVote`** : événement `Voted`, vote enregistré sur le votant et sur la proposition, vote pour `GENESIS` et pour le dernier id ; refus pour l'id suivant, un double vote, un non-votant, l'owner non inscrit, et dans chacun des 5 autres statuts.
- **Transitions du workflow** : pour chacune des 5 fonctions, passage au statut suivant avec `WorkflowStatusChange`, refus pour un non-owner, et refus depuis chacun des 5 autres statuts.
- **Dépouillement** : `winningProposalID` reste à 0 avant `tallyVotes` ; le gagnant est la proposition la plus votée ; une proposition plus récente peut gagner ; en cas d'égalité l'id le plus bas l'emporte ; sans vote, `GENESIS` gagne.
- **Getters** : `getVoter` renvoie un enregistrement vide pour une adresse inconnue et le bulletin d'un autre votant ; `getVoter` et `getOneProposal` refusent un non-votant ; panic `0x32` pour une proposition inexistante.

Lancer les tests :

```shell
pnpm test
pnpm hardhat test mocha --coverage   # avec couverture
```
