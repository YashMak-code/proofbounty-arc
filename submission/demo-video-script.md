# ProofBounty demo video

Target length: 60–90 seconds  
Format: 1920×1080, 16:9, English AI voice-over with English subtitles  
Live app: https://yashmak-code.github.io/proofbounty-arc/  
Repository: https://github.com/YashMak-code/proofbounty-arc  
Contract: https://explorer.arc.io/address/0x82c5319e955adb97331e1883afdb296cfe646981

## Shot list

| Time | Screen recording |
|---|---|
| 0–8s | Open the live app. Keep the Arc Mainnet badge, connected wallet, and contract `live` status visible. |
| 8–25s | Slowly pan over the Create Bounty form: task title, public evidence requirement, reviewer, reward, and deadline. Do not create another bounty. |
| 25–42s | Show the completed smoke-test bounty. Select `Paid` and show `1 proof`, `1 on board`, `0.00 USDC` open rewards, and the `PAID` state. |
| 42–60s | Open the contract in Arc Explorer, then briefly show the create, proof, and payout transactions. |
| 60–75s | Open the public GitHub repository. Show the Solidity contract, test directory, README, and deployed contract section. |
| 75–85s | Return to the live app and finish on the ProofBounty name and Arc Mainnet badge. |

## English voice-over

ProofBounty is an Arc-native micro-bounty escrow for reproducible research and focused open-source work.

A creator publishes a focused task and locks native USDC directly in the smart contract. A contributor submits a public evidence link with a cryptographic fingerprint, and the designated reviewer releases payment when the work checks out.

This is the live application running on Arc Mainnet, chain 5042. Our completed smoke test shows one funded bounty, one verified proof, and the final paid state. The full flow was executed on-chain with 0.01 USDC: create and fund, submit proof, then approve and pay.

The deployed contract and every transaction are publicly verifiable in Arc Explorer. The source code is public, with fourteen contract tests and one hundred percent line and statement coverage.

ProofBounty makes small, verifiable work auditable and payable with one Arc-native asset.

## Recording notes

- Record only the browser window; close unrelated tabs and notifications.
- Use 125–140% browser zoom so labels remain readable after video compression.
- Do not show seed phrases, private keys, passwords, browser history, or wallet settings.
- Wallet addresses and transaction hashes are public, but crop or blur the balance if preferred.
- Add English subtitles even when using English AI narration.
- Upload to YouTube as `Unlisted`, then test the link in a logged-out/private browser window.
