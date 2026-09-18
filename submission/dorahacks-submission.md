# Arc Microgrants submission — ProofBounty

Submission status: `Under Review` as of 2026-09-18.

## Project name

ProofBounty

## Tagline

Arc-native escrow for small, verifiable research and open-source tasks.

## Short description

ProofBounty lets a creator publish a focused task and lock native USDC in a shared smart contract on Arc Mainnet. A contributor submits a public evidence link and cryptographic fingerprint, and a designated reviewer releases the reward when the work checks out. If an eligible task expires, the creator can recover the locked funds. The MVP is designed for reproducibility checks, open-source maintenance, data validation, and other small jobs whose outcomes can be inspected publicly.

## What it uses Arc for

ProofBounty uses Arc as the execution and settlement layer. Native USDC pays both network fees and bounty rewards, avoiding a separate ERC-20 approval flow. The contract records creators, contributors, reviewers, rewards, deadlines, states, public task and proof URLs, and their `keccak256` fingerprints. Funding, evidence submission, approval, payout, rejection, and expiry refunds are enforced on-chain.

## What is working today

- A public web application connected to Arc Mainnet, chain ID 5042.
- One shared deployed `ProofBounty` contract.
- Wallet connection and automatic Arc network switching.
- Create and fund, submit proof, approve and pay, reject, and refund flows.
- A verified end-to-end Mainnet flow using a 0.01 USDC bounty.
- Fourteen contract tests with 100% line and statement coverage.
- Public source code and publicly verifiable deployment and transaction history.

## Why it is worth taking further

Small research and open-source tasks are often too lightweight for formal procurement but still need clear scope, evidence, and reliable payment. ProofBounty provides a compact audit trail and programmable settlement without requiring a new token. The next steps are reusable task templates, independently assigned reviewers, better public metadata indexing, contributor profiles, and multi-reviewer workflows.

## Links

- Live app: https://yashmak-code.github.io/proofbounty-arc/
- Public repository: https://github.com/YashMak-code/proofbounty-arc
- Demo video: https://youtu.be/Io-e3-PeQ_Y
- Arc Mainnet contract: https://explorer.arc.io/address/0x82c5319e955adb97331e1883afdb296cfe646981
- Deployment transaction: https://explorer.arc.io/tx/0xcbab912a8f1eeb7bc3e030ed584f31eb28cdd095be3bb70adae374f0b596eb93
- Public builder profile: https://github.com/YashMak-code

## Eligibility checks before submitting

- [x] The application and contract are deployed and working on Arc Mainnet.
- [x] The repository is public.
- [ ] Confirm that the work is original and has not received funding from a Circle or Arc program.
- [x] The receiving wallet can receive native USDC on Arc.
