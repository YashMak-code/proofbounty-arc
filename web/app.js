import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  formatEther,
  getAddress,
  http,
  isAddress,
  keccak256,
  parseEther,
  stringToHex,
  zeroAddress,
} from "viem";
import artifact from "../artifacts/contracts/ProofBounty.sol/ProofBounty.json";

const config = window.PROOFBOUNTY_CONFIG || {};
const arc = defineChain({
  id: Number(config.chainId || 5042),
  name: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl || "https://rpc.mainnet.arc.io"] } },
  blockExplorers: { default: { name: "Arc Explorer", url: config.explorerUrl || "https://explorer.arc.io" } },
});
const contractAddress = isAddress(config.contractAddress || "") ? getAddress(config.contractAddress) : null;
const isLive = Boolean(contractAddress);
const publicClient = createPublicClient({ chain: arc, transport: http(arc.rpcUrls.default.http[0]) });
const abi = artifact.abi;
const statusNames = ["open", "submitted", "paid", "refunded"];
const defaults = [
  { id: 1, title: "Reproduce a published regression table", evidence: "Notebook, package lockfile, and discrepancy report", taskURI: "https://github.com/", reward: 12.5, deadline: "2026-09-24", status: "open" },
  { id: 2, title: "Audit DOI links in an open bibliography", evidence: "CSV of checked records with canonical DOI", taskURI: "https://github.com/", reward: 4, deadline: "2026-09-22", status: "open" },
  { id: 3, title: "Validate a synthetic-data generator", evidence: "Test log and commit covering three edge cases", taskURI: "https://github.com/", reward: 8, deadline: "2026-09-26", status: "submitted" },
  { id: 4, title: "Check analysis environment reproducibility", evidence: "Container digest and successful run transcript", taskURI: "https://github.com/", reward: 18, deadline: "2026-09-18", status: "paid" },
];

let bounties = isLive ? [] : JSON.parse(localStorage.getItem("proofbounty.tasks") || "null") || defaults;
let metadata = JSON.parse(localStorage.getItem("proofbounty.metadata") || "{}");
let activeFilter = "all";
let account = null;
let walletClient = null;
const $ = (query) => document.querySelector(query);
const list = $("#bountyList");
const toast = $("#toast");

function short(value) { return `${value.slice(0, 6)}…${value.slice(-4)}`; }
function escapeHtml(value = "") { const node = document.createElement("div"); node.textContent = String(value); return node.innerHTML; }
function safeUrl(value) { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : null; } catch { return null; } }
function hashFields(...values) { return keccak256(stringToHex(values.join("\n").normalize("NFC"))); }
function notify(message) { toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 4200); }
function saveDemo() { localStorage.setItem("proofbounty.tasks", JSON.stringify(bounties)); }
function saveMetadata() { localStorage.setItem("proofbounty.metadata", JSON.stringify(metadata)); }
function statusLabel(status) { return ({ open: "Open for proof", submitted: "In review", paid: "Paid", refunded: "Refunded" })[status] || status; }
function sameAddress(left, right) { return Boolean(left && right && left.toLowerCase() === right.toLowerCase()); }
function action(label, name, id) { return `<button class="mini-action" data-action="${name}" data-id="${id}">${label}</button>`; }

function cardActions(bounty) {
  const now = Math.floor(Date.now() / 1000);
  const deadline = Number(bounty.deadlineTimestamp || 0);
  const actions = [];
  if (bounty.status === "open" && (!deadline || now <= deadline)) actions.push(action("Submit evidence", "proof", bounty.id));
  if (bounty.status === "submitted" && sameAddress(account, bounty.reviewer)) {
    actions.push(action("Reject", "reject", bounty.id), action("Approve & pay", "approve", bounty.id));
  }
  const gracePassed = bounty.status === "submitted" && now > deadline + 3 * 86400;
  if (sameAddress(account, bounty.creator) && ((bounty.status === "open" && now > deadline) || gracePassed)) {
    actions.push(action("Refund", "refund", bounty.id));
  }
  return actions.length ? `<div class="card-action">${actions.join("")}</div>` : "";
}

