# Script de la vidéo de démonstration

Enregistrement sur le **nœud Hardhat local** : comptes déjà approvisionnés, transactions instantanées. Durée visée : 4 à 6 minutes.

## 1. Préparation (avant d'enregistrer)

### Lancer le projet

```shell
# Terminal 1
cd "6. Dapp/Projet3/backend"
pnpm node

# Terminal 2
cd "6. Dapp/Projet3/backend"
pnpm deploy:local
cd ../frontend
pnpm sync:local
pnpm dev
```

Ouvrez http://localhost:3000.

### Configurer MetaMask

1. **Ajouter le réseau** : Réseaux › Ajouter un réseau manuellement
   - Nom : `Hardhat`
   - URL RPC : `http://127.0.0.1:8545`
   - Chain ID : `31337`
   - Symbole : `ETH`
2. **Importer les 5 comptes de test** : Comptes › Ajouter un compte › Importer un compte, avec les clés privées ci-dessous (ce sont celles affichées par `pnpm node`). Renommez-les pour la vidéo.

| Compte | Nom conseillé | Adresse | Clé privée |
|---|---|---|---|
| #0 | Admin | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| #1 | Électeur 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| #2 | Électeur 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| #3 | Électeur 3 | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |
| #4 | Visiteur | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a` |

> ⚠️ **Ces clés sont publiques** : tout le monde les connaît. N'envoyez jamais de vrais fonds à ces adresses, sur aucun réseau.

### Après chaque redémarrage du nœud

Le nœud repart de zéro, mais MetaMask garde l'ancien historique et les anciens nonces, ce qui fait échouer les transactions. Pour chaque compte importé : **Paramètres › Avancé › Effacer les données de l'onglet activité**. Relancez ensuite `pnpm deploy:local` (et `pnpm sync:local` si l'adresse a changé).

## 2. Déroulé de la vidéo

Pour changer de compte : menu des comptes de MetaMask, puis « Connecter » si la DApp le demande. La page se met à jour sans rechargement.

### Scène 1 · La page publique (sans wallet)
- Montrer la page : étape 1 sur 6, « 0 électeur inscrit pour l'instant ».
- *À dire* : « Tout le monde peut suivre le scrutin sans wallet. Les données viennent directement des événements du contrat. »

### Scène 2 · L'administrateur inscrit les électeurs
- Se connecter avec **Admin** : le badge « Admin » apparaît.
- Taper `abc` dans « Inscrire un électeur » puis cliquer ailleurs : « Adresse Ethereum invalide. », le bouton reste grisé.
- Inscrire les adresses de **Électeur 1, 2 et 3** (copiées depuis MetaMask), en confirmant chaque transaction.
- Recoller l'adresse d'Électeur 1 : « Cette adresse est déjà inscrite. »
- *À dire* : « Le front bloque les saisies invalides avant même d'ouvrir MetaMask. »

### Scène 3 · Ouverture du dépôt des propositions
- Cliquer sur « Ouvrir le dépôt des propositions » : la boîte de confirmation rappelle « 3 électeurs inscrits ». Confirmer, puis valider dans MetaMask.
- *À dire* : « Chaque changement d'étape est irréversible : la DApp demande une confirmation. »

### Scène 4 · Les électeurs déposent leurs propositions
- **Électeur 1** : « Parc municipal ».
- **Électeur 2** : « Piste cyclable ». Essayer « parc MUNICIPAL » : « Cette proposition existe déjà. »
- **Électeur 3** : « Médiathèque ».
- Montrer le compteur `n/280` et « Encore … propositions possibles ».

### Scène 5 · Un visiteur ne peut rien faire
- Se connecter avec **Visiteur** : badge « Visiteur », aucune action, message « Votre adresse n'est pas inscrite comme électeur… ».
- *À dire* : « Les boutons d'administration n'existent que pour l'administrateur, les formulaires que pour les électeurs. »

### Scène 6 · L'administrateur ouvre le vote
- **Admin** : « Clore le dépôt des propositions », puis « Ouvrir la session de vote ».

### Scène 7 · Les électeurs votent
- **Électeur 1** vote pour #1, **Électeur 2** pour #2, **Électeur 3** pour #1.
- Montrer « x votes sur 3 électeurs » : le détail par proposition reste caché jusqu'au dépouillement.
- Revenir sur **Électeur 1** : « Vous avez voté pour #1 : Parc municipal », plus de formulaire de vote.
- *À dire* : « Un électeur ne peut voter qu'une fois ; les résultats partiels ne sont pas affichés pour ne pas influencer le vote. »

### Scène 8 · Clôture et dépouillement
- **Admin** : « Clore la session de vote » (la confirmation rappelle « 3 votes sur 3 électeurs »), puis « Comptabiliser les votes ».

### Scène 9 · Le résultat, pour tout le monde
- La carte « Proposition gagnante » affiche **#1 Parc municipal, 2 votes**, puis le classement complet.
- Déconnecter le wallet : le résultat reste visible.
- *À dire* : « Le résultat est public et lisible sans wallet. »

## 3. Conclusion (facultatif)

Montrer rapidement le site déployé sur Vercel (Sepolia, à l'étape 1) et rappeler que la clé Infura reste côté serveur grâce à la route `/api/rpc`.
