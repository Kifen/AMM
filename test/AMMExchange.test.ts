import { expect } from "chai";
import { ethers } from "hardhat";
import {
  AMMExchange,
  AMMExchange__factory,
  MockToken,
  MockToken__factory,
} from "../typechain";
import { BigNumber, Contract, Signer } from "ethers";
import { toBN } from "./utils";

describe("AMMExchange", () => {
  let admin: Signer;
  let alice: Signer;
  let bob: Signer;

  let ammExchange: AMMExchange;
  let TWD: MockToken;
  let USD: MockToken;

  beforeEach(async () => {
    [admin, alice, bob] = await ethers.getSigners();
    // Deploy mock TWD and USD
    TWD = await deployMockTokens("TWD Token", "TWD");
    USD = await deployMockTokens("USD Token", "USD");

    // Deploy AMMExchange
    ammExchange = await new AMMExchange__factory(admin).deploy(
      TWD.address,
      USD.address
    );

    const amount = 50000;
    await addLiquidity(amount, amount);

    // test if liquidity was added successfully
    expect(await balanceOf(ammExchange.address, TWD)).to.equal(toBN(amount));
    expect(await balanceOf(ammExchange.address, USD)).to.equal(toBN(amount));
  });

  const deployMockTokens = async (name: string, symbol: string) => {
    // return await new MockToken__factory(admin).deploy(name, symbol);
    return await new MockToken__factory(admin).deploy(name, symbol);
  };

  const balanceOf = async (
    account: string,
    token: Contract
  ): Promise<BigNumber> => {
    return await token.balanceOf(account);
  };

  const addLiquidity = async (amountA: number, amountB: number) => {
    const amountABN = toBN(amountA);
    const amountBBN = toBN(amountB);

    // set approvals
    await TWD.approve(ammExchange.address, amountABN);
    await USD.approve(ammExchange.address, amountBBN);

    // add liquidity to AMMExchange
    await ammExchange.addLiquidity(amountABN, amountBBN);
  };
});
