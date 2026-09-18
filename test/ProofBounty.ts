import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress, keccak256, parseEther, stringToHex, zeroAddress, zeroHash } from "viem";

const { viem, networkHelpers } = await network.create();
const taskHash = keccak256(stringToHex("reproduce figure 2"));
const proofHash = keccak256(stringToHex("github.com/example/proof"));
const taskUri = "https://example.com/tasks/reproduce-figure-2";
const proofUri = "https://github.com/example/proof";

async function fixture() {
  const [creator, reviewer, contributor, outsider] = await viem.getWalletClients();
  const contract = await viem.deployContract("ProofBounty");
  const publicClient = await viem.getPublicClient();
  const latest = await publicClient.getBlock();
  const deadline = latest.timestamp + 7n * 24n * 60n * 60n;
  return { contract, publicClient, creator, reviewer, contributor, outsider, deadline };
}

async function expectCustomError(action: Promise<unknown>, errorName: string) {
  await assert.rejects(action, (error: unknown) => String(error).includes(errorName));
}

type ProofBountyContract = Awaited<ReturnType<typeof fixture>>["contract"];
type BountyView = {
  creator: `0x${string}`;
  contributor: `0x${string}`;
  reviewer: `0x${string}`;
  reward: bigint;
  deadline: bigint;
  status: number;
  taskHash: `0x${string}`;
  proofHash: `0x${string}`;
  taskURI: string;
  proofURI: string;
};

async function readBounty(contract: ProofBountyContract, id = 0n) {
  return await contract.read.getBounty([id]) as BountyView;
}

