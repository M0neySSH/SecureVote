const { ethers } = require('ethers');

const PROVIDER_URL = 'http://127.0.0.1:8545';
const FACTORY_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const FACTORY_ABI = [
    "function createElection(string memory _title) external",
    "event ElectionCreated(address electionAddress, string title)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const signer = await provider.getSigner(); // Uses the first account (Hardhat Account #0)

    console.log("Using account:", await signer.getAddress());

    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

    try {
        console.log("Creating election...");
        const tx = await factory.createElection("Test Election Script");
        console.log("Tx sent:", tx.hash);

        const receipt = await tx.wait();
        console.log("Tx mined in block:", receipt.blockNumber);

        for (const log of receipt.logs) {
            try {
                const parsed = factory.interface.parseLog(log);
                if (parsed.name === 'ElectionCreated') {
                    console.log("✅ Election Created!");
                    console.log("Address:", parsed.args[0]);
                    console.log("Title:", parsed.args[1]);
                    return;
                }
            } catch (e) { }
        }

        console.error("❌ ElectionCreated event not found!");
    } catch (e) {
        console.error("❌ Error creating election:", e);
    }
}

main();
