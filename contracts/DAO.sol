pragma solidity ^0.8.10;

import "./ERC20.sol";

contract DAO is AccessControl {

    enum Side { Yes, No }
    enum Status { Undecided, Approved, Rejected }

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct Proposal {
        address author;
        bytes32 hash;
        uint256 createdAt;
        uint256 votesYes;
        uint256 votesNo;
        uint256 totalShares;
        Status status;
    }

    event AddProposal(address author, bytes32 hash, uint256 createdAt, Status status);
    event Deposit(address owner, uint256 amount);
    event FinishProposal(bytes32 hash, uint256 finishAt, Status status);


    mapping(bytes32 => Proposal) public proposals;
    mapping(address => mapping(bytes32 => bool)) public votes;
    mapping(address => uint256) public shares;

    IERC20 public token;

    uint256 public periodDuration = 259200;
    uint256 public approvedPercent = 50;

    constructor(address _token) {

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        token = IERC20(_token);

        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);

    }

    function deposit(uint256 amount) external {

        shares[msg.sender] += amount;
        token.transferFrom(msg.sender, address(this), amount);
        emit Deposit(msg.sender, amount);

    }

    function getShares() external view returns(uint256) {
        return shares[msg.sender];
    }

    function getTotalShares(bytes32 proposalHash) external view returns(uint256) {
        return proposals[proposalHash].totalShares;
    }


    function withdraw(uint256 amount, bytes32 proposalHash) external {

        require(shares[msg.sender] >= amount, "Not enough shares");
        require(block.timestamp >= proposals[proposalHash].createdAt + periodDuration, "Voting period is not over");

        shares[msg.sender] -= amount;
        token.transfer(msg.sender, amount);

    }


    function createProposal(bytes32 proposalHash) external {

        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not a admin");
        require(proposals[proposalHash].hash == bytes32(0), "Proposal already exists");

        proposals[proposalHash] = Proposal(msg.sender, proposalHash, block.timestamp, 0, 0, 0, Status.Undecided);
        emit AddProposal(msg.sender, proposalHash, block.timestamp, Status.Undecided);

    }

    function changeVotingPeriod(uint256 _votingPeriod) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not a admin");
        periodDuration = _votingPeriod;
    }

    function changeApprovedPercent(uint256 _approvedPercent) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not a admin");
        approvedPercent = _approvedPercent;
    }

    function vote(bytes32 proposalHash, Side side) external {

        require(votes[msg.sender][proposalHash] == false, "Already voted");
        require(proposals[proposalHash].hash != bytes32(0), "Proposal does not exist");
        require(block.timestamp <= proposals[proposalHash].createdAt + periodDuration, "Voting period over");

        votes[msg.sender][proposalHash] = true;

        if (side == Side.Yes) {
            proposals[proposalHash].votesYes += shares[msg.sender];
            proposals[proposalHash].totalShares += shares[msg.sender];
        } 
        
        else {
            proposals[proposalHash].votesNo += shares[msg.sender];
            proposals[proposalHash].totalShares += shares[msg.sender];
        }
    }

    function finish(bytes32 proposalHash, address proposalCall, bytes memory data) external {

        require(block.timestamp >= proposals[proposalHash].createdAt + periodDuration, "Voting period is not over");

        if ((proposals[proposalHash].votesYes * 100) / proposals[proposalHash].totalShares > approvedPercent) {
            proposals[proposalHash].status = Status.Approved;
            proposalCall.call(data);
            emit FinishProposal(proposalHash, block.timestamp, Status.Approved);
        }
    
        if ((proposals[proposalHash].votesNo * 100) / proposals[proposalHash].totalShares > approvedPercent) {
            proposals[proposalHash].status = Status.Rejected;
            emit FinishProposal(proposalHash, block.timestamp, Status.Rejected);
        }

        // bytes memory data = "40c10f19000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb922660000000000000000000000000000000000000000000000056BC75E2D63100000";

        
        // 40c10f19
        // 000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266
        // 0000000000000000000000000000000000000000000000056BC75E2D63100000
        

    }

}