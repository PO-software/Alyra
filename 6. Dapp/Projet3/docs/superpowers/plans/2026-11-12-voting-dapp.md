# Voting DApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A one-page French DApp for the unchanged `Voting.sol`. It covers every role
(admin, voter, visitor), runs on a local Hardhat node for the demo, and is deployed on Vercel
against a Sepolia contract.

**Architecture:** `6. Dapp/Projet3/` is split into `backend/` (the existing Hardhat project,
moved as-is) and `frontend/` (Next.js App Router). The frontend builds its state from public
contract events, plus proposal texts decoded from transaction calldata, through pure
TypeScript modules that are unit-tested with Vitest. React hooks and shadcn/ui components
consume those modules. On Sepolia, reads go through a server-side `/api/rpc` route that
holds the Infura URL and only forwards the requests the app needs, for the Voting contract
only.

**Tech Stack:** pnpm · Hardhat 3 + Ignition · Next.js (App Router) · React · TypeScript ·
Tailwind CSS 4 · shadcn/ui · wagmi 2 · viem 2 · @tanstack/react-query 5 · RainbowKit 2 ·
sonner · Vitest.

**Spec:** `6. Dapp/Projet3/docs/superpowers/specs/2026-11-12-voting-dapp-design.md`. Read it
before any task. Section numbers below ("spec 5.3") refer to it.

## Global Constraints

- `backend/contracts/Voting.sol` is never edited. Its sha256 must stay
  `5aa4541b6ab18554e0cacc4f179ebf6ec3f17922f57db0a8213e961d5d7deb0e`.
- The 89 contract tests keep passing.
- Paths contain spaces (`6. Dapp`): always quote them in shell commands.
- pnpm ≥ 12.16.1. This machine enforces `minimumReleaseAge` = 7 days, so never pin a version
  pnpm refuses; let pnpm resolve `@latest` / `^major`. If pnpm blocks a dependency's build
  script, add that package to `allowBuilds` in the project's `pnpm-workspace.yaml` and
  reinstall.
- `wagmi@^2` (RainbowKit 2.2.x declares the peer `wagmi ^2.9.0`), `viem@^2`,
  `@tanstack/react-query@^5`, `@rainbow-me/rainbowkit@^2`. Next/React/Tailwind/shadcn: latest
  mature.
- UI copy is French. Code, identifiers and comments are English.
- The RainbowKit wallet list contains only `injectedWallet`. MetaMask appears through
  EIP-6963 in RainbowKit's "Installed" section. The app makes no WalletConnect network
  requests.
- `SEPOLIA_RPC_URL` (full Infura URL) is server-only and never prefixed `NEXT_PUBLIC_`.
- Production builds expose **Sepolia only**. Development exposes Hardhat (31337) first, plus
  Sepolia when configured.
- `renounceOwnership` and `transferOwnership` never appear in the UI.
- An action is rendered only if the contract would accept it for the current account, role,
  status and chain (spec 5.3).
- Per-proposal vote counts are hidden until status 5 (VotesTallied).
- `MAX_PROPOSALS = 1000` (GENESIS included, so voters get 999) and
  `MAX_DESCRIPTION_LENGTH = 280` (Unicode code points).
- Work on branch `feat/projet3-dapp`. Every commit message ends with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pushing is done only after the user
  confirms.

**Hardhat test accounts** (public, well-known keys; used in tests, dev wallets and the
demo):

| # | Address | Role in demo |
|---|---|---|
| 0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | admin (deployer) |
| 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | voter |
| 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | voter |
| 3 | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | voter |
| 4 | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | visitor (never registered) |

The first deployment by #0 on a fresh node lands at
`0x5FbDB2315678afecb367f032d93F642f64180aa3`.

## Review Focus

These are the failure modes most likely to bite a real user that no feature test covers by
default. Each is pinned by a test in the task named on its line.

1. **Local node restarted while the page is open** (chain rewound, or no contract at the
   configured address). The page shows a clear "contract not found" notice, then recovers
   after a redeploy, without a reload and without stale data. Pinned in Task 7 (`LogSync`
   rewind, `fetchVotingSnapshot` not-deployed) and Task 12 (browser).
2. **The user rejects a transaction in MetaMask, or it reverts because the state changed
   between render and click.** The user gets a French message, the button leaves its busy
   state, and the data refreshes. Pinned in Task 6 (`toFrenchError`) and Task 12 (browser).
3. **The account is switched in MetaMask mid-session** (admin to voter, or voter to visitor).
   The role badge and the actions panel update immediately, and forms reset. Pinned in
   Task 6 (`getRole`) and Task 12 (browser).
4. **Long, Unicode or odd descriptions**, including ones submitted straight to the contract
   and so bypassing the UI's rules (281+ characters, emoji, no spaces, duplicates). Length
   counts code points, and the text renders as plain text without breaking the layout.
   Pinned in Task 4 (Unicode decode), Task 6 (code-point length) and Task 12 (no horizontal
   overflow).
5. **No wallet installed, or the wallet on an unsupported network.** Reading still works and
   no action is offered. Pinned in Task 6 (`allowedActions` with `isCorrectChain: false`)
   and Task 12 (browser without wallet).

---

## File map

```
6. Dapp/Projet3/
├── .gitignore                         # new: .superpowers/
├── README.md                          # new (Task 13): project overview & deliverables
├── docs/demo-script.md                # new (Task 13), French
├── backend/                           # Task 1: everything Hardhat, moved with git mv
│   ├── ignition/modules/Voting.ts     # renamed from Counter.ts
│   └── package.json                   # + scripts
└── frontend/
    ├── .env.example
    ├── scripts/export-abi.mjs              # backend artifact → src/contracts/votingAbi.ts
    ├── scripts/sync-local-deployment.mjs   # Ignition chain-31337 → .env.local
    ├── vitest.config.mts
    └── src/
        ├── app/{layout.tsx,page.tsx,globals.css}
        ├── app/api/rpc/route.ts
        ├── contracts/votingAbi.ts           # generated, committed
        ├── config/{deployments.ts,chains.ts,wagmi.ts}
        ├── lib/chain/logs.ts                # adaptive getLogs + incremental LogSync
        ├── lib/rpc/guard.ts                 # proxy allowlist & address lock
        ├── lib/voting/{status,events,model,tally,permissions,validation,errors,descriptions,snapshot}.ts
        ├── hooks/{use-app-chain,use-voting-data,use-voting-action}.ts
        └── components/
            ├── providers.tsx, dev-wallets.tsx, ui/*  (shadcn)
            └── voting/{header,progress-steps,actions-panel,add-voter-form,add-proposal-form,
                        vote-form,phase-control,proposals-list,voters-list,result-card,status-notice}.tsx
```

