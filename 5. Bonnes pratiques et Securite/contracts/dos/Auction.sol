// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.34;

//Hackable
// contract Auction {
//     address highestBidder;
//     uint highestBid;

//     function bid() payable public {
//         require(msg.value >= highestBid);

//         if (highestBidder != address(0)) {
//             (bool success, ) = highestBidder.call{value:highestBid}("");
//             require(success); // if this call consistently fails, no one else can bid
//         }

//        highestBidder = msg.sender;
//        highestBid = msg.value;
//     }
// }

contract Auction {
    address highestBidder;
    uint highestBid;

    mapping(address => uint) public pendingReturns;

    function bid() public payable {
        require(msg.value >= highestBid);

        if (highestBidder != address(0))
            pendingReturns[highestBidder] = highestBid;

        highestBidder = msg.sender;
        highestBid = msg.value;
    }

    function withdraw() external {
        uint amount = pendingReturns[msg.sender];
        require(amount > 0, "No funds to withdraw");

        pendingReturns[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
    }
}
