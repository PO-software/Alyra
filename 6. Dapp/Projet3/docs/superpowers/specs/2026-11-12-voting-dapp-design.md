# Voting DApp (Alyra Projet 3): design

Date: 2026-11-12. Status: draft for approval.

## 1. Intent

Alyra's Projet 3 asks for a DApp on top of the "Système de vote" contract
(the course's corrected `Voting.sol`). The student hands in three things: the GitHub repo, a
demo video of the frontend, and a public deployment (Vercel preferred). The brief asks for
code that is "optimal" and a DApp that is "sécurisée"; any frontend stack is allowed, and
React or Next.js is preferred.

The student makes the technical calls and Claude writes the code. The aim is a clean,
professional DApp that a grader can open without a wallet and understand at a glance, and
that holds up in a recorded walkthrough of every role.

### What the DApp must let people do (from the brief)

1. The admin registers a whitelist of voters.
2. The admin starts proposal registration.
3. Registered voters submit proposals.
4. The admin ends proposal registration.
5. The admin starts the voting session.
6. Registered voters vote for their preferred proposal.
7. The admin ends the voting session.
8. The admin tallies the votes.
9. **Everyone** can see the result.

## 2. Hard constraints

- **`Voting.sol` is the source of truth and must not change at all**, not even formatting.
  It is the Projet3 version: the course correction plus the student's own
  `require(proposalsArray.length < 1000, 'Le nombre de propositions est limite a 1000')`
  in `addProposal`. Every gap in the contract is handled in the frontend or simply
  surfaced as-is.
- The 89 existing contract tests (`test/Voting.ts`) stay and keep passing.
- Wallets: **browser-extension wallets only (MetaMask)**. No WalletConnect or Reown project
  ID and no mobile QR flow.
- The Infura key must **never reach the browser**.
- Package manager: pnpm (>= 12.16.1, as declared in the existing `devEngines`).
- UI language: **French**. Code, identifiers and comments: English.

## 3. Non-goals and anti-goals

**Non-goals:** changing the contract; a written security/gas review in the README (the
student declined it); phone wallets; vote secrecy; multiple elections per deployment; an
indexer, database or backend beyond the RPC route; i18n.

**Anti-goals** (any of these makes it a failure even if it works):

- The Infura key is visible in the client bundle or network tab, or the RPC route can be used
  as an open relay to Infura for arbitrary contracts or methods.
- The UI offers an action that the contract will reject in the current state for the
  current account. Invalid actions are prevented before MetaMask opens.
- A live ranking is shown before the tally (see 5.4).
- A test-only or mock wallet connector ends up in the production (Vercel) build.
- `renounceOwnership` or `transferOwnership` is exposed anywhere in the UI.

## 4. Decisions made by the student

| Topic | Decision |
|---|---|
| Contract | Untouched, source of truth |
| Libraries | Latest versions allowed |
| Web3 stack | wagmi + viem + RainbowKit |
| Layout | **A: one dashboard** (6-step progress bar on top; "Vos actions" on the left showing only what the connected role can do now; live lists of proposals and voters on the right) |
| Look | **C: plain and sober** (white/grey, one green accent, shadcn/ui style) |
| Read RPC on Sepolia | Their **Infura key**, behind a server-side route |
| Wallets | MetaMask / browser wallets only |
| Security review in README | Not wanted |
| Frontend hosting | **Vercel, deployed with the Vercel CLI** (not Git integration) |
| Demo video | Recorded on a **local Hardhat node** |
| Public Sepolia contract | **Left fresh at step 1** for graders; no voting round is run on it |

## 5. Product behaviour

### 5.1 Page structure (layout A)

A single page, `/`.

- **Header:** app name, the current network, and the RainbowKit connect button. When
  connected, a role badge: `Admin`, `Électeur`, `Admin · Électeur`, or `Visiteur`.
- **Progress bar:** the 6 statuses of `WorkflowStatus`, with the current one highlighted and
  the past ones checked. French labels: 1 Inscription des électeurs · 2 Dépôt des
  propositions · 3 Propositions closes · 4 Vote en cours · 5 Vote clos · 6 Résultats.
- **Left column, "Vos actions":** only the actions the connected account can take *now*
  (see 5.3). With nothing to do, it shows a one-line explanation (e.g. "Connectez un wallet
  inscrit pour voter." or "En attente de l'ouverture du vote par l'administrateur.").
- **Right column:** live lists:
  - **Propositions:** id, description, and the vote count once tallied (see 5.4).
  - **Électeurs:** shortened addresses, with a "a voté" mark during and after voting.
- **Result block** (status 6): the winning proposal with its vote count, then the full
  ranking. Visible to everyone, wallet or not.

Mockups agreed during brainstorming are kept in `.superpowers/brainstorm/` (git-ignored):
`layout.html` (option A) and `roles.html`.

### 5.2 Who sees what

- **Visitor** (no wallet, or a wallet that isn't registered): sees status, lists and, at
  step 6, the result. Can't act. Reading works **without a wallet**.
- **Voter:** adds proposals during step 2; votes once during step 4; afterwards sees
  "Vous avez voté pour #N : <description>".
- **Admin** (`owner()`): adds voters during step 1; gets one "next phase" button per step
  (steps 1 to 5); tallies at step 5. If the admin registered their own address as a voter,
  the voter panel appears too.
- **Wrong network:** reading still works for the app's network; every action is disabled and
  RainbowKit's "wrong network" switch is offered.

### 5.3 Actions and the guards that run before MetaMask opens

Each action is only rendered in the status and for the role the contract allows. In
addition:

| Action | Front-end guards (block the button with a French message) |
|---|---|
| `addVoter(addr)` | valid address (viem `isAddress`); not the zero address; not already registered (from `VoterRegistered` events) |
| `addProposal(desc)` | trimmed text is not empty; at most **280 characters** *(Claude's call: the contract has no length limit)*; not a duplicate of an existing description, compared trimmed and case-insensitive *(Claude's call: the contract accepts duplicates)*; the total is below 1000 (GENESIS counts, so voters get 999 proposals; the UI shows how many remain) |
| `setVote(id)` | not already voted; `id` is an existing proposal. **GENESIS (#0) can be selected**, labelled as such, because the contract allows it |
| Phase transitions and `tallyVotes` | a **confirmation dialog** stating that the step can't be undone, plus the useful counts (e.g. "3 électeurs inscrits", "2 votes sur 4") |

Transactions follow a single pattern: button busy state, then a pending toast with the tx
hash, then a success or error toast, then data refresh. Contract revert strings and
`OwnableUnauthorizedAccount` are mapped to French messages; user-rejected signatures get
their own quiet message. The full list of revert strings is in section 8.

### 5.4 Contract behaviours surfaced as-is

- **GENESIS** is proposal #0. It exists from step 2 onward (no event marks its creation).
  It can receive votes and wins if nobody votes.
- **Ties:** the lowest id wins (strict `>` in `tallyVotes`). When the result has a tie for
  first place, the result block says so ("Égalité : la proposition au plus petit numéro
  l'emporte, règle du contrat").
- **Live counts:** during step 4 everyone sees *how many* votes were cast ("2 votes sur 4
  électeurs") but **not the per-proposal counts**. Those appear once status 6 is reached.
  The votes are public on-chain anyway; the UI just doesn't encourage a bandwagon.

## 6. How data is read

The contract's getters `getVoter` and `getOneProposal` are restricted to voters, so the
DApp builds its state from **public events plus a few public reads**. This works the same
for every visitor.

| Data | Source |
|---|---|
| Status | `workflowStatus()`; refresh on `WorkflowStatusChange` |
| Admin | `owner()` |
| Voters | `VoterRegistered(address)` events |
| Proposals | `ProposalRegistered(uint id)` events. **Descriptions come from the emitting transaction's calldata**: fetch the tx by `log.transactionHash` and decode it with viem `decodeFunctionData` against the `addProposal` ABI. Prepend GENESIS (#0) when status ≥ 1 |
| Votes | `Voted(address voter, uint proposalId)` events give per-proposal counts, who has voted, and the connected account's own choice |
| Winner | `winningProposalID()` once status = 6 |

Calldata decoding fails if `addProposal` was called through another contract (a smart
wallet, for instance). Fallback order: if the connected account is a voter, use
`getOneProposal(id)`; otherwise display "Description indisponible". This is not expected in
practice, but must not crash the page.

Logs are queried from the **deployment block** of the contract (per-network config), never
from block 0. The builder chooses how to chunk `eth_getLogs` ranges to stay within
Infura's limits.

Freshness: data refreshes after every confirmed transaction from this page, and also on a
polling interval so that changes made by other accounts show up. The interval is the
builder's call; aim for a few seconds.

## 7. Architecture

### 7.1 Repository layout (inside the existing private repo `PO-software/Alyra`)

```
6. Dapp/Projet3/
├── backend/          # the current Hardhat project, moved as-is with git mv
│                     # (contracts/, test/, ignition/, hardhat.config.ts, .agents, …)
├── frontend/         # new Next.js app
├── docs/
│   ├── superpowers/specs/2026-11-12-voting-dapp-design.md   # this file
│   └── demo-script.md
└── README.md         # project overview and deliverables
```

- `backend/` and `frontend/` are two independent pnpm projects, each with its own
  lockfile. That keeps `vercel` deploys of `frontend/` self-contained.
- The existing Projet3 `README.md` (which describes the tests) becomes `backend/README.md`.
- Rename `ignition/modules/Counter.ts` to `Voting.ts`. The module id `VotingModule` stays.
- Add `.superpowers/` to `.gitignore`.
- **ABI:** the frontend gets a typed (`as const`) ABI generated from the backend's compiled
  artifact by a small script, run whenever the contract is rebuilt. It is never hand-copied.
- Work happens on a new branch created from `chore/pnpm` (which holds the Projet3 commits),
  e.g. `feat/projet3-dapp`. *(Claude's call)*

### 7.2 Frontend stack

| Piece | Version / note |
|---|---|
| Next.js (App Router) + React + TypeScript | latest (Next 16.4.x, React 19.3.x at time of writing) |
| Tailwind CSS 4 + shadcn/ui | latest |
| **wagmi 2.x** (latest 2.19.x) + viem 2.x + @tanstack/react-query 5 | **wagmi stays on 2.x: RainbowKit 2.2.11 (latest) declares `wagmi ^2.9.0` as a peer and doesn't support wagmi 3** |
| @rainbow-me/rainbowkit 2.2.x | configured with injected/MetaMask wallets only. The builder checks how RainbowKit behaves without a WalletConnect project ID and picks the configuration that needs none |
| Vitest | for unit tests |

Theme: light by default, dark when the OS prefers it (shadcn tokens). *(Claude's call)*
All wallet and chain code runs client-side (`"use client"`). The page must not fail during
server rendering.

### 7.3 Networks and configuration

| Network | Chain id | Reads | Used for |
|---|---|---|---|
| Hardhat local node | 31337 | direct to `http://127.0.0.1:8545` | development and the demo video |
| Sepolia | 11155111 | **through `/api/rpc`** (below) | the public Vercel site |

- One config module maps chain id to `{ votingAddress, deploymentBlock }`.
- The **production (Vercel) build exposes Sepolia only.** Local development exposes the
  Hardhat chain (and Sepolia too if its env vars are set). How the build selects networks
  (env vars, build flag) is the builder's call.
- Env vars: the Infura key or URL is **server-only** (no `NEXT_PUBLIC_` prefix). The contract
  address and deployment block can be public.

### 7.4 `/api/rpc`: the read proxy for Sepolia

A Next.js route handler that forwards JSON-RPC to Infura (Sepolia) with the server-held key.

- **Method allowlist:** only what the app's reads need, such as `eth_chainId`,
  `eth_blockNumber`, `eth_call`, `eth_getLogs`, `eth_getTransactionByHash`,
  `eth_getTransactionReceipt`, `eth_getBlockByNumber`. The builder adjusts it to what viem
  actually sends and rejects everything else.
- **Address lock:** `eth_call` must target the Voting contract, and `eth_getLogs` must filter
  on the Voting contract's address.
- Reject oversized bodies and large JSON-RPC batches. No write methods ever
  (`eth_sendRawTransaction` and the like). Transactions go from MetaMask through the
  user's own RPC.
- Rate limiting is out of scope. Mention it as a known limitation in the README.

### 7.5 Module boundaries (guidance)

Keep pure logic in plain TypeScript modules, separate from React, so it can be unit-tested:

- event and calldata decoding into a `{ voters, proposals, votes }` model;
- the tally and tie detection from `Voted` events;
- `allowedActions(role, status, model)`;
- input validation (address, proposal text);
- revert-reason to French message mapping.

React components and hooks consume these. The exact file layout is the builder's call.

## 8. Contract reference (Projet3 `Voting.sol`, read-only)

- **Statuses:** 0 RegisteringVoters, 1 ProposalsRegistrationStarted,
  2 ProposalsRegistrationEnded, 3 VotingSessionStarted, 4 VotingSessionEnded, 5 VotesTallied.
- **Public reads:** `owner()`, `workflowStatus()`, `winningProposalID()`.
  **Voter-only:** `getVoter(address)`, `getOneProposal(uint)`.
- **Writes:** `addVoter` (owner, status 0); `addProposal` (voter, status 1);
  `setVote` (voter, status 3); `startProposalsRegistering`, `endProposalsRegistering`,
  `startVotingSession`, `endVotingSession`, `tallyVotes` (owner, each from the previous
  status). `startProposalsRegistering` pushes GENESIS at id 0.
- **Events:** `VoterRegistered(address voterAddress)`,
  `WorkflowStatusChange(uint8 previousStatus, uint8 newStatus)`,
  `ProposalRegistered(uint proposalId)`, `Voted(address voter, uint proposalId)` (no indexed
  params), plus OpenZeppelin's `OwnershipTransferred`.
- **Revert reasons to map:** `You're not a voter` · `Voters registration is not open yet` ·
  `Already registered` · `Proposals are not allowed yet` ·
  `Le nombre de propositions est limite a 1000` · `Vous ne pouvez pas ne rien proposer` ·
  `Voting session havent started yet` · `You have already voted` · `Proposal not found` ·
  `Registering proposals cant be started now` · `Registering proposals havent started yet` ·
  `Registering proposals phase is not finished` ·
  `Current status is not voting session ended` · custom error
  `OwnableUnauthorizedAccount(address)`.

## 9. Deployment

- **Local:** `pnpm hardhat node` in `backend/`, then deploy with Ignition to `localhost`,
  then run `pnpm dev` in `frontend/`. A node restart wipes the chain, so the address and
  deployment block must be easy to refresh (ideally read from Ignition's
  `deployed_addresses.json` or set by a script; the builder chooses).
- **Sepolia contract:** Ignition deploy with the **`production` build profile** (optimizer
  on). The student runs this command themselves, because the Hardhat keystore asks for
  their password interactively. The deploying account becomes the admin. Record the
  address and deployment block in the frontend config.
- **The Sepolia contract is left fresh** (student's decision): no voters, proposals or votes
  are created on it before hand-in, so graders land on step 1. The full round, including
  the result, is shown in the demo video on the local node. The empty state at step 1 must
  therefore look intentional and explain itself to a visitor ("Inscription des électeurs en
  cours : 0 électeur inscrit…").
- **Vercel:** `frontend/` deployed with the Vercel CLI. The student logs in once
  (`! vercel login`). Set env vars in the Vercel project (server-only Infura key, public
  address and block), then `vercel --prod`.

## 10. Verification

- `backend/`: the 89 contract tests still pass and `Voting.sol` is byte-identical to the
  current file.
- `frontend/`: Vitest unit tests for every module in 7.5; `tsc`, lint and `next build`
  clean.
- **Browser run against the local node** before hand-over: one complete voting round
  covering every role (admin, 3 voters, a visitor), the guards from 5.3 including at least
  one blocked invalid action per form, a tie case, and the public result without a wallet.
  How the builder drives the wallet in this check is their call; any mock connector must be
  excluded from production builds.
- `/api/rpc`: tests or scripted checks showing that a disallowed method, a foreign contract
  address and a write method are rejected.
- After the Vercel deploy: the public URL loads, shows the Sepolia contract's state without a
  wallet, and the Infura key appears nowhere in the client bundle.

## 11. Deliverables

- `README.md` at `Projet3/`: what the DApp does; how to run it locally (node, deploy,
  frontend); how it is deployed; links to the Vercel URL, the GitHub repo and the video (the
  video link is a placeholder for the student to fill in); known limitations (contract kept
  as the source of truth, votes are public, the RPC route has no rate limit).
- `docs/demo-script.md`, **in French** *(Claude's call)*: a step-by-step recording script for
  the local node:
  - setup: start the node, deploy, start the frontend, import the 4 Hardhat test accounts
    into MetaMask (with a warning that these keys are public and must never hold real
    funds);
  - the MetaMask "clear activity tab data" reset after any node restart;
  - a full round mirroring the test fixture (3 voters, 3 proposals, votes, tally);
  - a couple of guard demonstrations (a non-admin can't act, a voter can't vote twice).

## 12. Left to the builder

Component structure; hook design; polling interval; log chunk size; exact RPC allowlist (as
long as 7.4's rules hold); how network selection is wired; how local addresses are
refreshed; how the browser check drives the wallet; copy wording beyond the examples
given.