describe("ProofBounty", () => {
  it("creates a funded bounty and records all immutable terms", async () => {
    const { contract, creator, reviewer, deadline } = await networkHelpers.loadFixture(fixture);
    const reward = parseEther("5");
    await contract.write.createBounty([taskHash, taskUri, deadline, reviewer.account.address], { account: creator.account, value: reward });
    const bounty = await readBounty(contract);
    assert.equal(bounty.creator, getAddress(creator.account.address));
    assert.equal(bounty.reviewer, getAddress(reviewer.account.address));
    assert.equal(bounty.reward, reward);
    assert.equal(bounty.deadline, deadline);
    assert.equal(bounty.status, 0);
    assert.equal(bounty.taskHash, taskHash);
    assert.equal(bounty.taskURI, taskUri);
    assert.equal(await contract.read.bountyCount(), 1n);
  });

  it("defaults the reviewer to the creator", async () => {
    const { contract, creator, deadline } = await networkHelpers.loadFixture(fixture);
    await contract.write.createBounty([taskHash, taskUri, deadline, zeroAddress], { account: creator.account, value: 1n });
    assert.equal((await readBounty(contract)).reviewer, getAddress(creator.account.address));
  });

  it("rejects zero reward, expired deadline, and empty task hash", async () => {
    const { contract, creator, deadline } = await networkHelpers.loadFixture(fixture);
    await expectCustomError(contract.write.createBounty([taskHash, taskUri, deadline, zeroAddress], { account: creator.account, value: 0n }), "InvalidReward");
    await expectCustomError(contract.write.createBounty([taskHash, taskUri, 1n, zeroAddress], { account: creator.account, value: 1n }), "InvalidDeadline");
    await expectCustomError(contract.write.createBounty([zeroHash, taskUri, deadline, zeroAddress], { account: creator.account, value: 1n }), "InvalidState");
    await expectCustomError(contract.write.createBounty([taskHash, "", deadline, zeroAddress], { account: creator.account, value: 1n }), "InvalidURI");
  });

  it("accepts one non-empty proof before the deadline", async () => {
    const { contract, creator, contributor, deadline } = await networkHelpers.loadFixture(fixture);
    await contract.write.createBounty([taskHash, taskUri, deadline, zeroAddress], { account: creator.account, value: 1n });
    await contract.write.submitProof([0n, proofHash, proofUri], { account: contributor.account });
    const bounty = await readBounty(contract);
    assert.equal(bounty.contributor, getAddress(contributor.account.address));
    assert.equal(bounty.proofHash, proofHash);
    assert.equal(bounty.proofURI, proofUri);
    assert.equal(bounty.status, 1);
    await expectCustomError(contract.write.submitProof([0n, proofHash, proofUri], { account: contributor.account }), "InvalidState");
  });

  it("rejects empty or late proofs", async () => {
    const { contract, creator, contributor, deadline } = await networkHelpers.loadFixture(fixture);
    await contract.write.createBounty([taskHash, taskUri, deadline, zeroAddress], { account: creator.account, value: 1n });
    await expectCustomError(contract.write.submitProof([0n, zeroHash, proofUri], { account: contributor.account }), "InvalidState");
    await expectCustomError(contract.write.submitProof([0n, proofHash, ""], { account: contributor.account }), "InvalidURI");
    await networkHelpers.time.increaseTo(deadline + 1n);
    await expectCustomError(contract.write.submitProof([0n, proofHash, proofUri], { account: contributor.account }), "InvalidState");
  });

  it("lets only the reviewer reject a proof and reopen the bounty", async () => {
    const { contract, creator, reviewer, contributor, outsider, deadline } = await networkHelpers.loadFixture(fixture);
    await contract.write.createBounty([taskHash, taskUri, deadline, reviewer.account.address], { account: creator.account, value: 1n });
    await contract.write.submitProof([0n, proofHash, proofUri], { account: contributor.account });
    await expectCustomError(contract.write.rejectProof([0n], { account: outsider.account }), "Unauthorized");
    await contract.write.rejectProof([0n], { account: reviewer.account });
    const bounty = await readBounty(contract);
    assert.equal(bounty.status, 0);
    assert.equal(bounty.contributor, zeroAddress);
    assert.equal(bounty.proofHash, zeroHash);
    assert.equal(bounty.proofURI, "");
  });

  it("rejects an attempt to reject an open bounty", async () => {
    const { contract, creator, deadline } = await networkHelpers.loadFixture(fixture);
    await contract.write.createBounty([taskHash, taskUri, deadline, zeroAddress], { account: creator.account, value: 1n });
    await expectCustomError(contract.write.rejectProof([0n], { account: creator.account }), "InvalidState");
  });

  it("pays the contributor exactly once when the reviewer approves", async () => {
    const { contract, publicClient, creator, reviewer, contributor, deadline } = await networkHelpers.loadFixture(fixture);
    const reward = parseEther("2.5");
    await contract.write.createBounty([taskHash, taskUri, deadline, reviewer.account.address], { account: creator.account, value: reward });
    await contract.write.submitProof([0n, proofHash, proofUri], { account: contributor.account });
    const before = await publicClient.getBalance({ address: contributor.account.address });
    await contract.write.approveAndPay([0n], { account: reviewer.account });
    const after = await publicClient.getBalance({ address: contributor.account.address });
    assert.equal(after - before, reward);
    assert.equal((await readBounty(contract)).status, 2);
    await expectCustomError(contract.write.approveAndPay([0n], { account: reviewer.account }), "InvalidState");
  });

  it("blocks approval by non-reviewers", async () => {
    const { contract, creator, reviewer, contributor, outsider, deadline } = await networkHelpers.loadFixture(fixture);
    await contract.write.createBounty([taskHash, taskUri, deadline, reviewer.account.address], { account: creator.account, value: 1n });
    await contract.write.submitProof([0n, proofHash, proofUri], { account: contributor.account });
    await expectCustomError(contract.write.approveAndPay([0n], { account: outsider.account }), "Unauthorized");
  });

  it("refunds an open bounty only to its creator after expiry", async () => {
    const { contract, publicClient, creator, outsider, deadline } = await networkHelpers.loadFixture(fixture);
    const reward = parseEther("1");
    await contract.write.createBounty([taskHash, taskUri, deadline, zeroAddress], { account: creator.account, value: reward });
    await expectCustomError(contract.write.refundExpired([0n], { account: creator.account }), "InvalidState");
    await networkHelpers.time.increaseTo(deadline + 1n);
    await expectCustomError(contract.write.refundExpired([0n], { account: outsider.account }), "Unauthorized");
    const before = await publicClient.getBalance({ address: creator.account.address });
    const hash = await contract.write.refundExpired([0n], { account: creator.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const after = await publicClient.getBalance({ address: creator.account.address });
    assert.equal(after + receipt.gasUsed * receipt.effectiveGasPrice - before, reward);
    assert.equal((await readBounty(contract)).status, 3);
    await expectCustomError(contract.write.refundExpired([0n], { account: creator.account }), "InvalidState");
  });

  it("protects a submitted proof with a three-day review grace period", async () => {
    const { contract, creator, contributor, deadline } = await networkHelpers.loadFixture(fixture);
    await contract.write.createBounty([taskHash, taskUri, deadline, zeroAddress], { account: creator.account, value: 1n });
    await contract.write.submitProof([0n, proofHash, proofUri], { account: contributor.account });
    await networkHelpers.time.increaseTo(deadline + 1n);
    await expectCustomError(contract.write.refundExpired([0n], { account: creator.account }), "InvalidState");
    const grace = await contract.read.REVIEW_GRACE_PERIOD() as bigint;
    await networkHelpers.time.increaseTo(deadline + grace + 1n);
    await contract.write.refundExpired([0n], { account: creator.account });
    assert.equal((await readBounty(contract)).status, 3);
  });

  it("reverts a payout cleanly when the contributor rejects native USDC", async () => {
    const { contract, creator, reviewer, deadline } = await networkHelpers.loadFixture(fixture);
    const rejecting = await viem.deployContract("RejectingContributor", [contract.address]);
    await contract.write.createBounty([taskHash, taskUri, deadline, reviewer.account.address], { account: creator.account, value: 100n });
    await rejecting.write.submit([0n, proofHash]);
    await expectCustomError(contract.write.approveAndPay([0n], { account: reviewer.account }), "TransferFailed");
    assert.equal((await readBounty(contract)).status, 1);
  });

  it("reverts a refund cleanly when the creator rejects native USDC", async () => {
    const { contract, deadline } = await networkHelpers.loadFixture(fixture);
    const rejecting = await viem.deployContract("RejectingCreator", [contract.address]);
    await rejecting.write.create([taskHash, deadline], { value: 100n });
    await networkHelpers.time.increaseTo(deadline + 1n);
    await expectCustomError(rejecting.write.refund([0n]), "TransferFailed");
    assert.equal((await readBounty(contract)).status, 0);
  });

  it("blocks payout reentrancy while completing the original payment", async () => {
    const { contract, publicClient, creator, deadline } = await networkHelpers.loadFixture(fixture);
    const receiver = await viem.deployContract("ReentrantReviewerContributor", [contract.address]);
    const reward = 100n;
    await contract.write.createBounty([taskHash, taskUri, deadline, receiver.address], { account: creator.account, value: reward });
    await receiver.write.submit([0n, proofHash]);
    await receiver.write.approve();
    assert.equal(await publicClient.getBalance({ address: receiver.address }), reward);
    assert.equal(await receiver.read.reentryBlocked(), true);
    assert.equal((await readBounty(contract)).status, 2);
  });
});
