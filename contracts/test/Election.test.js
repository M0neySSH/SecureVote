const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

describe("Election", function () {
    let Election;
    let election;
    let owner;
    let addr1;
    let addr2;
    let addrs;
    let merkleTree;
    let root;

    beforeEach(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        // Create Merkle Tree
        const leaves = [owner.address, addr1.address, addr2.address].map(x => keccak256(x));
        merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
        root = merkleTree.getHexRoot();

        Election = await ethers.getContractFactory("Election");
        election = await Election.deploy();
    });

    it("Should set the right owner", async function () {
        expect(await election.admin()).to.equal(owner.address);
    });

    it("Should allow admin to add candidate", async function () {
        await election.addCandidate("Candidate 1");
        const candidate = await election.candidates(1);
        expect(candidate.name).to.equal("Candidate 1");
    });

    it("Should allow admin to set merkle root", async function () {
        await election.setMerkleRoot(root);
        expect(await election.merkleRoot()).to.equal(root);
    });

    it("Should start election", async function () {
        await election.setMerkleRoot(root);
        await election.startElection();
        expect(await election.state()).to.equal(1); // Started
    });

    it("Should allow voter to commit vote", async function () {
        await election.setMerkleRoot(root);
        await election.startElection();

        const candidateId = 1;
        const salt = ethers.encodeBytes32String("mysalt");
        const commitment = ethers.solidityPackedKeccak256(["bytes32", "uint256"], [salt, candidateId]);

        const leaf = keccak256(owner.address);
        const proof = merkleTree.getHexProof(leaf);

        await election.commitVote(commitment, proof);
        expect(await election.commitments(owner.address)).to.equal(commitment);
    });

    it("Should allow voter to reveal vote", async function () {
        await election.addCandidate("Candidate 1");
        await election.setMerkleRoot(root);
        await election.startElection();

        const candidateId = 1;
        const salt = ethers.encodeBytes32String("mysalt");
        const commitment = ethers.solidityPackedKeccak256(["bytes32", "uint256"], [salt, candidateId]);

        const leaf = keccak256(owner.address);
        const proof = merkleTree.getHexProof(leaf);

        await election.commitVote(commitment, proof);

        await election.endVoting();

        await election.revealVote(candidateId, salt);

        const candidate = await election.candidates(1);
        expect(candidate.voteCount).to.equal(1);
        expect(await election.hasRevealed(owner.address)).to.be.true;
    });
});
