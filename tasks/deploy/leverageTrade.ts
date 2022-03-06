import { task } from "hardhat/config";

import { LeverageTrade__factory, MockToken } from "../../typechain";
import { saveContractAddress } from "./utils";

const ETH_USD_PRICE_FEED = "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e";

task("deploy-leverage-trade")
  .addParam("tokenA", "Token A address")
  .addParam("tokenB", "Token B address")
  .setAction(async (taskArgs, { ethers, run }) => {
    const signers = await ethers.getSigners();

    const leverageTrade = await new LeverageTrade__factory(signers[0]).deploy(
      taskArgs.tokenA,
      taskArgs.tokenB,
      ETH_USD_PRICE_FEED
    );

    console.log(`LeverageTrade deployed to ${leverageTrade.address}`);

    const network = await ethers.getDefaultProvider().getNetwork();

    saveContractAddress(
      network.chainId,
      "LeverageTrade",
      leverageTrade.address
    );

    await run("add-liquidity", {
      amount: "5000",
      assetA: taskArgs.tokenA,
      assetB: taskArgs.tokenB,
      client: leverageTrade.address,
    });
  });
