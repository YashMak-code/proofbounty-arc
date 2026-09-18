# ProofBounty

ProofBounty is an Arc-native micro-bounty escrow for reproducible research and focused open-source work. A creator locks native USDC, a contributor submits public evidence, and the designated reviewer releases payment when the work checks out.

Repository: https://github.com/YashMak-code/proofbounty-arc

## Why Arc

- Native USDC is both the gas token and reward asset, so creators do not need a separate ERC-20 approval.
- Fast deterministic finality keeps small settlements usable.
- Public task/evidence URLs plus `keccak256` fingerprints provide a compact audit trail while large files stay in their original repositories.

## Current state

- Responsive web app with wallet connection and Arc network switching.
- Live contract reads and transactions for create, submit, approve, reject, and refund.
- Solidity 0.8.24 contract with a three-day review grace period.
- 14 passing tests and 100% line/statement coverage.
- Arc Mainnet contract deployed and wired into `web/config.js`.
- Complete Arc Mainnet create → submit → approve/pay flow verified with a 0.01 USDC bounty.

Deployment:

- Contract: `0x82c5319e955adb97331e1883afdb296cfe646981`
- Block: `21422656`
- Transaction: `0xcbab912a8f1eeb7bc3e030ed584f31eb28cdd095be3bb70adae374f0b596eb93`

Verified Mainnet flow (all receipts returned status `1`):

- Create and fund 0.01 USDC bounty: `0x1ffd8acd71189bc42dfa82c7d1370bc3005fb27b6673bd3cca2f5f2d12d8bf11`
- Submit public proof: `0x30f889be6970c5e66740365189e06640935365340f5c095fc8844cb9d206628c`
- Approve and pay: `0x9f903c422574309eebaddd292d1d6571e9c84db8b4513929e4d52cf46acfc607`

Private working preview: https://proofbounty-arc.a774555798.chatgpt.site

## Local development

Requirements: Node.js 22.13 or newer and pnpm.

```bash
pnpm install
pnpm test
pnpm test:coverage
pnpm typecheck
pnpm build
python -m http.server 4173
```

Open `http://127.0.0.1:4173/web/`. The generated browser bundle is `web/app.bundle.js`.

## Arc Mainnet deployment

Use a dedicated, low-balance deployment wallet. Keep its private key in Hardhat's encrypted keystore:

```bash
pnpm hardhat keystore set ARC_PRIVATE_KEY
pnpm deploy:arc
pnpm build:web
```

The browser-wallet deployment helper is available in `tools/wallet-deployer/`. The deployed address is stored in `web/config.js`.

Arc parameters:

- Chain ID: `5042`
- RPC: `https://rpc.mainnet.arc.io`
- Explorer: `https://explorer.arc.io`
- Native currency: `USDC` with 18 decimals

## Contract flow

1. `createBounty` locks native USDC and records the task URL and fingerprint.
2. `submitProof` records one contributor, evidence URL, and fingerprint before the deadline.
3. The reviewer calls `approveAndPay` or `rejectProof`.
4. The creator can refund an open expired bounty. A submitted bounty receives a three-day reviewer grace period before refund becomes possible.

Payout and refund state changes occur before native-USDC transfers and are protected by a reentrancy guard. URLs are capped at 512 bytes. The contract has not received an independent audit; use small amounts for the microgrant demo.

## Project structure

- `contracts/ProofBounty.sol` — escrow contract
- `contracts/test/PayoutReceivers.sol` — adversarial test receivers
- `test/ProofBounty.ts` — contract test suite
- `scripts/deploy.ts` — Arc deployment and web configuration
- `scripts/build-web.mjs` — viem browser bundle build
- `web/` — deployable static app
- `参赛方案与清单.md` — Chinese scope and submission checklist
