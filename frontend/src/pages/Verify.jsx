import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { ELECTION_ABI } from '../contractConfig';

function Verify() {
    const [txHash, setTxHash] = useState('');
    const [status, setStatus] = useState('');
    const [elections, setElections] = useState([]);
    const [selectedElection, setSelectedElection] = useState(null);
    const [manualAddress, setManualAddress] = useState('');

    useEffect(() => {
        fetchElections();
    }, []);

    const fetchElections = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/election');
            setElections(res.data.elections);
            if (res.data.elections && res.data.elections.length > 0) {
                setSelectedElection(res.data.elections[0]);
            }
        } catch (err) {
            console.error("Failed to fetch elections");
        }
    };

    const verify = async () => {
        if (!txHash) return alert("Enter a Tx Hash");

        try {
            if (window.ethereum) {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const tx = await provider.getTransaction(txHash);
                if (tx) {
                    alert(`Transaction Found!\nBlock: ${tx.blockNumber}\nFrom: ${tx.from}\nValue: ${ethers.formatEther(tx.value)} ETH`);
                } else {
                    alert("Transaction not found (or not mined yet).");
                }
            } else {
                // Fallback for non-web3 browsers
                const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
                const tx = await provider.getTransaction(txHash);
                if (tx) {
                    alert(`Transaction Found!\nBlock: ${tx.blockNumber}\nFrom: ${tx.from}\nValue: ${ethers.formatEther(tx.value)} ETH`);
                } else {
                    alert("Transaction not found (or not mined yet).");
                }
            }
        } catch (err) {
            console.error(err);
            alert("Error fetching transaction. Ensure you are connected to the correct network.");
        }
    };

    const checkMyVote = async () => {
        if (!selectedElection) return alert("Select an election first");

        let addressToCheck = manualAddress;

        if (!addressToCheck) {
            if (!window.ethereum) return alert("Enter an address or Install MetaMask");
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                addressToCheck = await signer.getAddress();
            } catch (e) {
                return alert("Failed to get address from MetaMask");
            }
        }

        // Check if input is a Private Key (Passkey)
        // Private key is usually 66 chars (0x + 64 hex) or 64 chars
        if (addressToCheck.length >= 64) {
            try {
                // Try to create a wallet from it to derive address
                const wallet = new ethers.Wallet(addressToCheck);
                addressToCheck = wallet.address;
                // alert(`Derived Address from Passkey: ${addressToCheck}`);
            } catch (e) {
                // Not a valid private key, proceed to check if it's an address
            }
        }

        if (!ethers.isAddress(addressToCheck)) {
            return alert("Invalid format. Please enter a valid Ethereum Address or Passkey.");
        }

        try {
            // Use a read-only provider if just checking status
            const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
            const contract = new ethers.Contract(selectedElection.address, ELECTION_ABI, provider);

            // Check voting status
            const hasVoted = await contract.hasVoted(addressToCheck);

            if (hasVoted) {
                setStatus(`✅ Address ${addressToCheck.slice(0, 6)}... has successfully voted!`);
            } else {
                setStatus(`❌ Address ${addressToCheck.slice(0, 6)}... has not voted yet.`);
            }
        } catch (err) {
            console.error(err);
            setStatus("Error checking status. Ensure you are connected to the correct network.");
        }
    };

    return (
        <div className="container mx-auto p-8 text-center">
            <h1 className="text-3xl font-bold mb-8">Verify Vote</h1>

            <div className="max-w-md mx-auto mb-8">
                <label className="block text-left mb-2 font-bold">Select Election</label>
                <select
                    className="w-full p-2 border rounded dark:bg-gray-700"
                    value={selectedElection ? selectedElection.id : ''}
                    onChange={(e) => {
                        const found = elections.find(el => el.id == e.target.value);
                        setSelectedElection(found);
                        setStatus('');
                    }}
                >
                    {elections.map(e => (
                        <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                </select>
            </div>

            <div className="max-w-md mx-auto bg-white dark:bg-gray-800 p-6 rounded shadow mb-8">
                <h2 className="text-xl font-bold mb-4">Check Transaction</h2>
                <input
                    type="text"
                    className="w-full p-2 border rounded mb-4 dark:bg-gray-700"
                    placeholder="Enter Transaction Hash"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                />
                <button onClick={verify} className="w-full bg-indigo-600 text-white p-2 rounded">
                    Verify Transaction
                </button>
            </div>

            <div className="max-w-md mx-auto bg-white dark:bg-gray-800 p-6 rounded shadow">
                <h2 className="text-xl font-bold mb-4">Check My Status</h2>
                <p className="text-sm text-gray-500 mb-4">Enter your <b>Voter Address</b> OR your <b>Passkey</b> (Private Key).</p>
                <input
                    type="text"
                    className="w-full p-2 border rounded mb-4 dark:bg-gray-700"
                    placeholder="Enter Address (0x...) or Passkey"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                />
                <button onClick={checkMyVote} className="w-full bg-green-600 text-white p-2 rounded mb-4">
                    Check Vote Status
                </button>
                {status && (
                    <div className={`mt-4 p-4 rounded ${status.includes('✅') ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                        <h3 className="font-bold text-lg">{status.includes('✅') ? 'Vote Verified' : 'Verification Failed'}</h3>
                        <p>{status}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Verify;