Tests live next to their module as `*.test.ts`.

---

### Task 1: Move the Hardhat project into `backend/`

**Files:**
- Move (git mv): `.agents/`, `.claude`, `.gitignore`, `.npmignore`, `AGENTS.md`, `CLAUDE.md`,
  `README.md`, `contracts/`, `hardhat.config.ts`, `ignition/`, `package.json`,
  `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `test/`, `tsconfig.json` → `backend/`
- Rename: `backend/ignition/modules/Counter.ts` → `backend/ignition/modules/Voting.ts`
  (module id `VotingModule` unchanged)
- Delete: `.gitkeep`
- Modify: `backend/package.json` (add scripts), `backend/.gitignore` (add `/ignition/deployments/chain-31337`)
- Create: `6. Dapp/Projet3/.gitignore` containing `.superpowers/`

**Interfaces:**
- Produces: `backend` scripts `test` = `hardhat test`, `node` = `hardhat node`,
  `deploy:local` = `hardhat ignition deploy ignition/modules/Voting.ts --network localhost --reset`,
  `deploy:sepolia` = `hardhat ignition deploy ignition/modules/Voting.ts --network sepolia`
  (Ignition already defaults to the `production` build profile). Artifact path used by Task 3:
  `backend/artifacts/contracts/Voting.sol/Voting.json`. Local deployment record:
  `backend/ignition/deployments/chain-31337/deployed_addresses.json`, key `"VotingModule#Voting"`.

- [ ] **Step 1:** `git mv` the listed paths into `backend/`, `git rm .gitkeep`, rename the
  Ignition module. The relative symlinks `.claude → .agents` and `CLAUDE.md → AGENTS.md` must
  still resolve (`ls -L backend/CLAUDE.md`).
- [ ] **Step 2:** Delete the untracked build folders left at the Projet3 root (`node_modules`,
  `artifacts`, `cache`, `types`, `coverage`), then run
  `pnpm install --frozen-lockfile` in `backend/`.
- [ ] **Step 3:** Add the scripts, the `.gitignore` lines, and the root `.gitignore`.
- [ ] **Step 4: Verify the contract and tests are untouched.**
  Run in `backend/`: `sha256sum contracts/Voting.sol && pnpm test`.
  Expected: the hash from Global Constraints and `89 passing`.
- [ ] **Step 5: Verify the local deploy.** Start `pnpm node` in the background, run
  `pnpm deploy:local`, then read `ignition/deployments/chain-31337/deployed_addresses.json`.
  Expected: `"VotingModule#Voting": "0x5FbDB2315678afecb367f032d93F642f64180aa3"`. If `--reset`
  asks for confirmation, find the non-interactive form and put it in the script. Stop the
  node. `git status` must not list `chain-31337`.
- [ ] **Step 6: Commit** `projet3: move Hardhat project into backend/`.

---

### Task 2: Scaffold the Next.js frontend

**Files:**
- Create: `frontend/` via create-next-app, shadcn/ui components in `frontend/src/components/ui/`,
  `frontend/vitest.config.mts`
- Modify: `frontend/package.json`, `frontend/.gitignore`, `frontend/src/app/layout.tsx`,
  `frontend/src/app/globals.css`, `frontend/src/app/page.tsx`

**Interfaces:**
- Produces: the alias `@/*` → `src/*`; scripts `dev`, `build`, `lint`, `test`
  (`vitest run --passWithNoTests`), `typecheck` (`tsc --noEmit`). shadcn components:
  `button card input label badge alert-dialog radio-group sonner separator skeleton`.

- [ ] **Step 1:** From `6. Dapp/Projet3/`:
  `pnpm dlx create-next-app@latest frontend --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --disable-git --yes`.
  Add the same `devEngines.packageManager` block as `backend/package.json`.
- [ ] **Step 2:** In `frontend/`: `pnpm dlx shadcn@latest init -d --no-monorepo`, then add the
  components listed above. Theme (spec style C): neutral greys, with `--primary` set to
  emerald (light: emerald-600, dark: emerald-500) through the shadcn CSS variables. Light by
  default, dark via `prefers-color-scheme`.
- [ ] **Step 3:** `pnpm add wagmi@^2 viem@^2 @tanstack/react-query@^5 @rainbow-me/rainbowkit@^2`
  and `pnpm add -D vitest vite-tsconfig-paths`. Create `vitest.config.mts`
  (`tsconfigPaths()` plugin, `environment: 'node'`, `include: ['src/**/*.test.ts']`). Add the
  scripts.
- [ ] **Step 4:** `layout.tsx`: `<html lang="fr">`, metadata title `Voting · Alyra`, a French
  description. Replace the starter `page.tsx` with a placeholder heading. `.gitignore`: add
  `!.env.example` after the `.env*` rule.
- [ ] **Step 5: Verify.** Run in `frontend/`: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
  Expected: all exit 0.
- [ ] **Step 6: Commit** `projet3: scaffold Next.js frontend with shadcn/ui and wagmi`.

---

### Task 3: ABI export, deployment config, local sync

**Files:**
- Create: `frontend/scripts/export-abi.mjs`, `frontend/scripts/sync-local-deployment.mjs`,
  `frontend/src/contracts/votingAbi.ts` (generated), `frontend/src/config/deployments.ts`,
  `frontend/src/config/deployments.test.ts`, `frontend/.env.example`
- Modify: `frontend/package.json` (scripts `abi`, `sync:local`)

**Interfaces:**
- Consumes: the artifact and deployment paths from Task 1.
- Produces:
  - `src/contracts/votingAbi.ts`: `export const votingAbi = [...] as const`, with a first-line
    comment `// Generated by scripts/export-abi.mjs from backend/artifacts. Do not edit.`
  - `src/config/deployments.ts`:
    ```ts
    export type Deployment = { chainId: number; address: Address; deploymentBlock: bigint }
    export function parseDeployment(chainId: number, address: string | undefined, block: string | undefined): Deployment | undefined
    export function getDeployment(chainId: number): Deployment | undefined
    ```
    It is built from `NEXT_PUBLIC_VOTING_ADDRESS_SEPOLIA`, `NEXT_PUBLIC_DEPLOYMENT_BLOCK_SEPOLIA`,
    `NEXT_PUBLIC_VOTING_ADDRESS_HARDHAT` and `NEXT_PUBLIC_DEPLOYMENT_BLOCK_HARDHAT`, each read
    with a literal `process.env.NAME` so Next can inline it.
  - `pnpm sync:local` upserts `NEXT_PUBLIC_VOTING_ADDRESS_HARDHAT=<addr>` and
    `NEXT_PUBLIC_DEPLOYMENT_BLOCK_HARDHAT=0` in `frontend/.env.local`, keeping other lines.

