import { task } from "hardhat/config";

import { MockToken__factory } from "../../typechain";
import { saveContractAddress } from "./utils";

task("deploy-erc20-token")
  .addParam("name", " Token name")
  .addParam("symbol", "Token symbol")
  .setAction(async (taskArgs, { ethers }) => {
    const signers = await ethers.getSigners();

    console.log(`Deploying token ${taskArgs.name}`);

    const mockToken = await new MockToken__factory(signers[0]).deploy(
      taskArgs.name,
      taskArgs.symbol
    );
    console.log(`Token ${taskArgs.name} deployed to ${mockToken.address}`);

    const network = await ethers.getDefaultProvider().getNetwork();
    saveContractAddress(network.chainId, taskArgs.name, mockToken.address);
    return mockToken;
  });
