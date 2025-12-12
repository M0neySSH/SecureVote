// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Election.sol";

contract ElectionFactory {
    event ElectionCreated(address electionAddress, string title);

    address[] public deployedElections;

    function createElection(string memory _title) external {
        Election newElection = new Election(msg.sender, _title);
        deployedElections.push(address(newElection));
        emit ElectionCreated(address(newElection), _title);
    }

    function getDeployedElections() external view returns (address[] memory) {
        return deployedElections;
    }
}