- [ ] **Step 1: Write the failing tests** in `deployments.test.ts`:
  ```ts
  it('parses a valid deployment', () => {
    expect(parseDeployment(11155111, '0x5fbdb2315678afecb367f032d93f642f64180aa3', '7000000'))
      .toEqual({ chainId: 11155111, address: '0x5FbDB2315678afecb367f032d93F642f64180aa3', deploymentBlock: 7000000n })
  })
  it('defaults the block to 0n', () => expect(parseDeployment(31337, VALID, undefined)?.deploymentBlock).toBe(0n))
  it('rejects a missing address', () => expect(parseDeployment(31337, undefined, '0')).toBeUndefined())
  it('rejects an invalid address', () => expect(parseDeployment(31337, '0x123', '0')).toBeUndefined())
  it('rejects a non-numeric block', () => expect(parseDeployment(31337, VALID, 'abc')).toBeUndefined())
  ```
- [ ] **Step 2:** `pnpm test`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `parseDeployment` (viem `isAddress` + `getAddress`; the block must
  match `/^\d+$/`) and `getDeployment`. Write both scripts. The export script fails with a
  clear message if the artifact is missing ("run `pnpm hardhat build` in backend/ first").
  `.env.example` lists every variable with a French comment: the four above,
  `SEPOLIA_RPC_URL` (server-only), and `NEXT_PUBLIC_DEV_WALLETS`.
- [ ] **Step 4:** Run `pnpm hardhat build` in `backend/`, then `pnpm abi && pnpm test && pnpm typecheck`
  in `frontend/`. Expected: tests pass, and `votingAbi.ts` contains `"addProposal"` and
  `"OwnableUnauthorizedAccount"`.
- [ ] **Step 5: Commit** `projet3: typed Voting ABI and per-network deployment config`.

---

### Task 4: Workflow status and event decoding

**Files:**
- Create: `frontend/src/lib/voting/status.ts`, `frontend/src/lib/voting/events.ts`,
  `frontend/src/lib/voting/events.test.ts`, `frontend/src/lib/voting/status.test.ts`

**Interfaces:**
- Consumes: `votingAbi` (Task 3).
- Produces:
  ```ts
  // status.ts
  export const WorkflowStatus = { RegisteringVoters: 0, ProposalsRegistrationStarted: 1, ProposalsRegistrationEnded: 2,
    VotingSessionStarted: 3, VotingSessionEnded: 4, VotesTallied: 5 } as const
  export type WorkflowStatus = (typeof WorkflowStatus)[keyof typeof WorkflowStatus]
  export function toWorkflowStatus(value: number | bigint): WorkflowStatus   // throws RangeError outside 0..5
  export const STATUS_STEPS: readonly { status: WorkflowStatus; label: string }[]
  // events.ts
  type Meta = { blockNumber: bigint; logIndex: number; transactionHash: Hash }
  export type VotingEvent =
    | ({ type: 'VoterRegistered'; voter: Address } & Meta)
    | ({ type: 'ProposalRegistered'; proposalId: bigint } & Meta)
    | ({ type: 'Voted'; voter: Address; proposalId: bigint } & Meta)
    | ({ type: 'WorkflowStatusChange'; previousStatus: WorkflowStatus; newStatus: WorkflowStatus } & Meta)
  export function parseVotingLogs(logs: readonly Log[]): VotingEvent[]
  export function decodeProposalDescription(input: Hex): string | null
  ```
  `STATUS_STEPS` labels, exact copy: `Inscription des électeurs`, `Dépôt des propositions`,
  `Propositions closes`, `Vote en cours`, `Vote clos`, `Résultats`.

- [ ] **Step 1: Write the failing tests.** Build real logs with viem `encodeEventTopics` and
  `encodeAbiParameters` against `votingAbi` (one small helper in the test file).
  - `parses VoterRegistered, ProposalRegistered, Voted and WorkflowStatusChange`: each field
    equals the encoded value, and addresses come back checksummed.
  - `ignores OwnershipTransferred and unknown logs`: result length is 0.
  - `sorts by blockNumber then logIndex`: input order (block 5, idx 1), (5, 0), (2, 3) gives
    output (2, 3), (5, 0), (5, 1).
  - `decodes a Unicode description`:
    `decodeProposalDescription(encodeFunctionData({ abi: votingAbi, functionName: 'addProposal', args: ['Parc 🌳 municipal'] }))`
    is `'Parc 🌳 municipal'`.
  - `returns null for other calldata`: `setVote(1n)` calldata, `'0x'` and `'0xdeadbeef'` all
    give `null`.
  - status: `STATUS_STEPS.map(s => s.label)` equals the six labels above;
    `toWorkflowStatus(6)` throws.
- [ ] **Step 2:** `pnpm test`. Expected: FAIL.
- [ ] **Step 3:** Implement with viem `parseEventLogs({ abi: votingAbi, logs, strict: true })`
  and `decodeFunctionData` in a try/catch.
- [ ] **Step 4:** `pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `projet3: decode Voting events and proposal calldata`.

---

### Task 5: Voting model and tally

**Files:**
- Create: `frontend/src/lib/voting/model.ts`, `frontend/src/lib/voting/tally.ts`, and a
  `*.test.ts` for each

**Interfaces:**
- Consumes: `VotingEvent`, `WorkflowStatus` (Task 4).
- Produces:
  ```ts
  // model.ts
  export const GENESIS_DESCRIPTION = 'GENESIS'
  export type Proposal = { id: bigint; description: string | null; isGenesis: boolean }
  export type VotingModel = {
    voters: Address[]                    // checksummed, registration order, unique
    proposals: Proposal[]                // GENESIS (id 0n) first when status >= 1, then by id
    votes: ReadonlyMap<Address, bigint>  // checksummed voter -> proposalId
  }
  export function buildVotingModel(args: { events: readonly VotingEvent[]; descriptions: ReadonlyMap<bigint, string | null>;
    status: WorkflowStatus }): VotingModel
  // tally.ts
  export type TallyRow = { proposalId: bigint; votes: number }
  export type Tally = { rows: TallyRow[]; totalVotes: number; leaders: bigint[]; isTie: boolean }
  export function computeTally(proposals: readonly Proposal[], votes: ReadonlyMap<Address, bigint>): Tally
  ```
  `rows` covers every proposal (zero-vote ones included), sorted by votes descending, then
  id ascending. `leaders` = the ids holding the maximum, ascending, so `leaders[0]` is the
  contract's winner. `isTie = leaders.length > 1 && max > 0`.

- [ ] **Step 1: Write the failing tests.**
  - model: status 0 → `proposals` is empty. Status 1 with ProposalRegistered 1 and 2 and
    descriptions `{1: 'Parc', 2: null}` → `[{0n,'GENESIS',true},{1n,'Parc',false},{2n,null,false}]`.
    Voters keep registration order. A `Voted` event fills `votes`.
  - tally, mirroring the contract tests' fixture: votes #1→1, #2→2, #3→1 → rows
    `[{1n,2},{2n,1},{0n,0},{3n,0}]`, `totalVotes 3`, `leaders [1n]`, `isTie false`.
  - tie: votes →3, →2 → `leaders [2n, 3n]`, `isTie true`, and row 2 comes before row 3.
  - no votes: `totalVotes 0`, `isTie false`, `leaders[0] === 0n`.
- [ ] **Step 2:** `pnpm test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `projet3: voting model and tally with tie detection`.

