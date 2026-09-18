import { network } from "hardhat";

const { viem } = await network.connect();
const publicClient = await viem.getPublicClient();
const chainId = await publicClient.getChainId();
const blockNumber = await publicClient.getBlockNumber();

console.log(`Arc RPC connected. Chain ID: ${chainId}; latest block: ${blockNumber}`);
