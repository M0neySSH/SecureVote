// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Election {
    address public admin;
    string public electionTitle;
    bytes32 public merkleRoot;

    enum State { Created, Started, VotingEnded, RevealEnded }
    State public state;

    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }

    // Candidate ID -> Candidate
    mapping(uint => Candidate) public candidates;
    uint public candidateCount;
    
    // Check for duplicate names
    mapping(string => bool) private _candidateNames;

    // Voter -> Has Voted
    mapping(address => bool) public hasVoted;

    event ElectionStarted();
    event VotingEnded();
    event CandidateAdded(uint id, string name);
    event VoteCast(address indexed voter, uint candidateId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier inState(State _state) {
        require(state == _state, "Invalid state");
        _;
    }

    constructor(address _admin, string memory _title) {
        admin = _admin;
        electionTitle = _title;
        state = State.Created;
    }

    function setMerkleRoot(bytes32 _root) external onlyAdmin {
        require(state == State.Created, "Election already started");
        merkleRoot = _root;
    }

    function addCandidate(string memory _name) external onlyAdmin {
        require(state == State.Created, "Election already started");
        require(!_candidateNames[_name], "Candidate name already exists");
        
        candidateCount++;
        candidates[candidateCount] = Candidate(candidateCount, _name, 0);
        _candidateNames[_name] = true;
        
        emit CandidateAdded(candidateCount, _name);
    }

    function startElection() external onlyAdmin {
        require(state == State.Created, "Already started");
        require(merkleRoot != bytes32(0), "Merkle root not set");
        state = State.Started;
        emit ElectionStarted();
    }

    function endVoting() external onlyAdmin {
        require(state == State.Started, "Voting not started");
        state = State.VotingEnded;
        emit VotingEnded();
    }

    // Direct Voting: Voter submits candidateId and proof
    function vote(uint _candidateId, bytes32[] calldata _proof) external inState(State.Started) {
        require(!hasVoted[msg.sender], "Already voted");
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate");

        // Verify Merkle Proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(_proof, merkleRoot, leaf), "Not whitelisted");

        hasVoted[msg.sender] = true;
        candidates[_candidateId].voteCount++;
        
        emit VoteCast(msg.sender, _candidateId);
    }

    function getCandidate(uint _id) external view returns (Candidate memory) {
        return candidates[_id];
    }
}
