// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.34;

// You can store ETH in this contract and redeem them.
contract Vault {
    mapping(address => uint) public balances;

    /// @dev Store ETH in the contract.
    function store() public payable {
        balances[msg.sender]+=msg.value;
    }
    
    /// @dev Redeem your ETH.
    // @Deprecated This function is vulnerable to reentrancy attacks. Use redeem instead.
    function redeem_hacked() public {
        msg.sender.call{ value: balances[msg.sender] }("");
        balances[msg.sender]=0;
    }
    
    /// @dev Redeem your ETH.
    function redeem() public {
        uint currentBalance = balances[msg.sender];
        balances[msg.sender]=0;
        msg.sender.call{ value: currentBalance }("");
    }
}