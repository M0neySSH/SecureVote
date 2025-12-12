const express = require('express');
const router = express.Router();
const { generateMerkleTree, getProof } = require('../utils/merkle');
const { elections, voters } = require('../db/mock');

router.post('/', async (req, res) => {
    const { title, address } = req.body;
    const id = elections.length + 1;
    const election = { id, title, address, state: 'Created', candidates: [], merkleRoot: null };
    elections.push(election);
    res.json({ message: "Election created", election });
});

router.get('/', async (req, res) => {
    res.json({ elections });
});

router.post('/:id/candidates', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const election = elections.find(e => e.id == id);
    if (!election) return res.status(404).json({ error: "Election not found" });

    // Check for duplicate name
    if (election.candidates.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        return res.status(400).json({ error: "Candidate name already exists in this election" });
    }

    const candidateId = election.candidates.length + 1;
    election.candidates.push({ id: candidateId, name, photoUrl: req.body.photoUrl || '' });
    res.json({ message: "Candidate added", candidateId });
});

router.post('/:id/generate-merkle', async (req, res) => {
    const { id } = req.params;
    // Fetch registered voters for THIS election
    const registeredAddresses = voters
        .filter(v => v.electionId == id)
        .map(v => v.walletAddress)
        .filter(Boolean);

    console.log(`[GENERATE-MERKLE] Election ID: ${id}`);
    console.log(`[GENERATE-MERKLE] Registered Addresses:`, registeredAddresses);

    if (registeredAddresses.length === 0) {
        return res.status(400).json({ error: "No registered voters for this election" });
    }

    const { root } = generateMerkleTree(registeredAddresses);
    console.log(`[GENERATE-MERKLE] Generated Root: ${root}`);

    const election = elections.find(e => e.id == id);
    if (election) {
        election.merkleRoot = root;
    }

    res.json({ message: "Merkle root generated", root });
});

router.get('/:id/proof', async (req, res) => {
    const { id } = req.params;
    const { address } = req.query;

    if (!address) return res.status(400).json({ error: "Address required" });

    const registeredAddresses = voters
        .filter(v => v.electionId == id)
        .map(v => v.walletAddress)
        .filter(Boolean);

    console.log(`[GET-PROOF] Request for address: ${address} (Election ${id})`);
    console.log(`[GET-PROOF] Registered Addresses:`, registeredAddresses);

    const { tree } = generateMerkleTree(registeredAddresses);
    const proof = getProof(tree, address);
    console.log(`[GET-PROOF] Generated Proof:`, proof);

    res.json({ proof });
});

module.exports = router;
