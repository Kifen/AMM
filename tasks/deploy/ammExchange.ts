import { task } from "hardhat/config";

import { AMMExchange__factory, MockToken } from "../../typechain";
import { saveContractAddress } from "./utils";

task("deploy-amm-exchange")
  .addParam("tokenA", "Token A address")
  .addParam("tokenB", "Token B address")
  .setAction(async (taskArgs, { ethers, run }) => {
    const signers = await ethers.getSigners();

    const ammExchnage = await new AMMExchange__factory(signers[0]).deploy(
      taskArgs.tokenA,
      taskArgs.tokenB
    );

    console.log(`AMMExchnage deployed to ${ammExchnage.address}`);

    const network = await ethers.getDefaultProvider().getNetwork();

    saveContractAddress(network.chainId, "AMMExchnage", ammExchnage.address);

    await run("add-liquidity", {
      amount: "5000",
      assetA: taskArgs.tokenA,
      assetB: taskArgs.tokenB,
      client:  ammExchnage.address
    });
  });
