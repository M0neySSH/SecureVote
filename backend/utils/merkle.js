const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

function generateMerkleTree(addresses) {
    const leaves = addresses.map(addr => keccak256(Buffer.from(addr.replace(/^0x/, ''), 'hex')));
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    return {
        root: tree.getHexRoot(),
        tree: tree
    };
}

function getProof(tree, address) {
    const leaf = keccak256(Buffer.from(address.replace(/^0x/, ''), 'hex'));
    return tree.getHexProof(leaf);
}

module.exports = { generateMerkleTree, getProof };