---

### Task 6: Roles, allowed actions, input validation, French errors

**Files:**
- Create: `frontend/src/lib/voting/permissions.ts`, `validation.ts`, `errors.ts`, and a
  `*.test.ts` for each

**Interfaces:**
- Consumes: `WorkflowStatus` (Task 4), `votingAbi` (Task 3).
- Produces:
  ```ts
  // permissions.ts
  export type Role = { isAdmin: boolean; isVoter: boolean }
  export type Action = 'addVoter' | 'addProposal' | 'vote' | 'startProposalsRegistering' | 'endProposalsRegistering'
    | 'startVotingSession' | 'endVotingSession' | 'tallyVotes'
  export function getRole(account: Address | undefined, owner: Address | undefined, voters: readonly Address[]): Role
  export function allowedActions(args: { role: Role; status: WorkflowStatus; hasVoted: boolean; proposalCount: number;
    isCorrectChain: boolean }): Action[]
  // validation.ts
  export const MAX_PROPOSALS = 1000
  export const MAX_DESCRIPTION_LENGTH = 280
  export function validateVoterAddress(input: string, registered: readonly Address[]):
    { ok: true; address: Address } | { ok: false; error: string }
  export function validateProposal(input: string, existing: readonly (string | null)[], proposalCount: number):
    { ok: true; description: string } | { ok: false; error: string }
  // errors.ts
  export function toFrenchError(error: unknown): string
  export function isUserRejection(error: unknown): boolean
  ```
  `allowedActions` rules: wrong chain → `[]`. Admin: status 0 → `addVoter`,
  `startProposalsRegistering`; 1 → `endProposalsRegistering`; 2 → `startVotingSession`;
  3 → `endVotingSession`; 4 → `tallyVotes`. Voter: status 1 and `proposalCount < 1000` →
  `addProposal`; status 3 and `!hasVoted` → `vote`. A role holding both gets the union.
  `proposalCount` includes GENESIS.

  Validation messages (exact copy, checked in this order):
  - address: `Adresse Ethereum invalide.` (fails viem `isAddress`) ·
    `L'adresse zéro ne peut pas être inscrite.` · `Cette adresse est déjà inscrite.`
  - proposal: `La proposition ne peut pas être vide.` (empty after trim) ·
    `280 caractères maximum.` (`[...trimmed].length > 280`) ·
    `Cette proposition existe déjà.` (trimmed, `toLocaleLowerCase('fr')`, compared against
    existing descriptions, GENESIS included) ·
    `Le nombre maximum de propositions (1000, GENESIS comprise) est atteint.`
    (`proposalCount >= 1000`)
  - the `ok` value is the checksummed address, or the trimmed description.

  `toFrenchError` mapping (find the revert with `BaseError.walk` →
  `ContractFunctionRevertedError`, using `.reason` or `.data.errorName`):

  | Contract reason | French |
  |---|---|
  | `You're not a voter` | `Vous n'êtes pas inscrit comme électeur.` |
  | `Voters registration is not open yet` | `L'inscription des électeurs est close.` |
  | `Already registered` | `Cette adresse est déjà inscrite.` |
  | `Proposals are not allowed yet` | `Le dépôt des propositions n'est pas ouvert.` |
  | `Le nombre de propositions est limite a 1000` | `Le nombre maximum de propositions est atteint.` |
  | `Vous ne pouvez pas ne rien proposer` | `La proposition ne peut pas être vide.` |
  | `Voting session havent started yet` | `La session de vote n'est pas ouverte.` |
  | `You have already voted` | `Vous avez déjà voté.` |
  | `Proposal not found` | `Cette proposition n'existe pas.` |
  | the 4 transition reasons (spec 8) | `Cette étape n'est pas disponible dans la phase actuelle.` |
  | `OwnableUnauthorizedAccount` | `Action réservée à l'administrateur.` |
  | `UserRejectedRequestError` anywhere in the chain | `Transaction annulée dans le wallet.` |
  | anything else | `La transaction a échoué. Réessayez.` |

- [ ] **Step 1: Write the failing tests.**
  - `allowedActions`: a table test over all 6 statuses for admin-only, voter-only, both, and
    visitor, against the rules above. `isCorrectChain: false` gives `[]` for admin+voter at
    every status. `proposalCount` 999 still allows `addProposal`; 1000 removes it.
    `hasVoted: true` removes `vote`.
  - `getRole`: owner compared case-insensitively (lowercased account → admin). An
    `undefined` account gives `{false, false}`. **Switching from account #0 to #1** with
    `voters = [#1]` goes from `{true, false}` to `{false, true}`.
  - validation: every message above. `'0x70997970c51812dc3a010c7d01b50e0d17dc79c8'` (all
    lowercase) is accepted and returned checksummed. A bad mixed-case checksum is rejected as
    invalid. **280 × '🌳' is ok, 281 × '🌳' is rejected.** `'   '` is empty.
    `'  parc MUNICIPAL '` against `['Parc municipal']` is a duplicate. `'genesis'` against
    `['GENESIS']` is a duplicate. The ok value is trimmed.
  - errors: build `ContractFunctionExecutionError(new ContractFunctionRevertedError({ abi: votingAbi, functionName: 'setVote', message: 'You have already voted' }), { abi: votingAbi, functionName: 'setVote' })`
    → `Vous avez déjà voté.` Build `OwnableUnauthorizedAccount` with `encodeErrorResult` as
    `data` → the admin message. Wrap `new UserRejectedRequestError(new Error('x'))` → the
    rejection message, and `isUserRejection` returns true. `new Error('boom')` → the generic
    message.
