const { ethers } = require('ethers');

const PROVIDER_URL = 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = process.argv[2] || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

async function checkCode() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    try {
        const network = await provider.getNetwork();
        console.log("Connected to Chain ID:", network.chainId.toString());
        const block = await provider.getBlockNumber();
        console.log("Current Block:", block);

        const code = await provider.getCode(CONTRACT_ADDRESS);
        console.log(`Code at ${CONTRACT_ADDRESS}:`, code.slice(0, 50) + "...");
        if (code === '0x') {
            console.error("❌ NO CODE at this address! Contract is not deployed here.");
        } else {
            console.log("✅ Code found! Contract exists.");
        }
    } catch (e) {
        console.error("Error fetching code:", e);
    }
}

checkCode();
