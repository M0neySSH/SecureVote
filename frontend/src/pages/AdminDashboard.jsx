import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import { FACTORY_ADDRESS, FACTORY_ABI, ELECTION_ABI } from '../contractConfig';

function AdminDashboard() {
    const [elections, setElections] = useState([]);
    const [title, setTitle] = useState('');
    const [voterEmail, setVoterEmail] = useState('');
    const [selectedElection, setSelectedElection] = useState(null);
    const [candidateName, setCandidateName] = useState('');
    const [account, setAccount] = useState(null);
    const [contractAdmin, setContractAdmin] = useState('');
    const [currentMerkleRoot, setCurrentMerkleRoot] = useState('');
    const [voterStats, setVoterStats] = useState({ total: 0, linked: 0 });
    const [registerElectionId, setRegisterElectionId] = useState(''); // For voter registration dropdown

    useEffect(() => {
        fetchElections();
        fetchVoterStats();
    }, [account]);

    useEffect(() => {
        if (selectedElection && selectedElection.address) {
            fetchContractDetails(selectedElection.address);
        } else {
            setContractAdmin('');
            setCurrentMerkleRoot('');
        }
    }, [selectedElection, account]);

    const fetchVoterStats = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/voter/debug');
            const voters = res.data.voters;
            const linked = voters.filter(v => v.walletAddress).length;
            setVoterStats({ total: voters.length, linked });
        } catch (err) {
            console.error("Failed to fetch voter stats");
        }
    };

    const connectWallet = async () => {
        if (window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            setAccount(await signer.getAddress());
        } else {
            alert("Please install MetaMask!");
        }
    };

    const fetchContractDetails = async (address) => {
        if (window.ethereum && address) {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const contract = new ethers.Contract(address, ELECTION_ABI, provider);
                try {
                    const admin = await contract.admin();
                    setContractAdmin(admin);
                } catch (e) { console.log("Could not fetch admin"); }

                try {
                    const root = await contract.merkleRoot();
                    setCurrentMerkleRoot(root);
                } catch (e) { console.log("Could not fetch root"); }

            } catch (err) {
                console.error("Failed to fetch contract details", err);
            }
        }
    };

    const fetchElections = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/election');
            let loadedElections = res.data.elections;

            // Fetch real status from blockchain for each election
            if (window.ethereum && loadedElections.length > 0) {
                const provider = new ethers.BrowserProvider(window.ethereum);
                // We can do this in parallel
                const statusPromises = loadedElections.map(async (election) => {
                    try {
                        const contract = new ethers.Contract(election.address, ELECTION_ABI, provider);
                        const stateIdx = await contract.state();
                        const states = ["Created", "Started", "VotingEnded"];
                        return { ...election, state: states[stateIdx] };
                    } catch (e) {
                        console.error(`Failed to fetch state for ${election.id}`, e);
                        return election; // Fallback to backend state
                    }
                });
                loadedElections = await Promise.all(statusPromises);
            }

            setElections(loadedElections);

            if (selectedElection) {
                const updated = loadedElections.find(e => e.id === selectedElection.id);
                setSelectedElection(updated);
            }
            // Default register dropdown to first election
            if (!registerElectionId && loadedElections.length > 0) {
                setRegisterElectionId(loadedElections[0].id);
            }
        } catch (err) {
            console.error("Failed to fetch elections", err);
        }
    };

    const createElection = async () => {
        if (!title) return alert("Title is required");
        if (!account) return alert("Connect wallet first");

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const network = await provider.getNetwork();
            if (network.chainId !== 1337n) {
                alert(`Wrong Network! You are on Chain ID ${network.chainId}. Please switch to Localhost 8545 (Chain ID 1337).`);
                return;
            }

            const signer = await provider.getSigner();
            const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

            console.log("Creating election on blockchain...");
            const tx = await factory.createElection(title);
            const receipt = await tx.wait();

            console.log("Transaction Receipt:", receipt);

            // Find the ElectionCreated event to get the new address
            // Event signature: ElectionCreated(address electionAddress, string title)
            let newElectionAddress = null;
            for (const log of receipt.logs) {
                try {
                    const parsed = factory.interface.parseLog(log);
                    if (parsed && parsed.name === 'ElectionCreated') {
                        newElectionAddress = parsed.args[0];
                        break;
                    }
                } catch (e) {
                    console.warn("Log parse error:", e);
                }
            }

            if (!newElectionAddress) {
                console.error("Receipt Logs:", receipt.logs);
                throw new Error("Could not find ElectionCreated event in transaction receipt.");
            }

            console.log("Election deployed at:", newElectionAddress);

            // Save to backend
            await axios.post('http://localhost:3000/api/election', { title, address: newElectionAddress });

            setTitle('');
            fetchElections();
            alert(`Election Created! Address: ${newElectionAddress}`);
        } catch (err) {
            console.error("Create Election Error:", err);
            const msg = err.reason || err.shortMessage || err.message || "Unknown error";
            alert(`Failed to create election: ${msg}\n\nCheck console for full details.`);
        }
    };

    const [lastRegisteredPasskey, setLastRegisteredPasskey] = useState(null);

    const registerVoter = async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(voterEmail)) {
            return alert("Please enter a valid email address.");
        }
        if (!registerElectionId) return alert("Please select an election to register for.");

        const electionToRegister = elections.find(e => e.id == registerElectionId);
        if (electionToRegister && electionToRegister.state !== 'Created') {
            return alert(`Cannot register for this election. It is already ${electionToRegister.state}.`);
        }

        try {
            // 1. Register (Get Keypair)
            const res = await axios.post('http://localhost:3000/api/voter/register', {
                email: voterEmail,
                electionId: registerElectionId
            });
            const { passkey, walletAddress } = res.data;

            setLastRegisteredPasskey(passkey);
            setVoterEmail('');

            // 2. Fund the Voter (if Admin is connected)
            if (account) {
                try {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const signer = await provider.getSigner();
                    console.log(`Funding voter ${walletAddress}...`);
                    const tx = await signer.sendTransaction({
                        to: walletAddress,
                        value: ethers.parseEther("0.01") // Send 0.01 ETH for gas
                    });
                    await tx.wait();
                    alert(`Voter Registered & Funded! \nPasskey: ${passkey}`);
                } catch (fundErr) {
                    console.error("Funding failed", fundErr);
                    alert(`Voter Registered, but Funding Failed. They need ETH to vote.\nPasskey: ${passkey}`);
                }
            } else {
                alert(`Voter Registered (Not Funded - Connect Admin Wallet!)\nPasskey: ${passkey}`);
            }

            fetchVoterStats();
        } catch (err) {
            console.error(err);
            alert("Registration failed");
        }
    };

    const copyPasskey = () => {
        if (lastRegisteredPasskey) {
            navigator.clipboard.writeText(lastRegisteredPasskey);
            alert("Passkey copied to clipboard!");
        }
    };

    const [candidatePhotoUrl, setCandidatePhotoUrl] = useState('');

    const addCandidate = async () => {
        if (!candidateName) return alert("Candidate name is required");
        try {
            // Backend check first (fast feedback)
            await axios.post(`http://localhost:3000/api/election/${selectedElection.id}/candidates`, {
                name: candidateName,
                photoUrl: candidatePhotoUrl
            });

            if (account) {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const contract = new ethers.Contract(selectedElection.address, ELECTION_ABI, signer);
                const tx = await contract.addCandidate(candidateName);
                await tx.wait();
                alert("Candidate added to Blockchain!");
            }

            setCandidateName('');
            setCandidatePhotoUrl('');
            fetchElections();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.error || err.reason || "Failed to add candidate";
            alert(`Error: ${msg}`);
        }
    };

    const setMerkleRoot = async () => {
        if (!account) return alert("Connect wallet first");
        try {
            // 1. Generate Root on Backend
            const res = await axios.post(`http://localhost:3000/api/election/${selectedElection.id}/generate-merkle`);
            const root = res.data.root;

            // 2. Set Root on Contract
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(selectedElection.address, ELECTION_ABI, signer);
            const tx = await contract.setMerkleRoot(root);
            await tx.wait();

            alert(`Merkle Root Set: ${root}`);
            fetchContractDetails(selectedElection.address);
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 400 && err.response.data.error.includes("No registered voters")) {
                alert("ERROR: No registered voters found for this election!");
            } else {
                const msg = err.response?.data?.error || err.reason || "Failed to set Merkle Root";
                alert(`Error: ${msg}`);
            }
        }
    };

    const startElection = async () => {
        if (!account) return alert("Connect wallet first");
        if (currentMerkleRoot === ethers.ZeroHash) return alert("Merkle Root not set! Register voters and set root first.");

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(selectedElection.address, ELECTION_ABI, signer);
            const tx = await contract.startElection();
            await tx.wait();
            alert("Election Started!");
            fetchElections();
        } catch (err) {
            console.error(err);
            const msg = err.reason || "Failed to start election";
            alert(`Error: ${msg}`);
        }
    };

    const endVoting = async () => {
        if (!account) return alert("Connect wallet first");
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(selectedElection.address, ELECTION_ABI, signer);
            const tx = await contract.endVoting();
            await tx.wait();
            alert("Voting Ended!");
        } catch (err) {
            console.error(err);
            const msg = err.reason || "Failed to end voting";
            alert(`Error: ${msg}`);
        }
    };

    const [autoSetupStatus, setAutoSetupStatus] = useState('');

    const autoSetup = async () => {
        if (!account) return alert("Connect wallet first");
        if (!selectedElection) return alert("Select an election first");

        try {
            // 0. Pre-check: Are there any voters?
            const debugRes = await axios.get('http://localhost:3000/api/voter/debug');
            // Filter locally to check if ANY exist for this election
            const hasVoters = debugRes.data.voters.some(v => v.electionId == selectedElection.id);

            if (!hasVoters) {
                return alert("⚠️ NO VOTERS FOUND FOR THIS ELECTION!\n\nPlease Register a NEW voter for this specific election first.");
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(selectedElection.address, ELECTION_ABI, signer);

            // 1. Generate Root
            setAutoSetupStatus("1/3 Generating Merkle Root...");
            console.log("Generating Root...");
            const res = await axios.post(`http://localhost:3000/api/election/${selectedElection.id}/generate-merkle`);
            const root = res.data.root;

            if (!root || root === "0x") throw new Error("Backend generated an invalid Root (0x)");

            // 2. Set Root
            setAutoSetupStatus(`2/3 Setting Root: ${root.slice(0, 10)}...`);
            console.log("Setting Root...", root);
            const tx2 = await contract.setMerkleRoot(root);
            await tx2.wait();

            // 3. Start
            setAutoSetupStatus("3/3 Starting Election...");
            console.log("Starting...");
            const tx3 = await contract.startElection();
            await tx3.wait();

            setAutoSetupStatus("");
            alert("✅ Auto-Setup Complete! Election is LIVE. Go vote!");
            fetchContractDetails(selectedElection.address);
            fetchElections();
        } catch (err) {
            console.error(err);
            setAutoSetupStatus("");
            if (err.response && err.response.status === 400 && err.response.data.error.includes("No registered voters")) {
                alert("AUTO-SETUP FAILED: No Registered Voters for this election!");
            } else {
                const reason = err.reason || err.message || "Unknown error";
                alert(`Auto-Setup Failed: ${reason}`);
            }
        }
    };

    return (
        <div className="container mx-auto p-8">
            <div className="flex flex-col mb-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    {!account ? (
                        <button onClick={connectWallet} className="bg-orange-600 text-white px-4 py-2 rounded">Connect Wallet</button>
                    ) : (
                        <div className="text-right">
                            <p className="text-green-600 font-bold">Connected: {account}</p>
                            <p className="text-xs text-gray-500">Contract Admin: {contractAdmin}</p>
                            {contractAdmin && account.toLowerCase() !== contractAdmin.toLowerCase() && (
                                <p className="text-red-500 font-bold text-sm">⚠️ You are NOT the Admin!</p>
                            )}
                        </div>
                    )}
                </div>
                <div className="mt-4 bg-gray-100 dark:bg-gray-700 p-2 rounded flex gap-4 text-sm">
                    <p>🗳️ Total Registrations: <strong>{voterStats.total}</strong></p>
                    <p className="text-green-500 font-bold">
                        🔗 Pre-Linked Wallets: {voterStats.linked}
                    </p>
                </div>
                {currentMerkleRoot && (
                    <p className="text-xs text-gray-400 mt-2">Merkle Root: {currentMerkleRoot}</p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
                    <h2 className="text-xl font-bold mb-4">Create New Election</h2>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 p-2 border rounded dark:bg-gray-700"
                            placeholder="Election Title (e.g. Class President)"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <button onClick={createElection} className="bg-green-600 text-white px-4 py-2 rounded">Create</button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
                    <h2 className="text-xl font-bold mb-4">Register Voter</h2>
                    <div className="flex flex-col gap-2">
                        <select
                            className="p-2 border rounded dark:bg-gray-700"
                            value={registerElectionId}
                            onChange={(e) => setRegisterElectionId(e.target.value)}
                        >
                            <option value="">Select Election...</option>
                            {elections.filter(e => e.state === 'Created').map(e => (
                                <option key={e.id} value={e.id}>{e.title}</option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                className="flex-1 p-2 border rounded dark:bg-gray-700"
                                placeholder="Voter Email"
                                value={voterEmail}
                                onChange={(e) => setVoterEmail(e.target.value)}
                            />
                            <button onClick={registerVoter} className="bg-blue-600 text-white px-4 py-2 rounded">Register</button>
                        </div>
                    </div>
                    {lastRegisteredPasskey && (
                        <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                            <p className="font-bold">✅ Voter Registered!</p>
                            <p className="text-sm mb-2">Passkey:</p>
                            <div className="flex items-center gap-2 bg-white p-2 rounded border">
                                <code className="flex-1 overflow-x-auto">{lastRegisteredPasskey}</code>
                                <button onClick={copyPasskey} className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-sm">Copy</button>
                            </div>
                            <p className="text-xs mt-2 text-red-600 font-bold">⚠️ SAVE THIS! This is your Voting Key.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-2xl font-bold mb-4">Elections List</h2>
                    {elections.length === 0 && <p className="text-gray-500">No elections created yet.</p>}
                    {elections.map(election => (
                        <div key={election.id} className={`p-4 rounded shadow mb-4 flex justify-between items-center ${selectedElection?.id === election.id ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500' : 'bg-white dark:bg-gray-800'}`}>
                            <div>
                                <h3 className="text-xl font-bold">{election.title}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{election.address}</p>
                                <p>Status: {election.state}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{election.candidates.length} Candidates</p>
                            </div>
                            <button
                                onClick={() => setSelectedElection(election)}
                                className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                            >
                                Manage
                            </button>
                        </div>
                    ))}
                </div>

                {selectedElection && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded shadow h-fit">
                        <h2 className="text-xl font-bold mb-4">Manage: {selectedElection.title}</h2>
                        <p className="text-xs text-gray-400 mb-4">Contract: {selectedElection.address}</p>

                        <div className="flex gap-2 mb-6 flex-wrap">
                            <button onClick={setMerkleRoot} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">Set Merkle Root</button>
                            <button onClick={startElection} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Start Election</button>
                            <button onClick={endVoting} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Stop Election</button>
                            <button onClick={autoSetup} className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900 font-bold border-2 border-white">
                                {autoSetupStatus ? <span className="animate-pulse">{autoSetupStatus}</span> : "⚡ Auto-Setup & Start"}
                            </button>
                        </div>

                        <div className="mb-6">
                            <h3 className="font-bold mb-2">Add Candidate</h3>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 p-2 border rounded dark:bg-gray-700"
                                        placeholder="Candidate Name (Required)"
                                        value={candidateName}
                                        onChange={(e) => setCandidateName(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        className="flex-1 p-2 border rounded dark:bg-gray-700"
                                        placeholder="Photo URL (Optional)"
                                        value={candidatePhotoUrl}
                                        onChange={(e) => setCandidatePhotoUrl(e.target.value)}
                                    />
                                </div>
                                <button onClick={addCandidate} className="bg-indigo-600 text-white px-4 py-2 rounded self-end">Add Candidate</button>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold mb-2">Candidates</h3>
                            {selectedElection.candidates.length === 0 ? (
                                <p className="text-gray-500">No candidates yet.</p>
                            ) : (
                                <ul className="list-disc pl-5">
                                    {selectedElection.candidates.map(c => (
                                        <li key={c.id}>{c.name}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminDashboard;