function render() {
  const shown = activeFilter === "all" ? bounties : bounties.filter((bounty) => bounty.status === activeFilter);
  const openValue = bounties.filter((bounty) => bounty.status === "open").reduce((sum, bounty) => sum + Number(bounty.reward), 0);
  $("#openValue").innerHTML = `${openValue.toFixed(2)} <small>USDC</small>`;
  $("#paidCount").innerHTML = `${bounties.filter((bounty) => bounty.status === "paid").length} <small>proofs</small>`;
  $("#bountyCount").innerHTML = `${bounties.length} <small>on board</small>`;
  list.innerHTML = shown.length ? shown.map((bounty, index) => {
    const taskLink = safeUrl(bounty.taskURI);
    const details = `${escapeHtml(bounty.evidence || "Public task brief")}${taskLink ? ` · <a href="${escapeHtml(taskLink)}" target="_blank" rel="noopener">open brief</a>` : ""} · due ${escapeHtml(bounty.deadline)}`;
    return `<article class="bounty-card">
      <span class="bounty-index">${String(index + 1).padStart(2, "0")}</span>
      <div><h3>${escapeHtml(bounty.title)}</h3><p>${details}</p></div>
      <div class="reward">${Number(bounty.reward).toFixed(2)}<small>USDC</small></div>
      <span class="status ${bounty.status}">${statusLabel(bounty.status)}</span>
      ${cardActions(bounty)}
    </article>`;
  }).join("") : '<div class="empty-state">No bounties in this state yet.</div>';
  document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", handleAction));
}

async function switchToArc() {
  const chainId = `0x${arc.id.toString(16)}`;
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{
      chainId,
      chainName: arc.name,
      nativeCurrency: arc.nativeCurrency,
      rpcUrls: arc.rpcUrls.default.http,
      blockExplorerUrls: [arc.blockExplorers.default.url],
    }] });
  }
}

async function connect(options = {}) {
  if (!window.ethereum) { if (!options.silent) notify("Install an EVM wallet such as MetaMask or Rabby."); return null; }
  try {
    const accounts = await window.ethereum.request({ method: options.silent ? "eth_accounts" : "eth_requestAccounts" });
    if (!accounts.length) return null;
    if (!options.silent) await switchToArc();
    account = getAddress(accounts[0]);
    walletClient = createWalletClient({ account, chain: arc, transport: custom(window.ethereum) });
    $("#walletLabel").textContent = short(account);
    render();
    if (!options.silent) notify("Wallet connected to Arc Mainnet.");
    return account;
  } catch (error) {
    if (!options.silent) notify(error.shortMessage || error.message || "Wallet connection was cancelled.");
    return null;
  }
}

async function ensureWallet() {
  if (!isLive) return null;
  if (!account) await connect();
  if (!account) throw new Error("Connect a wallet to continue.");
  await switchToArc();
  return account;
}

async function send(functionName, args, value) {
  await ensureWallet();
  notify("Preparing transaction and Arc network fee…");
  const request = { address: contractAddress, abi, functionName, args, account, value };
  const [estimatedGas, gasPrice] = await Promise.all([
    publicClient.estimateContractGas(request),
    publicClient.getGasPrice(),
  ]);
  const hash = await walletClient.writeContract({
    ...request,
    gas: estimatedGas * 125n / 100n,
    gasPrice,
  });
  notify(`Transaction submitted: ${short(hash)}`);
  await publicClient.waitForTransactionReceipt({ hash });
  await loadChain();
  return hash;
}

async function loadChain() {
  if (!isLive) { render(); return; }
  $("#contractLabel").textContent = `${short(contractAddress)} · syncing`;
  try {
    const count = await publicClient.readContract({ address: contractAddress, abi, functionName: "bountyCount" });
    const rows = await Promise.all(Array.from({ length: Number(count) }, (_, id) => publicClient.readContract({ address: contractAddress, abi, functionName: "getBounty", args: [BigInt(id)] })));
    bounties = rows.map((row, id) => {
      const local = metadata[row.taskHash] || {};
      return {
        id,
        title: local.title || `Bounty #${id}`,
        evidence: local.evidence || `Fingerprint ${short(row.taskHash)}`,
        taskURI: row.taskURI,
        proofURI: row.proofURI,
        taskHash: row.taskHash,
        reward: Number(formatEther(row.reward)),
        deadlineTimestamp: Number(row.deadline),
        deadline: new Date(Number(row.deadline) * 1000).toISOString().slice(0, 10),
        status: statusNames[row.status],
        creator: row.creator,
        contributor: row.contributor,
        reviewer: row.reviewer,
      };
    }).reverse();
    $("#contractLabel").textContent = `${short(contractAddress)} · live`;
    render();
  } catch (error) {
    $("#contractLabel").textContent = "Contract unavailable";
    notify(error.shortMessage || "Could not read the deployed contract.");
  }
}

function openProof(id) {
  const bounty = bounties.find((item) => Number(item.id) === Number(id));
  $("#proofBountyId").value = id;
  $("#dialogTitle").textContent = bounty?.title || `Bounty #${id}`;
  $("#proofDialog").showModal();
}