- [ ] **Step 2:** `pnpm test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `projet3: roles, allowed actions, validation and French errors`.

---

### Task 7: Log sync, descriptions, snapshot

**Files:**
- Create: `frontend/src/lib/chain/logs.ts`, `frontend/src/lib/voting/descriptions.ts`,
  `frontend/src/lib/voting/snapshot.ts`, and a `*.test.ts` for each

**Interfaces:**
- Consumes: Tasks 3 to 6.
- Produces:
  ```ts
  // logs.ts
  export type ReadClient = Pick<PublicClient, 'getLogs' | 'getBlockNumber' | 'getTransaction' | 'getCode' | 'readContract'>
  export function getLogsAdaptive(client: ReadClient, args: { address: Address; fromBlock: bigint; toBlock: bigint }): Promise<Log[]>
  export class LogSync {
    constructor(client: ReadClient, address: Address, deploymentBlock: bigint)
    sync(): Promise<Log[]>   // all logs of the contract so far, in chain order
  }
  // descriptions.ts
  export function fetchDescriptions(client: ReadClient, events: readonly VotingEvent[],
    cache: Map<Hash, string | null>, concurrency?: number /* default 4 */): Promise<Map<bigint, string | null>>
  // snapshot.ts
  export type VotingSnapshot =
    | { kind: 'not-deployed' }
    | { kind: 'ready'; owner: Address; status: WorkflowStatus; winningProposalId: bigint; model: VotingModel; tally: Tally }
  export function fetchVotingSnapshot(args: { client: ReadClient; deployment: Deployment; logSync: LogSync;
    descriptionCache: Map<Hash, string | null>; account?: Address }): Promise<VotingSnapshot>
  ```
  - `getLogsAdaptive` requests every log of the address with one `eth_getLogs` per range (no
    event filter). On an error whose message matches
    `/range|limit|too many|exceed|10000|10,000/i`, it splits the range in two halves and
    retries each. Any other error, or a failing single-block range, is rethrown.
  - `LogSync.sync`: the first call covers `deploymentBlock..latest`, and later calls cover
    `lastSynced+1..latest`. If `latest < lastSynced` (chain rewound), it drops everything and
    resyncs from `deploymentBlock`. If `latest < deploymentBlock`, it returns `[]`.
  - `fetchDescriptions`: one `getTransaction` per distinct tx hash, cached. A tx that emitted
    more than one `ProposalRegistered`, a tx whose input doesn't decode, or a rejected
    `getTransaction` all give `null` for those ids. It never throws.
  - `fetchVotingSnapshot`: if `getCode` returns undefined or `'0x'` → `not-deployed`.
    Otherwise it reads `owner`, `workflowStatus` and `winningProposalID` in parallel (no
    multicall; the local node has none), syncs the logs, then parses, describes, models and
    tallies. If `account` is a registered voter and some descriptions are `null`, it fills
    them with `readContract({ functionName: 'getOneProposal', args: [id], account })`.

- [ ] **Step 1: Write the failing tests** with a hand-written fake `ReadClient` (`vi.fn`):
  - adaptive: the fake rejects ranges wider than 1000 blocks with `'query exceeds max block range 1000'`.
    Querying 0..2500 returns all logs in order. A fake throwing `'internal error'` makes the
    call reject with it.
  - LogSync: the second `sync` calls `getLogs` with `fromBlock = previous latest + 1`.
    **Rewind:** latest 50, then latest 3 → a resync from `deploymentBlock` that doesn't
    contain the old logs.
  - descriptions: decodes from `addProposal` input; the cache prevents a second
    `getTransaction`; non-addProposal input → `null`; a rejected `getTransaction` → `null`.
  - snapshot: **`getCode` returns `'0x'` → `{ kind: 'not-deployed' }` and `getLogs` is never
    called.** A ready snapshot composes status, owner and winner from `readContract`. With
    `account` a voter and a `null` description, `getOneProposal` fills it. With a visitor
    account, `getOneProposal` is not called.
- [ ] **Step 2:** `pnpm test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `projet3: incremental log sync, proposal descriptions and snapshot`.

---

### Task 8: `/api/rpc` read proxy

**Files:**
- Create: `frontend/src/lib/rpc/guard.ts`, `frontend/src/lib/rpc/guard.test.ts`,
  `frontend/src/app/api/rpc/route.ts`, `frontend/src/app/api/rpc/route.test.ts`

**Interfaces:**
- Consumes: `getDeployment(11155111)` (Task 3).
- Produces:
  ```ts
  // guard.ts
  export const ALLOWED_METHODS = ['eth_chainId', 'eth_blockNumber', 'eth_call', 'eth_getLogs', 'eth_getCode',
    'eth_getTransactionByHash', 'eth_getTransactionReceipt', 'eth_getBlockByNumber'] as const
  export const MAX_BATCH = 20
  export const MAX_BODY_BYTES = 16_384
  export type GuardResult = { ok: true } | { ok: false; status: 400 | 403; message: string }
  export function checkRpcRequest(body: unknown, contract: Address): GuardResult
  export function isAllowedRpcResult(method: string, result: unknown, contract: Address): boolean
  // route.ts
  export const runtime = 'nodejs'
  export async function POST(request: Request): Promise<Response>
  ```
  Rules, all comparisons case-insensitive:
  - `eth_call`: `params[0].to` is the contract.
  - `eth_getLogs`: `params[0].address` is the contract (a string, or an array containing only
    it). A missing address is rejected.
  - `eth_getCode`: `params[0]` is the contract.
  - `eth_getBlockByNumber`: `params[1] === false`.
  - Each item needs `jsonrpc: '2.0'` and a string `method`. Batches must be non-empty with at
    most `MAX_BATCH` items, all allowed.
  - `isAllowedRpcResult`: for `eth_getTransactionByHash` / `eth_getTransactionReceipt`, a
    non-null result must have `to` equal to the contract. Every other method passes.

  Route behaviour:
  - Request rejections: non-POST → 405; body over `MAX_BODY_BYTES` → 413; guard failure →
    its status. All three answer with a JSON-RPC error body.
  - Missing `SEPOLIA_RPC_URL` or Sepolia deployment → 500 with
    `{ error: 'RPC non configuré' }`.
  - Otherwise the route forwards the request to `SEPOLIA_RPC_URL`. Items failing
    `isAllowedRpcResult` get `result` replaced by the JSON-RPC error `-32001 Forbidden`.
  - **No response ever contains the upstream URL**; upstream failures → 502
    `{ error: 'Erreur du nœud RPC' }`.

