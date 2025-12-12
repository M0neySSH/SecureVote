const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');

// Hardhat Account 0 Private Key (Rich Account)
const ADMIN_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const RPC_URL = "http://127.0.0.1:8545";

router.post('/', async (req, res) => {
    const { address } = req.body;

    if (!address) {
        return res.status(400).json({ error: "Address is required" });
    }

    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);

        const tx = await wallet.sendTransaction({
            to: address,
            value: ethers.parseEther("1.0") // Send 1 ETH
        });

        await tx.wait();

        res.json({ success: true, txHash: tx.hash, message: "Sent 1.0 ETH" });
    } catch (error) {
        console.error("Faucet Error:", error);
        res.status(500).json({ error: "Faucet failed", details: error.message });
    }
});

module.exports = router;
