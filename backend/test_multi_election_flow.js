const { ethers } = require('ethers');
const axios = require('axios');
const fs = require('fs');

const FACTORY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const API_URL = "http://localhost:3000/api";

// Read ABIs
const factoryArtifact = JSON.parse(fs.readFileSync('d:/voting2.0/contracts/artifacts/contracts/ElectionFactory.sol/ElectionFactory.json', 'utf8'));
const electionArtifact = JSON.parse(fs.readFileSync('d:/voting2.0/contracts/artifacts/contracts/Election.sol/Election.json', 'utf8'));

async function main() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const adminWallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider); // Hardhat Account 0

    console.log("Admin:", adminWallet.address);

    // Get initial nonce
    let nonce = await provider.getTransactionCount(adminWallet.address);
    console.log("Initial Admin Nonce:", nonce);

    // 1. Create Election via Factory
    console.log("\n1. Creating Election on Blockchain...");
    const factory = new ethers.Contract(FACTORY_ADDRESS, factoryArtifact.abi, adminWallet);
    const tx = await factory.createElection("Test Election 1", { nonce: nonce++ });
    const receipt = await tx.wait();

    let electionAddress;
    for (const log of receipt.logs) {
        try {
            const parsed = factory.interface.parseLog(log);
            if (parsed.name === 'ElectionCreated') {
                electionAddress = parsed.args[0];
                break;
            }
        } catch (e) { }
    }
    console.log("Election Deployed at:", electionAddress);

    // 2. Create Election in Backend
    console.log("\n2. Creating Election in Backend...");
    const createRes = await axios.post(`${API_URL}/election`, { title: "Test Election 1", address: electionAddress });
    const electionId = createRes.data.election.id;
    console.log("Election ID:", electionId);

    // 3. Add Candidate
    console.log("\n3. Adding Candidate...");
    // Backend
    await axios.post(`${API_URL}/election/${electionId}/candidates`, { name: "Alice" });
    // Contract
    const electionContract = new ethers.Contract(electionAddress, electionArtifact.abi, adminWallet);
    const txAdd = await electionContract.addCandidate("Alice", { nonce: nonce++ });
    await txAdd.wait();
    console.log("Candidate 'Alice' added.");

    // 4. Register Voter
    console.log("\n4. Registering Voter...");
    const regRes = await axios.post(`${API_URL}/voter/register`, { email: "voter@test.com", electionId: electionId });
    const { passkey, walletAddress } = regRes.data;
    console.log("Voter Registered:", walletAddress);

    // Fund Voter
    const txFund = await adminWallet.sendTransaction({
        to: walletAddress,
        value: ethers.parseEther("1.0"),
        nonce: nonce++
    });
    await txFund.wait();
    console.log("Voter Funded.");

    // 5. Generate Merkle Root
    console.log("\n5. Generating Merkle Root...");
    const rootRes = await axios.post(`${API_URL}/election/${electionId}/generate-merkle`);
    const root = rootRes.data.root;
    console.log("Merkle Root:", root);

    // 6. Set Root on Contract
    console.log("\n6. Setting Root on Contract...");
    const txRoot = await electionContract.setMerkleRoot(root, { nonce: nonce++ });
    await txRoot.wait();
    console.log("Root Set.");

    // 7. Start Election
    console.log("\n7. Starting Election...");
    const txStart = await electionContract.startElection({ nonce: nonce++ });
    await txStart.wait();
    console.log("Election Started.");

    // 8. Vote
    console.log("\n8. Voting...");
    const voterWallet = new ethers.Wallet(passkey, provider);
    const voterContract = new ethers.Contract(electionAddress, electionArtifact.abi, voterWallet);

    // Get Proof
    const proofRes = await axios.get(`${API_URL}/election/${electionId}/proof?address=${walletAddress}`);
    const proof = proofRes.data.proof;

    // Create Commitment
    const secret = "mysecret";
    const salt = ethers.keccak256(ethers.toUtf8Bytes(secret));
    const candidateId = 1;
    const commitment = ethers.solidityPackedKeccak256(['bytes32', 'uint256'], [salt, candidateId]);

    const txVote = await voterContract.commitVote(commitment, proof);
    console.log("Vote Tx Hash:", txVote.hash);
    await txVote.wait();
    console.log("Vote Committed!");

    console.log("\nSUCCESS: Full Multi-Election Flow Verified!");
}

main().catch(console.error);
