//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import {AMMExchange} from "./Exchange.sol";

contract LeverageTrade is AMMExchange {
    uint64 public constant MAX_LEVERAGE = 10;
    AggregatorV3Interface internal eth_usd_price_feed;

    struct Account {
        uint256 collateral;
        uint64 totalLeverage;
        // Long[] longPositions;
        // Short[] shortPositions;
        bool enabled;
    }

    struct Long {
        uint256 ethAmount;
    }

    struct Short {
        uint256 tokenAmount;
        IERC20 token;
    }

    enum SIDE {
        LONG,
        SHORT
    }

    mapping(address => mapping(IERC20 => Account)) private accounts;

    event DepositToken(
        address indexed account,
        address indexed token,
        uint256 indexed amount
    );

    event OpenPosition(
        address indexed account,
        uint64 indexed leverage,
        uint256 indexed amount,
        uint256 side
    );

    constructor(
        IERC20 twd,
        IERC20 usd,
        address ethUsdPriceFeed
    ) AMMExchange(twd, usd) {
        eth_usd_price_feed = AggregatorV3Interface(ethUsdPriceFeed);
    }

    function depositToken(IERC20 _token, uint256 _amount) external {
        _safeTransferFrom(_token, msg.sender, address(this), _amount);
        Account memory account = accounts[msg.sender][_token];

        if (!account.enabled) {
            account = Account(_amount, 0, true);
            accounts[msg.sender][_token] = account;
        } else {
            account.collateral = account.collateral + _amount;
            accounts[msg.sender][_token] = account;
        }

        emit DepositToken(msg.sender, address(_token), _amount);
    }

    function getAmountOut(uint256 _amount, uint256 _leverage)
        external
        pure
        returns (uint256)
    {
        return _amount * _leverage;
    }

    function getAmountOut2(uint256 _amount, uint256 _leverage)
        external
        pure
        returns (uint256)
    {
        return _amount / _leverage;
    }

    function getAccountValue(IERC20 _token) external view returns (uint256) {
        Account memory account = accounts[msg.sender][_token];
        uint256 collateral = account.collateral;
        uint64 maxLeverage = MAX_LEVERAGE;
        uint64 currentLeverage = account.totalLeverage;

        return (collateral * maxLeverage) - (collateral * currentLeverage);
    }

    function openPosition(IERC20 _token, uint64 _leverage) external {
        uint64 maxLeverage = MAX_LEVERAGE;
        require(
            _leverage <= maxLeverage,
            "LeverageTrade: exceeded MAX_LEVERAGE"
        );

        Account memory account = accounts[msg.sender][_token];
        uint64 remLeverage = maxLeverage - account.totalLeverage;
        uint256 collateral = account.collateral;

        require(remLeverage >= _leverage, "LeverageTrade: exceeded leverage");
        require(collateral > 0, "LeverageTrade: insufficient collateral");

        account.totalLeverage = account.totalLeverage + _leverage;
        accounts[msg.sender][_token] = account;

        emit OpenPosition(
            msg.sender,
            _leverage,
            collateral,
            uint256(SIDE.LONG)
        );
    }

    function getEthUsd() public view returns (uint256) {
        (, int256 answer, , , ) = eth_usd_price_feed.latestRoundData();

        return uint256(answer * 10**10); // convert answer from 8 to 18 decimlas
    }
}
