import { configVariable, defineConfig } from "hardhat/config";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";
import hardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import hardhatKeystore from "@nomicfoundation/hardhat-keystore";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import hardhatViemAssertions from "@nomicfoundation/hardhat-viem-assertions";

export default defineConfig({
  plugins: [
    hardhatKeystore,
    hardhatViem,
    hardhatViemAssertions,
    hardhatNodeTestRunner,
    hardhatNetworkHelpers,
  ],
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    arcMainnet: {
      type: "http",
      chainType: "generic",
      url: "https://rpc.mainnet.arc.io",
      accounts: [configVariable("ARC_PRIVATE_KEY")],
    },
  },
  paths: {
    sources: "./contracts",
    tests: { nodejs: "./test" },
  },
});