- [ ] **Step 1: Write the failing tests.**
  - guard: each allowed method passes with valid params; `eth_sendRawTransaction`,
    `eth_accounts` and `debug_traceTransaction` → 403; `eth_call` to account #1 → 403;
    `eth_getLogs` without an address, or with `[contract, other]` → 403;
    `eth_getBlockByNumber` with `true` → 403; a batch of 21 → 400; `{}` → 400.
    `isAllowedRpcResult('eth_getTransactionByHash', { to: other }, c)` is false, `null` is
    true.
  - route (`vi.stubGlobal('fetch')`, `vi.stubEnv`): a disallowed method → 403 and fetch
    **not called**; an allowed call is forwarded with the same body and the upstream JSON is
    returned; a tx result to another address → the item becomes error `-32001`; a missing
    env → 500; a 20 kB body → 413; **an upstream fetch rejecting with
    `Error('https://sepolia.infura.io/v3/SECRET failed')` → 502, and the response text
    doesn't contain `SECRET`**.
- [ ] **Step 2:** `pnpm test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `projet3: Sepolia read proxy with method allowlist and contract lock`.

---

### Task 9: Chains, wagmi config, providers, header, dev wallets

**Files:**
- Create: `frontend/src/config/chains.ts`, `frontend/src/config/chains.test.ts`,
  `frontend/src/config/wagmi.ts`, `frontend/src/components/providers.tsx`,
  `frontend/src/components/dev-wallets.tsx`, `frontend/src/hooks/use-app-chain.ts`,
  `frontend/src/components/voting/header.tsx`
- Modify: `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`

**Interfaces:**
- Consumes: `getDeployment` (Task 3), `getRole` (Task 6).
- Produces:
  ```ts
  // chains.ts
  export function selectChains(args: { nodeEnv: string; hasHardhat: boolean; hasSepolia: boolean }): readonly [Chain, ...Chain[]]
  export const appChains: readonly [Chain, ...Chain[]]   // selectChains(process.env.NODE_ENV, …)
  // use-app-chain.ts
  export function useAppChain(): { chain: Chain; deployment: Deployment | undefined; isConnected: boolean;
    isCorrectChain: boolean; account: Address | undefined }
  ```
  - `selectChains`: production → `[sepolia]` always. Development → `hardhat` first if
    `hasHardhat`, then `sepolia` if `hasSepolia`. If neither is set → `[hardhat]`.
  - `useAppChain` reads from the wallet's chain when it is one of `appChains`, else from
    `appChains[0]`. `isCorrectChain = isConnected && walletChainId === chain.id`.
  - Transports: hardhat `http('http://127.0.0.1:8545')`; sepolia `http(\`${window.location.origin}/api/rpc\`)`,
    built client-side only.
  - Connectors:
    `connectorsForWallets([{ groupName: 'Navigateur', wallets: [injectedWallet] }], { appName: 'Voting', projectId: 'unused-no-walletconnect' })`.
    Comment why: no wallet in the list uses WalletConnect, and the ID is required only by
    the type.
  - Dev wallets: only when `process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_WALLETS === 'true'`.
    It adds five wagmi `mock({ accounts: [HARDHAT_ACCOUNTS[i]] })` connectors (mock
    transactions go to the Hardhat node, whose accounts are unlocked). `<DevWallets />`
    shows a fixed bottom-right card titled exactly `Comptes de test Hardhat`, with buttons
    `#0 Admin`, `#1`, `#2`, `#3`, `#4 Visiteur` and `Déconnecter`.
  - Providers: `WagmiProvider` (`ssr: true`) → `QueryClientProvider` → `RainbowKitProvider`
    (`locale="fr-FR"`,
    `theme={{ lightMode: lightTheme({ accentColor: '#059669' }), darkMode: darkTheme({ accentColor: '#10b981' }) }}`)
    + sonner `<Toaster />`. RainbowKit's stylesheet is imported once in `layout.tsx`.
  - Header: `Voting` wordmark; a network badge (chain name); a role badge (`Admin`,
    `Électeur`, `Admin · Électeur`, `Visiteur`) once connected; RainbowKit `<ConnectButton
    showBalance={false} chainStatus="icon" />`.

- [ ] **Step 1: Write the failing tests** in `chains.test.ts`: production with both flags →
  `[sepolia]`; development with both → `[hardhat, sepolia]`; development with only Sepolia
  → `[sepolia]`; development with neither → `[hardhat]`.
- [ ] **Step 2:** `pnpm test`. Expected: FAIL.
- [ ] **Step 3:** Implement the files above. The role badge can't be wired to voters until
  Task 10, so show `Admin` / `Visiteur` from `owner()` for now.
- [ ] **Step 4: Verify.** `pnpm test && pnpm typecheck && pnpm build`, then
  `grep -rl "Comptes de test Hardhat" .next/static` → **no match**. With the local node,
  deploy and `pnpm sync:local`, run `NEXT_PUBLIC_DEV_WALLETS=true pnpm dev`. In the browser
  (Playwright MCP): the page loads, the connect button opens the RainbowKit modal, dev
  wallet #0 connects and shows `Admin`, the console has no errors, and no request goes to a
  `walletconnect` domain.
- [ ] **Step 5: Commit** `projet3: wagmi/RainbowKit providers, chain selection and dev wallets`.

---

### Task 10: Live data and the read-only dashboard

**Files:**
- Create: `frontend/src/hooks/use-voting-data.ts`, and in `frontend/src/components/voting/`:
  `progress-steps.tsx`, `proposals-list.tsx`, `voters-list.tsx`, `result-card.tsx`,
  `status-notice.tsx`, `actions-panel.tsx` (idle messages only in this task)
- Modify: `frontend/src/app/page.tsx`, `header.tsx` (role from the snapshot's voters)

**Interfaces:**
- Consumes: `fetchVotingSnapshot`, `LogSync` (Task 7), `useAppChain` (Task 9), `computeTally`
  output (Task 5), `allowedActions`/`getRole` (Task 6).
- Produces:
  ```ts
  export function useVotingData(): { snapshot: VotingSnapshot | undefined; isLoading: boolean; error: Error | null;
    refresh: () => Promise<void> }
  ```
  It uses react-query with key `['voting', chainId, address, account]`, polling every
  **2000 ms on 31337 and 6000 ms on Sepolia**. `LogSync` and the description cache are
  module-level singletons per `chainId:address`. `refresh` invalidates `['voting']`.

  Display rules (spec 5.1, 5.4):
  - Page grid (layout A): header, then progress steps, then two columns on `lg`
    (left: `ActionsPanel`; right: `ResultCard` when status 5, `ProposalsList`,
    `VotersList`). A single column on mobile, with no horizontal scroll at 375 px.
  - `ProposalsList`: `#id description`. GENESIS gets a muted `GENESIS` badge, and `null`
    descriptions show `Description indisponible`. Text uses `break-words
    [overflow-wrap:anywhere]` and renders as text, never HTML. Per-proposal counts appear
    **only at status 5**. At statuses 3 and 4 the header line reads
    `{v} vote(s) sur {n} électeur(s)`.
  - `VotersList`: shortened `0x1234…abcd` with the full address in `title`. An `a voté`
    badge at status ≥ 3, and a `vous` badge for the connected account.
  - `ResultCard`: `Proposition gagnante`, `#id description`, the vote count, then the full
    ranking from `tally.rows`. If `tally.isTie`: `Égalité : la proposition au plus petit
    numéro l'emporte, règle du contrat.` If `totalVotes === 0`:
    `Aucun vote n'a été exprimé : GENESIS l'emporte par défaut.`
  - `StatusNotice`:
    - no deployment for the chain → `Aucun contrat Voting n'est configuré pour ce réseau.`
    - `not-deployed` → `Aucun contrat Voting à l'adresse configurée sur ce réseau.`, and in
      development add `Redéployez puis lancez pnpm sync:local.`
    - loading → skeletons
    - error → `Impossible de lire le contrat. Nouvelle tentative…`
  - Empty step 1 (status 0, no voters):
    `Inscription des électeurs en cours : 0 électeur inscrit pour l'instant.`
  - `ActionsPanel` (this task): a role- and status-aware idle message, e.g.
    `Connectez un wallet inscrit pour voter.`,
    `En attente de l'ouverture du vote par l'administrateur.` Exact wording beyond these is
    the builder's call.

- [ ] **Step 1: Implement** the hook and components.
- [ ] **Step 2: Verify in the browser** (local node, fresh deploy, sync, dev server with dev
  wallets). Without any wallet connected: step 1 is highlighted, the empty step 1 sentence
  is visible, and the console is clean. Then advance the contract with a throwaway
  `backend/scripts/advance.ts` (run with `pnpm hardhat run scripts/advance.ts --network localhost`,
  **deleted before committing**): register #1 to #3, open proposals, add 2 proposals, open
  voting, vote, close, tally. Within one poll the page
  shows each change, and counts appear only at step 6.
- [ ] **Step 3:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Expected: exit 0.
- [ ] **Step 4: Commit** `projet3: live read-only dashboard`.

---

### Task 11: Transactions and action forms

**Files:**
- Create: `frontend/src/hooks/use-voting-action.ts`, and in `frontend/src/components/voting/`:
  `add-voter-form.tsx`, `add-proposal-form.tsx`, `vote-form.tsx`, `phase-control.tsx`
- Modify: `frontend/src/components/voting/actions-panel.tsx`

**Interfaces:**
- Consumes: `allowedActions`, `validate*`, `toFrenchError`, `isUserRejection` (Task 6);
  `useVotingData().refresh` (Task 10).
- Produces:
  ```ts
  type WriteRequest =
    | { action: 'addVoter'; args: [Address] } | { action: 'addProposal'; args: [string] } | { action: 'vote'; args: [bigint] }
    | { action: Exclude<Action, 'addVoter' | 'addProposal' | 'vote'> }
  export function useVotingAction(): { run: (request: WriteRequest) => Promise<boolean>; pending: Action | null }
  ```
  `vote` maps to `setVote`; every other action name equals the contract function. Flow:
  `simulateContract` (public client, `account`) → `writeContractAsync(request)` → a
  `toast.loading('Transaction envoyée', { description: shortHash })` →
  `waitForTransactionReceipt`. A `reverted` receipt → error toast. Success → a success toast,
  then `await refresh()`. Errors → `isUserRejection` ? neutral toast : `toast.error(toFrenchError(e))`.
  `pending` is reset in `finally`, and `run` returns whether the transaction succeeded.

  Forms (labels are exact copy):
  - `AddVoterForm`: input placeholder `0x…`, button `Inscrire l'électeur`. The inline
    validation message appears before submit, and the button stays disabled while invalid.
    The input clears on success.
  - `AddProposalForm`: textarea, counter `{n}/280`, and
    `Encore {1000 - proposalCount} proposition(s) possible(s)`. Button
    `Déposer la proposition`. Submits the trimmed value.
  - `VoteForm`: a radio list of all proposals; GENESIS is labelled
    `#0 GENESIS (proposition par défaut du contrat)`. Button `Voter`. Once the account has
    voted, the panel shows `Vous avez voté pour #{id} : {description}` instead.
  - `PhaseControl`: one button and an `AlertDialog` titled `Cette étape est définitive`, with
    `Annuler` / `Confirmer`.

    | Action | Button | Dialog body |
    |---|---|---|
    | startProposalsRegistering | `Ouvrir le dépôt des propositions` | `Plus aucun électeur ne pourra être inscrit. {n} électeur(s) inscrit(s).` |
    | endProposalsRegistering | `Clore le dépôt des propositions` | `Les électeurs ne pourront plus proposer. {p} proposition(s) déposée(s), hors GENESIS.` |
    | startVotingSession | `Ouvrir la session de vote` | `Les électeurs pourront voter parmi {p+1} propositions, GENESIS comprise.` |
    | endVotingSession | `Clore la session de vote` | `{v} vote(s) sur {n} électeur(s). Ceux qui n'ont pas voté ne pourront plus le faire.` |
    | tallyVotes | `Comptabiliser les votes` | `Le résultat sera définitif et visible par tous.` |

  - `ActionsPanel` renders exactly the forms and controls returned by `allowedActions`. On
    the wrong chain it shows `Connectez-vous au réseau {chain.name} pour agir.`

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Smoke check in the browser:** as `#0 Admin`, register #1. The toast sequence
  appears and #1 shows up in `Électeurs` without a reload.
- [ ] **Step 3:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Expected: exit 0.
- [ ] **Step 4: Commit** `projet3: transaction flow and action forms`.

---

### Task 12: Full browser verification on the local node

**Files:** fixes only, in whatever files the run exposes.

- [ ] **Step 1: Set up:** `backend/`: `pnpm node` (background) and `pnpm deploy:local`.
  `frontend/`: `pnpm sync:local` and `NEXT_PUBLIC_DEV_WALLETS=true pnpm dev`.
- [ ] **Step 2: Run the round with Playwright MCP**, checking each expected result:
  1. With no wallet: step 1 and the empty step 1 sentence.
  2. `#0 Admin`:
     - `abc` → `Adresse Ethereum invalide.`; the zero address → zero-address message. The
       button stays disabled and no wallet request is sent.
     - Register #1, #2 and #3. Registering #1 again → `Cette adresse est déjà inscrite.`
  3. `Ouvrir le dépôt des propositions`: the dialog says `3 électeur(s) inscrit(s)`. Confirm.
  4. `#1`:
     - Propose `Parc municipal`. `   ` → the empty message; `parc MUNICIPAL` → the duplicate
       message; 281 characters → `280 caractères maximum.`
     - `#2`: `Piste cyclable`.
     - `#3`: a 280-character string with no spaces. **Check
       `document.documentElement.scrollWidth <= clientWidth`** at 1280 px and 375 px.
  5. `#4 Visiteur`: the badge says `Visiteur`, no form is shown, and the lists are visible.
  6. `#0`: close proposals, open voting.
  7. `#1` votes #1 and `#2` votes #2. The list shows `2 vote(s) sur 3 électeur(s)` and no
     per-proposal counts. `#1` now sees `Vous avez voté pour #1 : Parc municipal`.
  8. **Switch `#1` → `#0` without reloading:** the badge becomes `Admin` and the panel shows
     `Clore la session de vote`.
  9. **State changed between render and click:** in tab A (as `#0`), open the
     `Clore la session de vote` dialog without confirming. In tab B (also `#0`), close the
     vote. Back in tab A, click `Confirmer`. Expected: the toast reads
     `Cette étape n'est pas disponible dans la phase actuelle.`, no wallet request is sent
     (the simulation fails first), the button leaves its busy state, and the page shows
     step 5 after the refresh.
  10. Tally in tab A. The result shows `#1 Parc municipal` with the tie sentence.
  11. Disconnect: the result stays visible.
  12. **Node restart:** stop the node and restart it without deploying. Within one poll →
      `Aucun contrat Voting à l'adresse configurée sur ce réseau.` Then `pnpm deploy:local`:
      the page returns to step 1 with no stale voters, without a reload.
  13. The console has no errors at any point, and no request goes to `walletconnect`.
- [ ] **Step 3:** Fix every failure. Rerun the affected items and finish with
  `pnpm lint && pnpm typecheck && pnpm test && pnpm build` plus the dev-wallet grep from
  Task 9.
- [ ] **Step 4: Commit** `projet3: fixes from the full local run` (skip if nothing changed).

---

### Task 13: README, backend README, demo script

**Files:**
- Create: `6. Dapp/Projet3/README.md`, `6. Dapp/Projet3/docs/demo-script.md`
- Modify: `backend/README.md` (paths now relative to `backend/`; mention `pnpm deploy:local`
  and `pnpm deploy:sepolia`; still 89 tests)

- [ ] **Step 1:** Write `README.md` (French, matching the existing READMEs). Sections:
  - what the DApp does (the 9 brief features), the stack, the folder structure;
  - running it locally: the commands from Task 12 step 1, plus MetaMask on 31337
    (`http://127.0.0.1:8545`);
  - deployment: Sepolia via `pnpm deploy:sepolia`, Vercel CLI, and the env vars from
    `.env.example`;
  - deliverable links: the Vercel URL, the GitHub repo
    `https://github.com/PO-software/Alyra/tree/main/6.%20Dapp/Projet3`, and the video
    (placeholder `<!-- lien vidéo à compléter -->`);
  - known limitations: the contract is kept as the source of truth, votes are public, the
    RPC route has no rate limit, and Sepolia is left at step 1 on purpose.
- [ ] **Step 2:** Write `docs/demo-script.md` (French) per spec 11:
  - setup: importing accounts #0 to #4 into MetaMask with their private keys from the
    `pnpm node` output, with the warning that these keys are public;
  - adding the network (chain id 31337, RPC `http://127.0.0.1:8545`);
  - "Paramètres → Avancé → Effacer les données de l'onglet activité" after each node
    restart;
  - the scene-by-scene round from Task 12 (without the dev wallets), with what to say on
    each screen, plus two guard demos: a non-admin sees no admin controls, and a voter
    can't vote twice.
- [ ] **Step 3: Verify** by following the README's local commands verbatim from a fresh
  terminal: the app reaches step 1.
- [ ] **Step 4: Commit** `projet3: README and French demo script`.

---

### Task 14: Deploy to Sepolia and Vercel

Steps marked **(user)** need the user's terminal. Ask them to run the command with the `!`
prefix. Secrets never pass through chat.

- [ ] **Step 1 (user):** `! cd "/home/po/DevEnv/workspace/Alyra/6. Dapp/Projet3/backend" && pnpm deploy:sepolia`
  (the keystore password prompt). Then read the address from
  `ignition/deployments/chain-11155111/deployed_addresses.json` and the deployment block from
  that folder's `journal.jsonl` (the deployment receipt's `blockNumber`). Commit the
  `chain-11155111` folder: `projet3: Voting deployed on Sepolia`.
- [ ] **Step 2 (user):** `! pnpm dlx vercel login`, then
  `! cd "/home/po/DevEnv/workspace/Alyra/6. Dapp/Projet3/frontend" && pnpm dlx vercel link`
  (project name `voting-dapp-alyra`, root = this folder).
- [ ] **Step 3 (user):**
  `! cd "…/frontend" && pnpm dlx vercel env add SEPOLIA_RPC_URL production`. The user pastes
  the Infura URL; Claude never sees it.
- [ ] **Step 4:** Add `NEXT_PUBLIC_VOTING_ADDRESS_SEPOLIA` and
  `NEXT_PUBLIC_DEPLOYMENT_BLOCK_SEPOLIA` (production) via `vercel env add`, piping the values
  on stdin. Then `pnpm dlx vercel --prod`. Expected: a production URL.
- [ ] **Step 5: Verify the public site:**
  - In Playwright without a wallet: step 1, the empty sentence, network badge `Sepolia`,
    and every data request goes to `/api/rpc`.
  - `curl` `/api/rpc` with `eth_sendRawTransaction` → 403, and with `eth_call` to another
    address → 403.
  - Download every JS chunk the page loads and grep for `infura` → no match.
- [ ] **Step 6:** Put the URL in `README.md`. Commit `projet3: public deployment links`.
  **Ask the user** before `git push`.

---

## Self-review notes

- Spec coverage:
  - 5.1 → Tasks 9 and 10; 5.2 → Tasks 6, 10 and 11; 5.3 → Tasks 6 and 11;
    5.4 → Tasks 5 and 10; 6 → Tasks 4 and 7; 7.1 → Tasks 1 and 3; 7.2 → Tasks 2 and 9;
    7.3 → Tasks 3 and 9; 7.4 → Task 8; 7.5 → Tasks 4 to 7; 9 → Tasks 1 and 14;
    10 → Tasks 1, 8, 9, 12 and 14; 11 → Task 13.
  - The empty step 1 for graders (spec 9) → Task 10.
- Task 12 item 9 provokes a real revert (a state change in a second tab) instead of a debug
  trigger, so nothing test-only is added to the app. The Task 9 grep confirms that the dev
  wallets don't ship.
- A transaction rejected in MetaMask can't be triggered with wagmi's mock connector. It is
  covered by the `toFrenchError`/`isUserRejection` unit tests (Task 6) and appears in the
  demo with the real MetaMask.
