//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AMMExchange {
    IERC20 immutable TWD;
    IERC20 immutable USD;

    uint256 public Rt; // TWD reserve
    uint256 public Ru; // USD reserve

    event AddLiquidity(
        address indexed LP,
        uint256 indexed twd,
        uint256 indexed usd
    );

    event Exchange(
        address indexed sender,
        IERC20 indexed tradedToken,
        uint256 indexed tradedAmount
    );

    event UpdateReserves(
        uint256 oldRu,
        uint256 newRu,
        uint256 oldRt,
        uint256 newRt
    );

    constructor(IERC20 _twd, IERC20 _usd) {
        TWD = _twd;
        USD = _usd;
    }

    function addLiquidity(uint256 _twd, uint256 _usd) external {
        _safeTransferFrom(TWD, msg.sender, address(this), _twd);
        _safeTransferFrom(USD, msg.sender, address(this), _usd);

        _updateReserves(int256(_twd), int256(_usd));

        emit AddLiquidity(msg.sender, _twd, _usd);
    }

    function exchangeTWDForUSD(uint256 amount, IERC20[] memory path) external {
        require(
            path.length == 2 &&
                address(path[0]) != address(0) &&
                address(path[1]) != address(0),
            "AMMExchange: invalid path"
        );

        IERC20 TWD_ = TWD;
        IERC20 USD_ = USD;

        _exchange(path[0], path[1], amount, Rt, Ru);
        emit Exchange(msg.sender, TWD_, amount);
    }

    function _exchange(
        IERC20 inputToken,
        IERC20 outputToken,
        uint256 inputAmount,
        uint256 reserveTWD,
        uint256 reserveUSD
    ) internal {
        require(
            _sufficientAllowance(
                inputToken,
                inputAmount,
                msg.sender,
                address(this)
            ),
            "AMMExchange: insufficient inputToken allowance"
        );

        require(
            _sufficientBalance(inputToken, inputAmount, msg.sender),
            "AMMExchange: insufficient inputToken balance"
        );

        uint256 outputAmount = _getAmountOut(
            inputAmount,
            reserveTWD,
            reserveUSD
        );
        require(
            _sufficientBalance(outputToken, outputAmount, address(this)),
            "AMMExchange: insufficient onputToken balance"
        );

        _safeTransferFrom(inputToken, msg.sender, address(this), inputAmount);
        _safeTransferFrom(outputToken, address(this), msg.sender, outputAmount);
    }

    function _getAmountOut(
        uint256 inputAmount,
        uint256 rt,
        uint256 ru
    ) internal pure returns (uint256 outAmount) {
        outAmount = (((rt * ru) / rt) * inputAmount) - ru;
    }

    function _safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 amount
    ) internal {
        token.transferFrom(from, to, amount);
    }

    function _sufficientAllowance(
        IERC20 token,
        uint256 amount,
        address owner,
        address spender
    ) internal view returns (bool) {
        return token.allowance(owner, spender) >= amount;
    }

    function _sufficientBalance(
        IERC20 token,
        uint256 amount,
        address account
    ) internal view returns (bool) {
        return token.balanceOf(account) >= amount;
    }

    function _updateReserves(int256 rt, int256 ru) internal {
        uint256 oldRu = Ru;
        uint256 oldRt = Rt;

        uint256 newRu = uint256(int256(oldRu) + ru);
        uint256 newRt = uint256(int256(oldRt) + rt);

        Ru = newRu;
        Rt = newRt;

        emit UpdateReserves(oldRu, newRu, newRt, Rt);
    }
}
