import { writeFile } from "node:fs/promises";
import { network } from "hardhat";

const { viem } = await network.connect();
const contract = await viem.deployContract("ProofBounty");
const publicClient = await viem.getPublicClient();
const deploymentBlock = await publicClient.getBlockNumber();

const config = `window.PROOFBOUNTY_CONFIG = Object.freeze({
  chainId: 5042,
  rpcUrl: "https://rpc.mainnet.arc.io",
  explorerUrl: "https://explorer.arc.io",
  contractAddress: "${contract.address}",
  deploymentBlock: ${deploymentBlock.toString()},
});
`;

await writeFile(new URL("../web/config.js", import.meta.url), config, "utf8");

console.log(`ProofBounty deployed: ${contract.address}`);
console.log(`Explorer: https://explorer.arc.io/address/${contract.address}`);
console.log("Updated web/config.js; rebuild the web bundle before publishing.");
