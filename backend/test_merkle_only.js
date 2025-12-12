const { ethers } = require('ethers');

const API_URL = 'http://127.0.0.1:3000/api';
const PROVIDER_URL = 'http://127.0.0.1:8545';
const ADMIN_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const CONTRACT_ADDRESS = '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6';
const ABI = require('../frontend/src/contractConfig').ABI;

async function runTest() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, adminWallet);

    console.log("🚀 Starting Merkle Test...");

    try {
        // 1. Reset Election
        console.log("1. Resetting...");
        const txReset = await contract.resetElection();
        await txReset.wait();
        console.log("✅ Reset");

        // 2. Create Election
        console.log("2. Creating Election...");
        await fetch(`${API_URL}/election`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: "Merkle Test" })
        });
        console.log("✅ Created");

        // 3. Register Voter
        console.log("3. Registering...");
        const regRes = await fetch(`${API_URL}/voter/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: `test${Date.now()}@example.com` })
        });
        const regData = await regRes.json();
        console.log(`✅ Registered: ${regData.walletAddress}`);

        // 4. Generate Merkle
        console.log("4. Generating Merkle...");
        const merkleRes = await fetch(`${API_URL}/election/1/generate-merkle`, { method: 'POST' });
        const merkleData = await merkleRes.json();
        const root = merkleData.root;
        console.log(`✅ Root: ${root}`);

        // 5. Set Root
        console.log("5. Setting Root...");
        const txRoot = await contract.setMerkleRoot(root);
        await txRoot.wait();
        console.log("✅ Root Set on Blockchain!");

    } catch (error) {
        console.error("❌ FAILED:", error);
    }
}

runTest();
