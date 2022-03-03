import { expect } from "chai";
import { ethers } from "hardhat";
import { Provider } from "@ethersproject/abstract-provider";
import {
  AMMExchange,
  AMMExchange__factory,
  MockToken,
  MockToken__factory,
} from "../typechain";
import { BigNumber, Contract, Signer } from "ethers";
import { toBN, getOutputAmount } from "./utils";
import {
  getEventData,
  EXCHANGE_EVENT,
  ADD_LIQUIDITY_EVENT,
  UPDATE_RESERVES_EVENT,
} from "./eventdecoder";

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

    const tx = await ammExchange.connect(signer).exchange(toBN(amount), path); // Exchange assets
    const txReceipt = await tx.wait();

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
      txReceipt,
    };
  };

  describe("Exchange", () => {
    it("exchange USD <=> TWD and TWD <=> USD", async () => {
      // Exchange USD <=> TWD
      let signer = alice;
      let amount = 450;
      let path = [USD.address, TWD.address];

      await approve(ammExchange.address, amount, USD, signer);
      let reserves = await ammExchange.getReserves();
      let amountOutBN = await getOutputAmount(
        toBN(amount),
        reserves.rt,
        reserves.ru
      );
      amountOutBN = amountOutBN.abs();

      let {
        ammExchangeInitialTWDBalance,
        ammExchangeInitialUSDBalance,
        ammExchangeFinalTWDBalance,
        ammExchangeFinalUSDBalance,
        signerInitiatialTWDBalance,
        signerInitiatialUSDBalance,
        signerFinalTWDBalance,
        signerFinalUSDBalance,
        txReceipt,
      } = await exchange(path, amount, signer);

      const exchangeDecodedEvent = await getEventData(
        txReceipt,
        EXCHANGE_EVENT
      );
      const updateReservesDecodedEvent = await getEventData(
        txReceipt,
        UPDATE_RESERVES_EVENT
      );

      console.log(exchangeDecodedEvent, updateReservesDecodedEvent);

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

      // Exchange TWD <=> USD using updated reserves
      signer = bob;
      amount = 6000;
      path = [TWD.address, USD.address];

      await approve(ammExchange.address, amount, TWD, signer);

      reserves = await ammExchange.getReserves();

      amountOutBN = await getOutputAmount(
        toBN(amount),
        reserves.rt,
        reserves.ru
      );
      amountOutBN = amountOutBN.abs();

      let {
        ammExchangeInitialTWDBalance: ammExchangeInitialTWDBalance_2,
        ammExchangeInitialUSDBalance: ammExchangeInitialUSDBalance_2,
        ammExchangeFinalTWDBalance: ammExchangeFinalTWDBalance_2,
        ammExchangeFinalUSDBalance: ammExchangeFinalUSDBalance_2,
        signerInitiatialTWDBalance: signerInitiatialTWDBalance_2,
        signerInitiatialUSDBalance: signerInitiatialUSDBalance_2,
        signerFinalTWDBalance: signerFinalTWDBalance_2,
        signerFinalUSDBalance: signerFinalUSDBalance_2,
        txReceipt: txReceipt_2,
      } = await exchange(path, amount, signer);

      expect(signerFinalTWDBalance_2).to.equal(
        signerInitiatialTWDBalance_2.sub(toBN(amount))
      );

      expect(signerFinalUSDBalance_2).to.equal(
        signerInitiatialUSDBalance_2.add(amountOutBN)
      );

      expect(ammExchangeFinalTWDBalance_2).to.equal(
        ammExchangeInitialTWDBalance_2.add(toBN(amount))
      );

      expect(ammExchangeFinalUSDBalance_2).to.equal(
        ammExchangeInitialUSDBalance_2.sub(amountOutBN)
      );
    });
  });
});
