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
import {
  toBN,
  getOutputAmount,
  getEventData,
  EXCHANGE_EVENT,
  ADD_LIQUIDITY_EVENT,
  UPDATE_RESERVES_EVENT,
} from "./helpers";

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

  const decimals = ethers.BigNumber.from(10).pow(18);

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

    const signerInitialTWDBalance = await balanceOf(signerAddress, TWD);
    const signerInitialUSDBalance = await balanceOf(signerAddress, USD);

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
      signerInitialTWDBalance,
      signerInitialUSDBalance,
      signerFinalTWDBalance,
      signerFinalUSDBalance,
      txReceipt,
    };
  };

  describe("Exchange", () => {
    it("exchange USD <=> TWD and TWD <=> USD", async () => {
      // Exchange USD <=> TWD
      let signer = alice;
      let signerAddress = aliceAddress;
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
        signerInitialTWDBalance,
        signerInitialUSDBalance,
        signerFinalTWDBalance,
        signerFinalUSDBalance,
        txReceipt,
      } = await exchange(path, amount, signer);

      let exchangeDecodedEvent = await getEventData(txReceipt, EXCHANGE_EVENT);
      let updateReservesDecodedEvent = await getEventData(
        txReceipt,
        UPDATE_RESERVES_EVENT
      );

      expect(signerFinalTWDBalance).to.equal(
        signerInitialTWDBalance.add(amountOutBN)
      );

      expect(signerFinalUSDBalance).to.equal(
        signerInitialUSDBalance.sub(toBN(amount))
      );

      expect(ammExchangeFinalTWDBalance).to.equal(
        ammExchangeInitialTWDBalance.sub(amountOutBN)
      );

      expect(ammExchangeFinalUSDBalance).to.equal(
        ammExchangeInitialUSDBalance.add(toBN(amount))
      );

      // test emitted 'Exchange'
      expect(exchangeDecodedEvent.sender).to.equal(signerAddress);
      expect(exchangeDecodedEvent.tradedToken).to.equal(USD.address);
      expect(exchangeDecodedEvent.tradedAmount).to.equal(toBN(amount));

      // test emitted 'UpdateReserves'
      expect(updateReservesDecodedEvent.oldRu).to.equal(reserves.ru);
      expect(updateReservesDecodedEvent.newRu).to.equal(
        reserves.ru.add(toBN(amount))
      );
      expect(updateReservesDecodedEvent.oldRt).to.equal(reserves.rt);
      expect(updateReservesDecodedEvent.newRt).to.equal(
        reserves.rt.sub(amountOutBN)
      );

      // Exchange TWD <=> USD using updated reserves
      signer = bob;
      signerAddress = bobAddress;
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
        signerInitialTWDBalance: signerInitiatialTWDBalance_2,
        signerInitialUSDBalance: signerInitiatialUSDBalance_2,
        signerFinalTWDBalance: signerFinalTWDBalance_2,
        signerFinalUSDBalance: signerFinalUSDBalance_2,
        txReceipt: txReceipt_2,
      } = await exchange(path, 6000, signer);

      exchangeDecodedEvent = await getEventData(txReceipt_2, EXCHANGE_EVENT);
      updateReservesDecodedEvent = await getEventData(
        txReceipt_2,
        UPDATE_RESERVES_EVENT
      );

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

      // test emitted 'Exchange'
      expect(exchangeDecodedEvent.sender).to.equal(signerAddress);
      expect(exchangeDecodedEvent.tradedToken).to.equal(TWD.address);
      expect(exchangeDecodedEvent.tradedAmount).to.equal(toBN(amount));

      // test emitted 'UpdateReserves'
      expect(updateReservesDecodedEvent.oldRu).to.equal(reserves.ru);
      expect(updateReservesDecodedEvent.newRu).to.equal(
        reserves.ru.sub(amountOutBN)
      );
      expect(updateReservesDecodedEvent.oldRt).to.equal(reserves.rt);
      expect(updateReservesDecodedEvent.newRt).to.equal(
        reserves.rt.add(toBN(amount))
      );
    });

    it("fails if sender sets insufficient allowance for input token", async () => {
      const signer = bob;
      const amount = 3000;
      const path = [TWD.address, USD.address];

      await expect(exchange(path, amount, signer)).to.be.revertedWith(
        "AMMExchange: insufficient inputToken allowance"
      );
    });

    it("fails if sender has insufficient input token balance", async () => {
      const signer = bob;
      const signerAddress = bobAddress;
      const inputToken = TWD.address;
      const outputToken = USD.address;

      const amountBN = await balanceOf(signerAddress, TWD);
      const amount = Number(amountBN.add(toBN(250)).div(decimals));
      const path = [inputToken, outputToken];

      await approve(ammExchange.address, amount, TWD, signer);

      await expect(exchange(path, amount, signer)).to.be.revertedWith(
        "AMMExchange: insufficient inputToken balance"
      );
    });

    it("should fail to send output amount if exchange has insufficient output token balance", async () => {
      const signer = bob;
      const inputToken = USD.address;
      const outputToken = TWD.address;
      const path = [inputToken, outputToken];
      const amount = 2500;

      const amountBN = await balanceOf(ammExchange.address, TWD);
      await TWD.burn(ammExchange.address, amountBN); // reduce exchange USD token balance

      await approve(ammExchange.address, amount, USD, signer);

      await expect(exchange(path, amount, signer)).to.be.revertedWith(
        "AMMExchange: insufficient onputToken balance"
      );
    });

    it("fails if path length is not equal 2", async () => {
      const signer = bob;
      const inputToken = USD.address;
      const outputToken = TWD.address;
      const path = [inputToken];
      const amount = 5099;

      const amountBN = await balanceOf(ammExchange.address, TWD);
      await TWD.burn(ammExchange.address, amountBN); // reduce exchange USD token balance

      await approve(ammExchange.address, amount, USD, signer);

      await expect(exchange(path, amount, signer)).to.be.revertedWith(
        "AMMExchange: invalid path"
      );
    });

    it("fails if input or output token is ZERO address", async () => {
      const signer = bob;
      const inputToken = USD.address;
      const outputToken = TWD.address;
      const path = [inputToken, "0x0000000000000000000000000000000000000000"];
      const amount = 2500;

      const amountBN = await balanceOf(ammExchange.address, TWD);
      await TWD.burn(ammExchange.address, amountBN); // reduce exchange USD token balance

      await approve(ammExchange.address, amount, USD, signer);

      await expect(exchange(path, amount, signer)).to.be.revertedWith(
        "AMMExchange: invalid path"
      );
    });

    it("fails if input or output token is an incorrect address", async () => {
      const signer = bob;
      const inputToken = USD.address;
      const outputToken = TWD.address;
      const path = ["0xdd2fd4581271e230360230f9337d5c0430bf44c0", outputToken];
      const amount = 120;

      const amountBN = await balanceOf(ammExchange.address, TWD);
      await TWD.burn(ammExchange.address, amountBN); // reduce exchange USD token balance

      await approve(ammExchange.address, amount, USD, signer);

      await expect(exchange(path, amount, signer)).to.be.revertedWith(
        "AMMExchange: invalid path"
      );
    });
  });
});
