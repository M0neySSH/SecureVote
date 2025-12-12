const { ethers } = require('ethers');

try {
    console.log("Ethers version:", ethers.version);
    const wallet = ethers.Wallet.createRandom();
    console.log("Wallet:", wallet);
    console.log("Address:", wallet.address);
    console.log("PrivateKey:", wallet.privateKey);
} catch (e) {
    console.error("Error:", e);
}
