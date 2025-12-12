import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ethers } from 'ethers';
import { ELECTION_ABI } from '../contractConfig';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function Home() {
    const [elections, setElections] = useState([]);

    useEffect(() => {
        fetchElections();
    }, []);

    const fetchElections = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/election');
            let loadedElections = res.data.elections;

            // Fetch live vote counts from blockchain
            if (window.ethereum && loadedElections.length > 0) {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const updatedElections = await Promise.all(loadedElections.map(async (election) => {
                    try {
                        const contract = new ethers.Contract(election.address, ELECTION_ABI, provider);
                        const candidateCount = await contract.candidateCount();
                        const candidates = [];

                        for (let i = 1; i <= candidateCount; i++) {
                            const c = await contract.candidates(i);
                            // Match with backend candidate to get photoUrl
                            const backendCandidate = election.candidates.find(bc => bc.id === Number(c.id)) || {};
                            candidates.push({
                                id: Number(c.id),
                                name: c.name,
                                voteCount: Number(c.voteCount),
                                photoUrl: backendCandidate.photoUrl || ''
                            });
                        }
                        return { ...election, candidates };
                    } catch (e) {
                        console.error(`Failed to fetch data for ${election.id}`, e);
                        return election;
                    }
                }));
                setElections(updatedElections);
            } else {
                setElections(loadedElections);
            }
        } catch (err) {
            console.error("Failed to fetch elections", err);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <main className="text-center">
                <h2 className="text-4xl font-extrabold mb-4">Blockchain-Powered Voting</h2>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">Secure, Transparent, and Verifiable.</p>

                {/* Live Results Section */}
                <div className="mb-16">
                    <h3 className="text-3xl font-bold mb-8">Live Election Results</h3>
                    {elections.length === 0 ? (
                        <p>No active elections.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {elections.map(election => (
                                <div key={election.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                                    <h4 className="text-2xl font-bold mb-4">{election.title}</h4>

                                    {election.candidates && election.candidates.length > 0 ? (
                                        <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
                                            {/* Bar Chart */}
                                            <div className="flex flex-col items-center">
                                                <h5 className="text-lg font-semibold mb-2">Vote Count</h5>
                                                <BarChart width={350} height={300} data={election.candidates}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" />
                                                    <YAxis allowDecimals={false} />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="voteCount" name="Votes">
                                                        {election.candidates.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </div>

                                            {/* Pie Chart */}
                                            <div className="flex flex-col items-center">
                                                <h5 className="text-lg font-semibold mb-2">Distribution</h5>
                                                <PieChart width={350} height={300}>
                                                    <Pie
                                                        data={election.candidates}
                                                        cx="50%"
                                                        cy="50%"
                                                        labelLine={false}
                                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                        outerRadius={100}
                                                        fill="#8884d8"
                                                        dataKey="voteCount"
                                                    >
                                                        {election.candidates.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No candidates yet.</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                        <h3 className="text-2xl font-bold mb-2">For Voters</h3>
                        <p className="mb-4">Register securely and cast your vote with privacy guaranteed.</p>
                        <Link to="/vote" className="text-indigo-600 hover:underline">Go to Voting Booth &rarr;</Link>
                    </div>
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                        <h3 className="text-2xl font-bold mb-2">Verify Vote</h3>
                        <p className="mb-4">Scan your QR code to verify your vote on the blockchain.</p>
                        <Link to="/verify" className="text-indigo-600 hover:underline">Verify Now &rarr;</Link>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Home;
