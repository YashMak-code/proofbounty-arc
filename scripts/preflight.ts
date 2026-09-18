import { readFile } from "node:fs/promises";
import { network } from "hardhat";
import { encodeDeployData, formatEther, type Abi, type Hex } from "viem";

const EXPECTED_CHAIN_ID = 5042;
const { viem } = await network.connect();
const [deployer] = await viem.getWalletClients();
const publicClient = await viem.getPublicClient();

if (deployer === undefined) throw new Error("No deployer account is configured.");

const artifact = JSON.parse(
  await readFile(new URL("../artifacts/contracts/ProofBounty.sol/ProofBounty.json", import.meta.url), "utf8"),
) as { abi: Abi; bytecode: Hex };

const [chainId, balance, gasPrice, latestBlock] = await Promise.all([
  publicClient.getChainId(),
  publicClient.getBalance({ address: deployer.account.address }),
  publicClient.getGasPrice(),
  publicClient.getBlockNumber(),
]);

if (chainId !== EXPECTED_CHAIN_ID) {
  throw new Error(`Wrong network: expected ${EXPECTED_CHAIN_ID}, received ${chainId}.`);
}

const data = encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode });
const estimatedGas = await publicClient.estimateGas({ account: deployer.account.address, data });
const estimatedFee = estimatedGas * gasPrice;
const bufferedFee = estimatedFee * 125n / 100n;

console.log("Arc Mainnet deployment preflight");
console.log(`Deployer: ${deployer.account.address}`);
console.log(`Chain ID: ${chainId}`);
console.log(`Latest block: ${latestBlock}`);
console.log(`Balance: ${formatEther(balance)} USDC`);
console.log(`Gas price: ${formatEther(gasPrice)} USDC/gas`);
console.log(`Estimated deployment gas: ${estimatedGas}`);
console.log(`Estimated fee: ${formatEther(estimatedFee)} USDC`);
console.log(`Recommended fee buffer (125%): ${formatEther(bufferedFee)} USDC`);

if (balance < bufferedFee) {
  throw new Error("Insufficient native USDC balance for the buffered deployment estimate.");
}

console.log("Preflight passed. No transaction was sent.");
