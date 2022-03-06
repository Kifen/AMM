import { task } from "hardhat/config";

import { MockToken__factory, MockToken } from "../../typechain";
import { toBN } from "../deploy/utils";

task("add-liquidity")
  .addParam("amount", "Amount to provide")
  .addParam("assetA", "address ---")
  .addParam("assetB", "address ---")
  .addParam("client", "address ---")
  .setAction(async (taskArgs, { ethers }) => {
    const Token = await ethers.getContractFactory("MockToken");
    const tokenA = await Token.attach(taskArgs.assetA);
    const tokenB = await Token.attach(taskArgs.assetB);

    console.log("Setting approvals...");

    await Promise.all([
      tokenA.approve(taskArgs.client, toBN(Number(taskArgs.amount))),
      tokenB.approve(taskArgs.client, toBN(Number(taskArgs.amount))),
    ]);

    const LeverageTrade = await ethers.getContractFactory("LeverageTrade");
    const leverageTrade = await LeverageTrade.attach(taskArgs.client);

    console.log("Adding liquidity...");
    await leverageTrade.addLiquidity(
      toBN(taskArgs.amount),
      toBN(taskArgs.amount)
    );
    console.log("Balance Token A:", await tokenA.balanceOf(taskArgs.client));
    console.log(
      "Balance Token B:",
      await tokenB.balanceOf(taskArgs.client),
      toBN(taskArgs.amount)
    );
  });
