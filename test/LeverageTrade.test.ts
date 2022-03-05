import { expect } from "chai";
import { ethers } from "hardhat";
import random from "random";
import {
  LeverageTrade,
  LeverageTrade__factory,
  MockToken,
  MockToken__factory,
  AggregatorV3Interface,
} from "../typechain";
import { BigNumber, Contract, Signer } from "ethers";
import {
  toBN,
  parseEvents,
  deployMockToken,
  approve,
  mint,
  OPEN_POSITION_EVENT,
  DEPOSIT_TOKEN_EVENT,
} from "./helpers";
import { FakeContract, smock } from "@defi-wonderland/smock";

describe("LeverageTrade", () => {
  let admin: Signer;
  let alice: Signer;
  let bob: Signer;

  let adminAddress: string;
  let aliceAddress: string;
  let bobAddress: string;

  let leverageTrade: LeverageTrade;

  let mockToken: MockToken;
  let mockTWD: MockToken;
  let mockUSD: MockToken;

  const LONG = 0;
  const SHORT = 1;

  let mockPriceOracle: FakeContract<AggregatorV3Interface>;

  beforeEach(async () => {
    [admin, alice, bob] = await ethers.getSigners();
    adminAddress = await admin.getAddress();
    aliceAddress = await alice.getAddress();
    bobAddress = await bob.getAddress();

    mockPriceOracle = await smock.fake<AggregatorV3Interface>(
      "AggregatorV3Interface"
    );

    mockToken = await deployMockToken("Mock Token", "MKT", admin);
    mockTWD = await deployMockToken("TWD Token", "TWD", admin);
    mockUSD = await deployMockToken("USD Token", "USD", admin);

    leverageTrade = await new LeverageTrade__factory(admin).deploy(
      mockTWD.address,
      mockUSD.address,
      mockPriceOracle.address
    );
  });

  const depositToken = async (
    token: string,
    amount: number,
    signer: Signer
  ) => {
    const tx = await leverageTrade
      .connect(signer)
      .depositToken(token, toBN(amount));

    const txReceipt = await tx.wait();
    return { txReceipt };
  };

  const mocklatestRoundData = (
    mockOracle: FakeContract<AggregatorV3Interface>,
    price: number
  ) => {
    // Mock `latestRoundData` retun values
    const roundId = random.int(0, 100);
    const answer = toBN(price, 8);
    const startedAt = random.int(12345, 568858);
    const updatedAt = random.int(12345, 568858);
    const answeredInRound = random.int(0, 1);

    mockOracle.latestRoundData.returns([
      roundId,
      answer,
      startedAt,
      updatedAt,
      answeredInRound,
    ]);
  };

  const getEthAmount = (
    ethPriceUSD: number,
    leverage: number,
    collateral: number
  ): BigNumber => {
    const positionValue = toBN(leverage, 0).mul(toBN(collateral));
    const ethPriceUSDBN = toBN(ethPriceUSD, 18);

    return positionValue.div(ethPriceUSDBN);
  };

  const openPosition = async (
    token: string,
    leverage: number,
    signer: Signer,
    ty: number
  ) => {
    let tx: any;
    switch (ty) {
      case LONG:
        tx = await leverageTrade
          .connect(signer)
          .openLongPosition(token, leverage);
        break;
      case SHORT:
        tx = await leverageTrade
          .connect(signer)
          .openShortPosition(token, leverage);
        break;
    }

    const txReceipt = await tx!.wait();
    return { txReceipt };
  };

  describe("depositToken", () => {
    it("should deposit token MKT", async () => {
      const signer = alice;
      const signerAddress = aliceAddress;
      const amount = 2000;

      await mint(mockToken, signerAddress, amount);
      await approve(leverageTrade.address, amount, mockToken, signer);

      const initialAccount = await leverageTrade.getAccount(
        signerAddress,
        mockToken.address
      );

      const { txReceipt } = await depositToken(
        mockToken.address,
        amount,
        signer
      );

      const decodedEvent = parseEvents(txReceipt, DEPOSIT_TOKEN_EVENT);
      const finalAccount = await leverageTrade.getAccount(
        signerAddress,
        mockToken.address
      );

      expect(finalAccount.enabled).to.equal(true);
      expect(finalAccount.collateral).to.equal(
        initialAccount.collateral.add(toBN(amount))
      );
      expect(finalAccount.totalLeverage).to.equal(initialAccount.totalLeverage);

      // Test emited events
      expect(decodedEvent.account).to.equal(signerAddress);
      expect(decodedEvent.token).to.equal(mockToken.address);
      expect(decodedEvent.amount).to.equal(toBN(amount));
    });

    it("fails if when no sufficient allowance", async () => {
      const signer = bob;
      const signerAddress = bobAddress;
      const amount = 4560;

      await expect(
        depositToken(mockToken.address, amount, signer)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });

  describe("openLongPosition", () => {
    it("should open a long leverage position", async () => {
      const signer = alice;
      const signerAddress = aliceAddress;
      const amount = 6000;
      const leverage = 7;
      const ethUSDPrice = 2468;

      await mint(mockToken, signerAddress, amount);
      await approve(leverageTrade.address, amount, mockToken, signer);

      await depositToken(mockToken.address, amount, signer);

      mocklatestRoundData(mockPriceOracle, ethUSDPrice);

      const { txReceipt } = await openPosition(
        mockToken.address,
        leverage,
        signer,
        LONG
      );

      const positions = await leverageTrade.getPositions(
        mockToken.address,
        signerAddress
      );
      const position = positions[0];
      const ethAmount = getEthAmount(ethUSDPrice, leverage, amount);
      const account = await leverageTrade.getAccount(
        signerAddress,
        mockToken.address
      );

      expect(positions.length).to.equal(1);
      expect(position.ethAmount).to.equal(ethAmount);
      expect(position.lockedPrice).to.equal(toBN(ethUSDPrice));
      expect(position.side).to.equal(LONG);
      expect(account.totalLeverage).to.equal(leverage);
      expect(account.collateral).to.equal(toBN(amount));
    });

    it("should open a short leverage position", async () => {
      const signer = bob;
      const signerAddress = bobAddress;
      const amount = 12000;
      const leverage = 10;
      const ethUSDPrice = 4300;

      await mint(mockToken, signerAddress, amount);
      await approve(leverageTrade.address, amount, mockToken, signer);

      await depositToken(mockToken.address, amount, signer);

      mocklatestRoundData(mockPriceOracle, ethUSDPrice);

      const { txReceipt } = await openPosition(
        mockToken.address,
        leverage,
        signer,
        SHORT
      );

      const positions = await leverageTrade.getPositions(
        mockToken.address,
        signerAddress
      );
      const position = positions[0];
      const ethAmount = getEthAmount(ethUSDPrice, leverage, amount);
      const account = await leverageTrade.getAccount(
        signerAddress,
        mockToken.address
      );

      expect(positions.length).to.equal(1);
      expect(position.ethAmount).to.equal(ethAmount);
      expect(position.lockedPrice).to.equal(toBN(ethUSDPrice));
      expect(position.side).to.equal(SHORT);
      expect(account.totalLeverage).to.equal(leverage);
      expect(account.collateral).to.equal(toBN(amount));
    });

    it("should fail if leverage exceeds the MAX leverage", async () => {
      const signer = bob;
      const leverage = 11;

      await expect(
        openPosition(mockToken.address, leverage, signer, SHORT)
      ).to.be.revertedWith("LeverageTrade: exceeded MAX_LEVERAGE");
    });

    it("should fail if collateral is 0", async () => {
      const signer = bob;
      const leverage = 9;

      await expect(
        openPosition(mockToken.address, leverage, signer, SHORT)
      ).to.be.revertedWith("LeverageTrade: insufficient collateral");
    });

    it("it fails if max account value is exceeded", async () => {
      const signer = bob;
      const signerAddress = bobAddress;
      const amount = 12000;
      let leverage = 6;
      const ethUSDPrice = 4300;

      await mint(mockToken, signerAddress, amount);
      await approve(leverageTrade.address, amount, mockToken, signer);

      await depositToken(mockToken.address, amount, signer);

      mocklatestRoundData(mockPriceOracle, ethUSDPrice);

      // Signer opens a 6x position
      const { txReceipt } = await openPosition(
        mockToken.address,
        leverage,
        signer,
        LONG
      );

      leverage = 5;
      // Signer tries to open a new 5x position; they already have a 6x postion open, hence this exceeds the MAX leverage 10 (6 + 5 = 11)
      await expect(
        openPosition(mockToken.address, leverage, signer, LONG)
      ).to.be.revertedWith("LeverageTrade: exceeded MAX position");
    });
  });
});