async function handleAction(event) {
  const { action: name, id } = event.currentTarget.dataset;
  try {
    if (name === "proof") return openProof(id);
    event.currentTarget.disabled = true;
    if (!isLive) { notify("Deploy the contract to enable this action."); return; }
    if (name === "approve") await send("approveAndPay", [BigInt(id)]);
    if (name === "reject") await send("rejectProof", [BigInt(id)]);
    if (name === "refund") await send("refundExpired", [BigInt(id)]);
    notify(`${name[0].toUpperCase()}${name.slice(1)} confirmed on Arc.`);
  } catch (error) {
    notify(error.shortMessage || error.message || "Transaction failed.");
  } finally {
    event.currentTarget.disabled = false;
  }
}

document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach((item) => { item.classList.remove("active"); item.setAttribute("aria-selected", "false"); });
  tab.classList.add("active"); tab.setAttribute("aria-selected", "true"); activeFilter = tab.dataset.filter; render();
}));
$("#connectWallet").addEventListener("click", () => connect());
$("#taskTitle").addEventListener("input", () => updateHashPreview());
$("#taskEvidence").addEventListener("input", () => updateHashPreview());
$("#taskUri").addEventListener("input", () => updateHashPreview());

function updateHashPreview() {
  const values = [$("#taskTitle").value.trim(), $("#taskEvidence").value.trim(), $("#taskUri").value.trim()];
  $("#taskHash").textContent = values.every(Boolean) ? short(hashFields(...values)) : "generated at publish";
}

$("#createForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitter = event.submitter;
  const title = $("#taskTitle").value.trim();
  const evidence = $("#taskEvidence").value.trim();
  const taskURI = $("#taskUri").value.trim();
  const reviewerInput = $("#taskReviewer").value.trim();
  const taskHash = hashFields(title, evidence, taskURI);
  const deadline = BigInt(Math.floor(new Date(`${$("#taskDeadline").value}T23:59:59Z`).getTime() / 1000));
  try {
    submitter.disabled = true;
    if (isLive) {
      if (reviewerInput && !isAddress(reviewerInput)) throw new Error("Reviewer address is invalid.");
      metadata[taskHash] = { title, evidence };
      saveMetadata();
      await send("createBounty", [taskHash, taskURI, deadline, reviewerInput ? getAddress(reviewerInput) : zeroAddress], parseEther($("#taskReward").value));
      notify("Bounty funded on Arc Mainnet.");
    } else {
      bounties.unshift({ id: Date.now(), title, evidence, taskURI, reward: Number($("#taskReward").value), deadline: $("#taskDeadline").value, status: "open", taskHash });
      saveDemo(); render(); notify(`Demo bounty saved: ${short(taskHash)}`);
    }
    event.target.reset(); setDefaultDeadline(); updateHashPreview();
  } catch (error) {
    notify(error.shortMessage || error.message || "Could not create bounty.");
  } finally {
    submitter.disabled = false;
  }
});

$("#proofForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (event.submitter?.value === "cancel") { $("#proofDialog").close(); return; }
  const submitter = event.submitter;
  const id = Number($("#proofBountyId").value);
  const url = $("#proofUrl").value.trim();
  const note = $("#proofNote").value.trim();
  const proofHash = hashFields(url, note);
  try {
    submitter.disabled = true;
    if (isLive) await send("submitProof", [BigInt(id), proofHash, url]);
    else {
      const bounty = bounties.find((item) => Number(item.id) === id);
      bounty.status = "submitted"; bounty.proofHash = proofHash; bounty.proofURI = url; saveDemo(); render();
    }
    $("#proofDialog").close(); event.target.reset(); notify(`Evidence submitted: ${short(proofHash)}`);
  } catch (error) {
    notify(error.shortMessage || error.message || "Could not submit evidence.");
  } finally {
    submitter.disabled = false;
  }
});

function setDefaultDeadline() { const date = new Date(); date.setDate(date.getDate() + 7); $("#taskDeadline").value = date.toISOString().slice(0, 10); }

async function registerAgentTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  await context.registerTool({
    name: "list_bounties", title: "List ProofBounty tasks", description: "Read the currently loaded bounty board.",
    inputSchema: { type: "object", properties: { status: { type: "string", enum: ["all", "open", "submitted", "paid", "refunded"] } }, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute(input = {}) { const status = input.status || "all"; return bounties.filter((item) => status === "all" || item.status === status); },
  });
}

if (!isLive) {
  $("#formNote").textContent = "Demo mode stores tasks on this device. Add a deployed address in config.js to enable Arc transactions.";
  $("#contractLabel").textContent = "Demo ready";
} else {
  $("#formNote").textContent = "Publishing asks your wallet to lock native USDC in the ProofBounty contract.";
}
setDefaultDeadline();
render();
connect({ silent: true });
loadChain();
registerAgentTools().catch(() => {});
if (window.ethereum?.on) {
  window.ethereum.on("accountsChanged", () => connect({ silent: true }));
  window.ethereum.on("chainChanged", () => loadChain());
}
