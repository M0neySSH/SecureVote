import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
    useEffect(() => {
        // Force Dark Mode
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }, []);

    return (
        <nav className="bg-white dark:bg-gray-800 shadow p-4 mb-8">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">SecureVote</Link>
                <div className="flex items-center gap-6">
                    <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600">Home</Link>
                    <Link to="/guide" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600">Guide</Link>
                    <Link to="/vote" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600">Vote</Link>
                    <Link to="/verify" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600">Verify</Link>
                    <Link to="/login" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600">Admin</Link>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
