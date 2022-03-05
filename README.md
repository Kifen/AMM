
# AMM

AMM is comprisedd of two smart contracts AMMExchange and LeverageTrade. This project uses the hardhat framework for contract development and deployment. 

### AMMExchange
The AMMExchange contract defines an exchange supporting the swapping of ERC20 tokens (TWD and USD).

#### Core Functions
- addLiquidity: adds liquidity to the pool
- exchange: exchange an asset for another. When passing `path` as an argument to this function, the fist index is the input token and the second (last) index is the output token.

### LeverageTrade
The LeverageTrade contract is an implementation of a Leverage AMM exchange. It supports depositing any ERC20 token as collateral and the leverage trading of and ERC20 token and Ethereum.

#### Core Functions
- depositToken: deposit collateral to the system. Ensure allowance has been set for the contract.
- getRemAccountValue: retrives the remaining account value for a pool
- openLongPosition: opens a leveraged position; buys ETH
- openShortPosition: opens a leveraged position; sells ETH


### Build and Run
```
$ git clone git@github.com:Kifen/AMM.git
$ cd AMM
$ npm install
```
To run test, `npx hardhat test`
