const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

const BASE_URL = 'http://localhost:3000/api';
const WALLET_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

async function runSimulation() {
    try {
        console.log("--- Starting Simulation ---");

        // 1. Register
        console.log("1. Registering Voter...");
        const regRes = await fetch(`${BASE_URL}/voter/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: "sim@example.com" })
        });
        const regData = await regRes.json();
        const passkey = regData.passkey;
        console.log("   Passkey:", passkey);

        // 2. Link Wallet
        console.log("2. Linking Wallet...");
        await fetch(`${BASE_URL}/voter/link-wallet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passkey, walletAddress: WALLET_ADDRESS })
        });
        console.log("   Wallet Linked:", WALLET_ADDRESS);

        // 3. Generate Merkle Root (Election ID 1)
        console.log("3. Generating Merkle Root...");
        // Create election first
        const elecRes = await fetch(`${BASE_URL}/election`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: "Simulation Election" })
        });
        const elecData = await elecRes.json();
        const electionId = elecData.election.id;
        console.log("   Created Election ID:", electionId);

        const rootRes = await fetch(`${BASE_URL}/election/${electionId}/generate-merkle`, { method: 'POST' });
        const rootData = await rootRes.json();
        const root = rootData.root;
        console.log("   Generated Root:", root);

        // 4. Get Proof
        console.log("4. Fetching Proof...");
        const proofRes = await fetch(`${BASE_URL}/election/${electionId}/proof?address=${WALLET_ADDRESS}`);
        const proofData = await proofRes.json();
        const proof = proofData.proof;
        console.log("   Proof:", proof);

        // 5. Verify Locally
        console.log("5. Verifying Proof Locally...");

        // Fetch all voters to reconstruct tree
        const debugRes = await fetch(`${BASE_URL}/voter/debug`);
        const debugData = await debugRes.json();
        const allVoters = debugData.voters;
        const addresses = allVoters.map(v => v.walletAddress).filter(Boolean);
        console.log("   All Registered Addresses:", addresses);

        const leaves = addresses.map(addr => keccak256(Buffer.from(addr.replace(/^0x/, ''), 'hex')));
        const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
        const localRoot = tree.getHexRoot();

        console.log("   Local Root:", localRoot);
        console.log("   Remote Root:", root);

        if (localRoot === root) {
            console.log("✅ Simulation Complete. Root MATCHES.");
        } else {
            console.log("❌ Simulation Failed. Root MISMATCH.");
        }

    } catch (err) {
        console.error("❌ Simulation Error:", err);
    }
}

runSimulation();
