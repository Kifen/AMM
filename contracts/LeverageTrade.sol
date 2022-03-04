//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {AMMExchange} from "./Exchange.sol";

contract LeverageTrade is AMMExchange {
    uint256 public constant MAX_POS = 10;

    struct Leverage {
        uint256 locked;
        uint64 postion; // Pack struct into 2 slots.
        address asset;
    }

    mapping(address => Leverage[]) private positions;

    constructor(IERC20 twd, IERC20 usd) AMMExchange(twd, usd) {}

    function depositToken(IERC20 _token, uint256 _amount) external {

    }
}
