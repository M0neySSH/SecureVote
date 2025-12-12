const ethers = require('ethers');
const { ABI } = require('../frontend/src/contractConfig'); // We need ABI, but it's in frontend. 
// I'll just copy the minimal ABI needed.

const MINIMAL_ABI = [
    "function merkleRoot() view returns (bytes32)",
    "function electionCycle() view returns (uint256)",
    "function state() view returns (uint8)"
];

const CONTRACT_ADDRESS = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";

async function checkState() {
    try {
        console.log("--- Checking System State ---");

        // 1. Fetch Backend State
        console.log("1. Fetching Backend Election...");
        const res = await fetch('http://localhost:3000/api/election');
        const data = await res.json();
        const election = data.elections[data.elections.length - 1]; // Get latest

        if (!election) {
            console.log("   No elections found in backend.");
        } else {
            console.log("   Backend Election ID:", election.id);
            console.log("   Backend State:", election.state);
            console.log("   Backend Merkle Root:", election.merkleRoot);
        }

        // 2. Fetch Contract State
        console.log("\n2. Fetching Contract State...");
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, MINIMAL_ABI, provider);

        const contractRoot = await contract.merkleRoot();
        const cycle = await contract.electionCycle();
        const state = await contract.state();

        console.log("   Contract Cycle:", cycle.toString());
        console.log("   Contract State:", state.toString(), "(0=Created, 1=Started)");
        console.log("   Contract Merkle Root:", contractRoot);

        // 3. Compare
        if (election && election.merkleRoot === contractRoot) {
            console.log("\n✅ ROOTS MATCH");
        } else {
            console.log("\n❌ ROOTS MISMATCH");
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

checkState();
