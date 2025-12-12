const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const PROVIDER_URL = 'http://127.0.0.1:8545';
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Account #0

async function deploy() {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("Deploying from:", wallet.address);

    // Read artifact
    const artifactPath = path.join(__dirname, '../contracts/artifacts/contracts/Election.sol/Election.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log("✅ Contract Deployed to:", address);
}

deploy().catch(console.error);
