import { expect } from "chai";
import { ethers } from "hardhat";
import {
  AMMExchange,
  AMMExchange__factory,
  MockToken,
  MockToken__factory,
} from "../typechain";
import { BigNumber, Contract, Signer } from "ethers";
import { toBN, getOutputAmount } from "./utils";

describe("AMMExchange", () => {
  let admin: Signer;
  let alice: Signer;
  let bob: Signer;

  let adminAddress: string;
  let aliceAddress: string;
  let bobAddress: string;

  let ammExchange: AMMExchange;
  let TWD: MockToken;
  let USD: MockToken;

  beforeEach(async () => {
    [admin, alice, bob] = await ethers.getSigners();
    adminAddress = await admin.getAddress();
    aliceAddress = await alice.getAddress();
    bobAddress = await bob.getAddress();

    // Deploy mock TWD and USD
    TWD = await deployMockTokens("TWD Token", "TWD");
    USD = await deployMockTokens("USD Token", "USD");

    // Deploy AMMExchange
    ammExchange = await new AMMExchange__factory(admin).deploy(
      TWD.address,
      USD.address
    );

    const amountA = 50000;
    const amountB = 37500;

    const accounts = [aliceAddress, bobAddress];
    await batchMint(accounts, amountA, TWD);
    await batchMint(accounts, amountB, USD);

    await addLiquidity(amountA, amountB);

    // test if liquidity was added successfully
    expect(await balanceOf(ammExchange.address, TWD)).to.equal(toBN(amountA));
    expect(await balanceOf(ammExchange.address, USD)).to.equal(toBN(amountB));
  });

  const deployMockTokens = async (name: string, symbol: string) => {
    // return await new MockToken__factory(admin).deploy(name, symbol);
    return await new MockToken__factory(admin).deploy(name, symbol);
  };

  const batchMint = async (
    accounts: string[],
    amount: number,
    token: Contract
  ) => {
    await Promise.all(
      accounts.map(async (account) => {
        token.mint(account, toBN(amount));
      })
    );
  };

  const balanceOf = async (
    account: string,
    token: Contract
  ): Promise<BigNumber> => {
    return await token.balanceOf(account);
  };

  const approve = async (
    spender: string,
    amount: number,
    token: Contract,
    signer = admin
  ) => {
    await token.connect(signer).approve(spender, toBN(amount));
  };

  const addLiquidity = async (amountA: number, amountB: number) => {
    const amountABN = toBN(amountA);
    const amountBBN = toBN(amountB);

    // set approvals
    await approve(ammExchange.address, amountA, TWD);
    await approve(ammExchange.address, amountB, USD);

    // add liquidity to AMMExchange
    await ammExchange.addLiquidity(amountABN, amountBBN);
  };

  const exchange = async (path: string[], amount: number, signer: Signer) => {
    const signerAddress = await signer.getAddress();
    const ammExchangeInitialTWDBalance = await balanceOf(
      ammExchange.address,
      TWD
    );
    const ammExchangeInitialUSDBalance = await balanceOf(
      ammExchange.address,
      USD
    );

    const signerInitiatialTWDBalance = await balanceOf(signerAddress, TWD);
    const signerInitiatialUSDBalance = await balanceOf(signerAddress, USD);

    await ammExchange.connect(signer).exchange(toBN(amount), path); // Exchange assets

    const ammExchangeFinalTWDBalance = await balanceOf(
      ammExchange.address,
      TWD
    );
    const ammExchangeFinalUSDBalance = await balanceOf(
      ammExchange.address,
      USD
    );

    const signerFinalTWDBalance = await balanceOf(signerAddress, TWD);
    const signerFinalUSDBalance = await balanceOf(signerAddress, USD);

    return {
      ammExchangeInitialTWDBalance,
      ammExchangeInitialUSDBalance,
      ammExchangeFinalTWDBalance,
      ammExchangeFinalUSDBalance,
      signerInitiatialTWDBalance,
      signerInitiatialUSDBalance,
      signerFinalTWDBalance,
      signerFinalUSDBalance,
    };
  };

  describe("Exchange", () => {
    it("should exchange USD for TWD", async () => {
      const signer = alice;
      const amount = 450;
      const path = [USD.address, TWD.address];

      await approve(ammExchange.address, amount, USD, signer);
      const reserves = await ammExchange.getReserves();
      let amountOutBN = await getOutputAmount(
        toBN(amount),
        reserves.rt,
        reserves.ru
      );
      amountOutBN = amountOutBN.abs();

      const {
        ammExchangeInitialTWDBalance,
        ammExchangeInitialUSDBalance,
        ammExchangeFinalTWDBalance,
        ammExchangeFinalUSDBalance,
        signerInitiatialTWDBalance,
        signerInitiatialUSDBalance,
        signerFinalTWDBalance,
        signerFinalUSDBalance,
      } = await exchange(path, amount, signer);

      expect(signerFinalTWDBalance).to.equal(
        signerInitiatialTWDBalance.add(amountOutBN)
      );

      expect(signerFinalUSDBalance).to.equal(
        signerInitiatialUSDBalance.sub(toBN(amount))
      );

      expect(ammExchangeFinalTWDBalance).to.equal(
        ammExchangeInitialTWDBalance.sub(amountOutBN)
      );

      expect(ammExchangeFinalUSDBalance).to.equal(
        ammExchangeInitialUSDBalance.add(toBN(amount))
      );
    });

    it("should exchange TWD for USD", async () => {
      const signer = bob;
      const amount = 6000;
      const path = [TWD.address, USD.address];

      await approve(ammExchange.address, amount, TWD, signer);
      const reserves = await ammExchange.getReserves();
      let amountOutBN = await getOutputAmount(
        toBN(amount),
        reserves.rt,
        reserves.ru
      );
      amountOutBN = amountOutBN.abs();

      const {
        ammExchangeInitialTWDBalance,
        ammExchangeInitialUSDBalance,
        ammExchangeFinalTWDBalance,
        ammExchangeFinalUSDBalance,
        signerInitiatialTWDBalance,
        signerInitiatialUSDBalance,
        signerFinalTWDBalance,
        signerFinalUSDBalance,
      } = await exchange(path, amount, signer);

      expect(signerFinalTWDBalance).to.equal(
        signerInitiatialTWDBalance.sub(toBN(amount))
      );

      expect(signerFinalUSDBalance).to.equal(
        signerInitiatialUSDBalance.add(amountOutBN)
      );

      expect(ammExchangeFinalTWDBalance).to.equal(
        ammExchangeInitialTWDBalance.add(toBN(amount))
      );

      expect(ammExchangeFinalUSDBalance).to.equal(
        ammExchangeInitialUSDBalance.sub(amountOutBN)
      );
    });
  });
});
