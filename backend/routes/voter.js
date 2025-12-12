const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { ethers } = require('ethers');
const { voters } = require('../db/mock');

router.post('/register', async (req, res) => {
    console.log("DEBUG: Register endpoint hit");
    const { email, electionId } = req.body;

    if (!electionId) return res.status(400).json({ error: "Election ID required" });

    // Check for duplicate email in THIS election
    console.log(`DEBUG: Checking duplicates for ${email} in election ${electionId}`);
    console.log("DEBUG: Current voters:", JSON.stringify(voters));

    const existingVoter = voters.find(v => v.email === email && v.electionId == electionId);
    if (existingVoter) {
        console.log(`DEBUG: Duplicate found!`);
        return res.status(400).json({ error: "This email is already registered for this election." });
    } else {
        console.log("DEBUG: No duplicate found.");
    }

    try {
        console.log("DEBUG: Creating random wallet...");
        const wallet = ethers.Wallet.createRandom();
        console.log("DEBUG: Wallet created object:", !!wallet);

        const passkey = wallet.privateKey;
        console.log("DEBUG: Passkey:", passkey ? "Present" : "Missing");

        const walletAddress = wallet.address;
        console.log("DEBUG: Address:", walletAddress);

        const responseObj = { message: "Voter registered", passkey: passkey, walletAddress: walletAddress };
        console.log("DEBUG: Sending response:", responseObj);

        // Store voter
        voters.push({ email, passkey, walletAddress, electionId });
        console.log("DEBUG: Voter pushed. Total voters:", voters.length);
        console.log("DEBUG: Current voters array:", JSON.stringify(voters));

        res.json(responseObj);
    } catch (e) {
        console.error("DEBUG: Registration error:", e);
        res.status(500).json({ error: "Registration failed" });
    }
});

router.post('/link-wallet', async (req, res) => {
    const { passkey, walletAddress } = req.body;
    const voter = voters.find(v => v.passkey === passkey); // In prod, compare hashes
    if (!voter) return res.status(400).json({ error: "Invalid passkey" });

    voter.walletAddress = walletAddress;
    res.json({ message: "Wallet linked" });
});

router.get('/debug', (req, res) => {
    console.log("DEBUG: Debug endpoint hit. Total voters:", voters.length);
    res.json({ voters });
});

module.exports = router;
