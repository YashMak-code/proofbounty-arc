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
| 8–25s | Fill the Create Bounty form and publish a 0.01 USDC bounty. Show the wallet confirmation briefly, then cut out the confirmation wait. |
| 25–40s | Show the new open bounty, select `Submit evidence`, enter the proof, and confirm. Cut out the transaction wait. |
| 40–55s | Show the bounty in review, select `Approve & pay`, and confirm. Cut to the final `PAID` state. |
| 55–68s | Show the updated proof and bounty totals, zero open rewards, and the new paid task. |
| 68–80s | Open the contract in Arc Explorer and briefly show the latest transactions. |
| 80–90s | Open the public GitHub repository, then finish on the live app and Arc Mainnet badge. |

## Demo input

- Task title: `Verify ProofBounty Arc Mainnet deployment`
- Evidence required: `Public Arc Explorer link confirming the deployed contract and transaction history.`
- Public task brief URL: `https://github.com/YashMak-code/proofbounty-arc#arc-mainnet-deployment`
- Reviewer address: leave blank so the connected wallet is the reviewer
- Reward: `0.01 USDC`
- Deadline: `2026-09-25`
- Proof URL: `https://explorer.arc.io/address/0x82c5319e955adb97331e1883afdb296cfe646981`
- Proof note: `Verified the deployed ProofBounty contract and its public transaction history on Arc Mainnet.`

## English voice-over

ProofBounty is an Arc-native micro-bounty escrow for reproducible research and focused open-source work.

I am creating a new task in the live application on Arc Mainnet, chain 5042. I define the required public evidence, use the connected wallet as reviewer for this demonstration, and lock a 0.01 USDC reward.

On Arc, native USDC funds the reward and pays the network fee, so there is no separate token approval. Once the transaction finalizes, the bounty appears open in the shared ProofBounty contract.

I now submit a public evidence URL. ProofBounty records the link and its cryptographic fingerprint on-chain. As the designated reviewer, I approve the evidence, and the contract marks the bounty paid and transfers the reward to the contributor.

The completed flow and every transaction are publicly verifiable in Arc Explorer. The source code is public, with fourteen contract tests and one hundred percent line and statement coverage. ProofBounty makes small, verifiable work auditable and payable with one Arc-native asset.

## Recording notes

- Record only the browser window; close unrelated tabs and notifications.
- Use 125–140% browser zoom so labels remain readable after video compression.
- Do not show seed phrases, private keys, passwords, browser history, or wallet settings.
- Wallet addresses and transaction hashes are public, but crop or blur the balance if preferred.
- Add English subtitles even when using English AI narration.
- Record the full wallet confirmations, but shorten each confirmation wait to about one second during editing.
- Do not show or use the separate contract deployment helper in this video.
- Upload to YouTube as `Unlisted`, then test the link in a logged-out/private browser window.
