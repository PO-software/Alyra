// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

contract Counter {
  uint public x;

  function getX() public view returns (uint) {
    return x;
  }

  event Increment(uint by);

  function inc() public {
    require(x < 10, "too high");
    x++;
    emit Increment(1);
  }

  function incBy(uint by) public {
    require(by > 0, "incBy: increment should be positive");
    x += by;
    emit Increment(by);
  }
}
