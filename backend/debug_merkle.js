const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const ethers = require('ethers');

const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const buffer = Buffer.from(address.replace(/^0x/, ''), 'hex');

console.log("--- Debugging Hashing ---");
console.log("Address:", address);
console.log("Buffer Hex:", buffer.toString('hex'));

// 1. Ethers Solidity Packed
const solidityHash = ethers.solidityPackedKeccak256(["address"], [address]);
console.log("Ethers SolidityPacked:", solidityHash);

// 2. Ethers Keccak256 (on Bytes)
const ethersHash = ethers.keccak256(buffer);
console.log("Ethers Keccak256:      ", ethersHash);

// 3. Keccak256 Library
const libHashBuffer = keccak256(buffer);
const libHash = '0x' + libHashBuffer.toString('hex');
console.log("Keccak256 Lib:         ", libHash);

if (solidityHash === libHash) {
    console.log("✅ MATCH");
} else {
    console.log("❌ MISMATCH");
}
