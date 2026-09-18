import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  encodeDeployData,
  formatEther,
  http,
} from "viem";
import artifact from "../../artifacts/contracts/ProofBounty.sol/ProofBounty.json";

const arc = defineChain({
  id: 5042,
  name: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.arc.io"] } },
  blockExplorers: { default: { name: "Arc Explorer", url: "https://explorer.arc.io" } },
});
const publicClient = createPublicClient({ chain: arc, transport: http() });
const connectButton = document.querySelector("#connect");
const deployButton = document.querySelector("#deploy");
const copyButton = document.querySelector("#copy-config");
const status = document.querySelector("#status");
const details = document.querySelector("#details");
const result = document.querySelector("#result");
const configOutput = document.querySelector("#config-output");

let account;
let walletClient;
let deploymentGas;
let deploymentGasPrice;

function setStatus(message, tone = "neutral") {
  status.textContent = message;
  status.dataset.tone = tone;
}

function short(value) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

async function switchToArc() {
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x13b2" }] });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0x13b2",
        chainName: "Arc",
        nativeCurrency: arc.nativeCurrency,
        rpcUrls: arc.rpcUrls.default.http,
        blockExplorerUrls: [arc.blockExplorers.default.url],
      }],
    });
  }
}

async function connect() {
  if (!window.ethereum) throw new Error("MetaMask or Rabby was not detected. Open this page in the browser that has your wallet extension.");
  await switchToArc();
  const [selected] = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!selected) throw new Error("No wallet account was selected.");
  account = selected;
  walletClient = createWalletClient({ account, chain: arc, transport: custom(window.ethereum) });

  const [chainId, balance, gasPrice] = await Promise.all([
    publicClient.getChainId(),
    publicClient.getBalance({ address: account }),
    publicClient.getGasPrice(),
  ]);
  const data = encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode });
  const gas = await publicClient.estimateGas({ account, data });
  const fee = gas * gasPrice;
  const buffered = fee * 125n / 100n;
  deploymentGas = gas * 125n / 100n;
  deploymentGasPrice = gasPrice;

  if (chainId !== 5042) throw new Error(`Wrong chain ${chainId}; expected Arc Mainnet 5042.`);
  details.innerHTML = `
    <div><span>Account</span><strong>${short(account)}</strong></div>
    <div><span>Balance</span><strong>${formatEther(balance)} USDC</strong></div>
    <div><span>Estimated fee</span><strong>${formatEther(fee)} USDC</strong></div>
    <div><span>125% buffer</span><strong>${formatEther(buffered)} USDC</strong></div>`;
  details.hidden = false;
  connectButton.textContent = "Wallet connected";
  deployButton.disabled = balance < buffered;
  setStatus(balance < buffered ? "Balance is below the recommended deployment buffer." : "Preflight passed. Review the account, then deploy.", balance < buffered ? "bad" : "good");
}

async function deploy() {
  if (!walletClient || !account) throw new Error("Connect your wallet first.");
  if (!deploymentGas || !deploymentGasPrice) throw new Error("Run the deployment preflight first.");
  deployButton.disabled = true;
  setStatus("Confirm the deployment transaction in your wallet…");
  const hash = await walletClient.deployContract({
    account,
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    gas: deploymentGas,
    gasPrice: deploymentGasPrice,
  });
  setStatus(`Transaction ${short(hash)} submitted. Waiting for finality…`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error("The transaction completed without a contract address.");

  const block = receipt.blockNumber.toString();
  const address = receipt.contractAddress;
  const generatedConfig = `window.PROOFBOUNTY_CONFIG = Object.freeze({\n  chainId: 5042,\n  rpcUrl: "https://rpc.mainnet.arc.io",\n  explorerUrl: "https://explorer.arc.io",\n  contractAddress: "${address}",\n  deploymentBlock: ${block},\n});\n`;
  configOutput.value = generatedConfig;
  result.innerHTML = `
    <p>ProofBounty deployed successfully.</p>
    <a href="https://explorer.arc.io/address/${address}" target="_blank" rel="noopener">Contract ${address}</a>
    <a href="https://explorer.arc.io/tx/${hash}" target="_blank" rel="noopener">Deployment transaction</a>`;
  result.hidden = false;
  configOutput.hidden = false;
  copyButton.hidden = false;
  setStatus("Deployment finalized on Arc Mainnet.", "good");
}

connectButton.addEventListener("click", async () => {
  connectButton.disabled = true;
  try { await connect(); } catch (error) { setStatus(error.shortMessage || error.message || "Wallet connection failed.", "bad"); connectButton.disabled = false; }
});

deployButton.addEventListener("click", async () => {
  try { await deploy(); } catch (error) { setStatus(error.shortMessage || error.message || "Deployment failed.", "bad"); deployButton.disabled = false; }
});

copyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(configOutput.value);
  copyButton.textContent = "Config copied";
});

if (window.ethereum?.on) {
  window.ethereum.on("accountsChanged", () => location.reload());
  window.ethereum.on("chainChanged", () => location.reload());
}
