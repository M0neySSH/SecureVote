const fs = require('fs');
const path = require('path');

const FACTORY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const factoryArtifact = JSON.parse(fs.readFileSync('d:/voting2.0/contracts/artifacts/contracts/ElectionFactory.sol/ElectionFactory.json', 'utf8'));
const electionArtifact = JSON.parse(fs.readFileSync('d:/voting2.0/contracts/artifacts/contracts/Election.sol/Election.json', 'utf8'));

const content = `export const FACTORY_ADDRESS = "${FACTORY_ADDRESS}";
export const FACTORY_ABI = ${JSON.stringify(factoryArtifact.abi, null, 4)};
export const ELECTION_ABI = ${JSON.stringify(electionArtifact.abi, null, 4)};
`;

fs.writeFileSync('d:/voting2.0/frontend/src/contractConfig.js', content);
console.log("Updated contractConfig.js");
