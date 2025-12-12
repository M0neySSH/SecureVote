const { ethers } = require('ethers');

// Configuration
const API_URL = 'http://127.0.0.1:3000/api';
const PROVIDER_URL = 'http://127.0.0.1:8545';
const ADMIN_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const CONTRACT_ADDRESS = '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6';
const ABI = require('../frontend/src/contractConfig').ABI;

async function runTest() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, adminWallet);

    console.log("🚀 Starting Full Flow Test...");

    try {
        // 1. Reset Election
        console.log("\n1. Resetting Election...");
        const txReset = await contract.resetElection();
        await txReset.wait();
        console.log("✅ Election Reset");

        // 1.5 Create Election
        console.log("\n1.5 Creating Election...");
        await fetch(`${API_URL}/election`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: "Test Election" })
        });
        console.log("✅ Election Created");

        // 2. Register Voter
        console.log("\n2. Registering Voter...");
        const regRes = await fetch(`${API_URL}/voter/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: `test${Date.now()}@example.com` })
        });
        const rawText = await regRes.text();
        console.log("DEBUG: Raw Response Text:", rawText);
        const regData = JSON.parse(rawText);
        console.log("DEBUG: Registration Response:", JSON.stringify(regData, null, 2));
        const { passkey, walletAddress } = regData;

        if (!walletAddress) {
            throw new Error("Wallet Address is MISSING in response!");
        }

        console.log(`✅ Voter Registered: ${walletAddress}`);
        console.log(`🔑 Passkey: ${passkey ? passkey.slice(0, 10) + '...' : 'MISSING'}`);

        // 3. Fund Voter
        console.log("\n3. Funding Voter...");
        const balance = await provider.getBalance(adminWallet.address);
        console.log("DEBUG: Admin Balance:", ethers.formatEther(balance));

        try {
            const txFund = await adminWallet.sendTransaction({
                to: walletAddress,
                value: ethers.parseEther("0.1")
            });
            await txFund.wait();
            console.log("✅ Voter Funded (0.1 ETH)");
        } catch (fundError) {
            console.error("❌ Funding Failed:", fundError);
            throw fundError;
        }

        // 4. Get Election ID
        // const electionsRes = await fetch(`${API_URL}/election`);
        // const electionsData = await electionsRes.json();
        // const electionId = electionsData.elections[0].id;
        const electionId = 1;
        console.log(`\nTargeting Election ID: ${electionId}`);

        // 5. Generate Merkle Root
        console.log("\n5. Generating Merkle Root...");
        const merkleRes = await fetch(`${API_URL}/election/${electionId}/generate-merkle`, { method: 'POST' });
        const merkleData = await merkleRes.json();
        console.log("DEBUG: Merkle Response:", JSON.stringify(merkleData, null, 2));
        const root = merkleData.root;

        if (!root || !root.startsWith('0x') || root.length !== 66) {
            throw new Error(`Invalid Root: ${root}`);
        }

        console.log(`✅ Root Generated: ${root}`);

        // 6. Set Merkle Root on Contract
        console.log("\n6. Setting Root on Contract...");
        try {
            const txRoot = await contract.setMerkleRoot(root);
            await txRoot.wait();
            console.log("✅ Root Set on Blockchain");
        } catch (err) {
            console.error("❌ setMerkleRoot FAILED:", err);
            if (err.reason) console.error("Revert Reason:", err.reason);
            if (err.data) console.error("Error Data:", err.data);
            throw err;
        }

        // 7. Start Election
        console.log("\n7. Starting Election...");
        const txStart = await contract.startElection();
        await txStart.wait();
        console.log("✅ Election Started");

        // 8. Voter Login & Vote
        console.log("\n8. Voter Voting...");
        const voterWallet = new ethers.Wallet(passkey, provider);
        const voterContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, voterWallet);

        // 8a. Get Proof
        const proofRes = await fetch(`${API_URL}/election/${electionId}/proof?address=${walletAddress}`);
        const proofData = await proofRes.json();
        const proof = proofData.proof;

        // 8b. Create Commitment
        const candidateId = 1;
        const secret = "mysecretvote";
        const commitment = ethers.solidityPackedKeccak256(
            ['address', 'uint256', 'bytes32'],
            [walletAddress, candidateId, ethers.keccak256(ethers.toUtf8Bytes(secret))]
        );

        // 8c. Commit Vote
        const txVote = await voterContract.commitVote(commitment, proof);
        await txVote.wait();
        console.log("✅ Vote Committed Successfully!");

        console.log("\n🎉 FULL FLOW PASSED!");

    } catch (error) {
        console.error("\n❌ TEST FAILED:", error);
    }
}

runTest();
