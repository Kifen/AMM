
# AMM

AMM is comprised of two smart contracts AMMExchange and LeverageTrade. This project uses the hardhat framework for contract development and deployment. 

### AMMExchange
The AMMExchange contract defines an exchange supporting the swapping of ERC20 tokens (TWD and USD).

#### Core Functions
- addLiquidity: adds liquidity to the pool
- exchange: exchange an asset for another. When passing `path` as an argument to this function, the fist index is the input token and the second (last) index is the output token.

### LeverageTrade
The LeverageTrade contract is an implementation of a Leverage AMM exchange. It supports depositing any ERC20 token as collateral and the leverage trading of any ERC20 token and Ethereum.

#### Core Functions
- depositToken: deposit collateral to the system. Ensure allowance has been set for the contract.
- getRemAccountValue: retrives the remaining account value for a pool
- openLongPosition: opens a leveraged position; buys ETH
- openShortPosition: opens a leveraged position; sells ETH

# Deployments
- LeverageTrade: 0x629DF2aDDd186C7B867b4E1Ee0D3634717Af6993
- AMMExchnage: 0x1195E923B547D2D0f2F61ddd698D5265795dA1fc
- USD Coin: 0xD87820A96043011c5442141ddb8a1607561dB922
- TWD Token: 0x0961B4224702Bf9c0931c94d1Ba79Eb472934aD6


### Build and Run
```
$ git clone git@github.com:Kifen/AMM.git
$ cd AMM
$ npm install
```
To run test, `npm run test`
