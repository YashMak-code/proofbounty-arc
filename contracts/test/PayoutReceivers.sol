// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProofBounty} from "../ProofBounty.sol";

contract RejectingContributor {
    ProofBounty public immutable target;

    constructor(ProofBounty target_) { target = target_; }

    function submit(uint256 id, bytes32 proofHash) external {
        target.submitProof(id, proofHash, "https://example.com/proof");
    }

    receive() external payable { revert("reject payout"); }
}

contract RejectingCreator {
    ProofBounty private immutable bounty;

    constructor(ProofBounty bounty_) {
        bounty = bounty_;
    }

    function create(bytes32 taskHash, uint64 deadline) external payable {
        bounty.createBounty{value: msg.value}(taskHash, "https://example.com/task", deadline, address(0));
    }

    function refund(uint256 id) external {
        bounty.refundExpired(id);
    }

    receive() external payable {
        revert("reject refund");
    }
}

contract ReentrantReviewerContributor {
    ProofBounty public immutable target;
    uint256 public bountyId;
    bool public reentryBlocked;

    constructor(ProofBounty target_) { target = target_; }

    function submit(uint256 id, bytes32 proofHash) external {
        bountyId = id;
        target.submitProof(id, proofHash, "https://example.com/proof");
    }

    function approve() external { target.approveAndPay(bountyId); }

    receive() external payable {
        try target.approveAndPay(bountyId) { }
        catch { reentryBlocked = true; }
    }
}
