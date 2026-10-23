// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.34;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {

    constructor() ERC20("MyToken", "MTK") {
        
    }
}