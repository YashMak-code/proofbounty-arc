// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ProofBounty
/// @notice Native-USDC escrow for small, publicly verifiable tasks on Arc.
contract ProofBounty {
    uint64 public constant REVIEW_GRACE_PERIOD = 3 days;
    uint16 public constant MAX_URI_LENGTH = 512;

    enum Status { Open, Submitted, Paid, Refunded }

    struct Bounty {
        address creator;
        address contributor;
        address reviewer;
        uint128 reward;
        uint64 deadline;
        Status status;
        bytes32 taskHash;
        bytes32 proofHash;
        string taskURI;
        string proofURI;
    }

    error Unauthorized();
    error InvalidDeadline();
    error InvalidReward();
    error InvalidState();
    error InvalidURI();
    error TransferFailed();
    error Reentrancy();

    event BountyCreated(uint256 indexed id, address indexed creator, address indexed reviewer, uint256 reward, uint64 deadline, bytes32 taskHash, string taskURI);
    event ProofSubmitted(uint256 indexed id, address indexed contributor, bytes32 proofHash, string proofURI);
    event ProofRejected(uint256 indexed id, address indexed reviewer);
    event BountyPaid(uint256 indexed id, address indexed contributor, uint256 reward);
    event BountyRefunded(uint256 indexed id, address indexed creator, uint256 reward);

    Bounty[] private _bounties;
    bool private _entered;

    modifier nonReentrant() {
        if (_entered) revert Reentrancy();
        _entered = true;
        _;
        _entered = false;
    }

    function createBounty(bytes32 taskHash, string calldata taskURI, uint64 deadline, address reviewer)
        external
        payable
        returns (uint256 id)
    {
        if (msg.value == 0 || msg.value > type(uint128).max) revert InvalidReward();
        if (deadline <= block.timestamp) revert InvalidDeadline();
        if (taskHash == bytes32(0)) revert InvalidState();
        if (bytes(taskURI).length == 0 || bytes(taskURI).length > MAX_URI_LENGTH) revert InvalidURI();

        address selectedReviewer = reviewer == address(0) ? msg.sender : reviewer;
        id = _bounties.length;
        _bounties.push(Bounty({
            creator: msg.sender,
            contributor: address(0),
            reviewer: selectedReviewer,
            reward: uint128(msg.value),
            deadline: deadline,
            status: Status.Open,
            taskHash: taskHash,
            proofHash: bytes32(0),
            taskURI: taskURI,
            proofURI: ""
        }));
        emit BountyCreated(id, msg.sender, selectedReviewer, msg.value, deadline, taskHash, taskURI);
    }

    function submitProof(uint256 id, bytes32 proofHash, string calldata proofURI) external {
        Bounty storage bounty = _bounties[id];
        if (bounty.status != Status.Open || block.timestamp > bounty.deadline || proofHash == bytes32(0)) revert InvalidState();
        if (bytes(proofURI).length == 0 || bytes(proofURI).length > MAX_URI_LENGTH) revert InvalidURI();

        bounty.contributor = msg.sender;
        bounty.proofHash = proofHash;
        bounty.proofURI = proofURI;
        bounty.status = Status.Submitted;
        emit ProofSubmitted(id, msg.sender, proofHash, proofURI);
    }

    function rejectProof(uint256 id) external {
        Bounty storage bounty = _bounties[id];
        if (msg.sender != bounty.reviewer) revert Unauthorized();
        if (bounty.status != Status.Submitted) revert InvalidState();

        bounty.contributor = address(0);
        bounty.proofHash = bytes32(0);
        delete bounty.proofURI;
        bounty.status = Status.Open;
        emit ProofRejected(id, msg.sender);
    }

    function approveAndPay(uint256 id) external nonReentrant {
        Bounty storage bounty = _bounties[id];
        if (msg.sender != bounty.reviewer) revert Unauthorized();
        if (bounty.status != Status.Submitted) revert InvalidState();

        bounty.status = Status.Paid;
        uint256 reward = bounty.reward;
        address contributor = bounty.contributor;
        (bool sent,) = payable(contributor).call{value: reward}("");
        if (!sent) revert TransferFailed();
        emit BountyPaid(id, contributor, reward);
    }

    function refundExpired(uint256 id) external nonReentrant {
        Bounty storage bounty = _bounties[id];
        if (msg.sender != bounty.creator) revert Unauthorized();

        if (bounty.status == Status.Open) {
            if (block.timestamp <= bounty.deadline) revert InvalidState();
        } else if (bounty.status == Status.Submitted) {
            if (block.timestamp <= bounty.deadline + REVIEW_GRACE_PERIOD) revert InvalidState();
        } else {
            revert InvalidState();
        }

        bounty.status = Status.Refunded;
        uint256 reward = bounty.reward;
        (bool sent,) = payable(bounty.creator).call{value: reward}("");
        if (!sent) revert TransferFailed();
        emit BountyRefunded(id, bounty.creator, reward);
    }

    function getBounty(uint256 id) external view returns (Bounty memory) { return _bounties[id]; }
    function bountyCount() external view returns (uint256) { return _bounties.length; }
}
