import { expect } from "chai";
import { ethers } from "hardhat";
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

  let priceOracle: FakeContract<AggregatorV3Interface>;

  beforeEach(async () => {
    [admin, alice, bob] = await ethers.getSigners();
    adminAddress = await admin.getAddress();
    aliceAddress = await alice.getAddress();
    bobAddress = await bob.getAddress();

    priceOracle = await smock.fake<AggregatorV3Interface>(
      "AggregatorV3Interface"
    );

    mockToken = await deployMockToken("Mock Token", "MKT", admin);
    mockTWD = await deployMockToken("TWD Token", "TWD", admin);
    mockUSD = await deployMockToken("USD Token", "USD", admin);

    leverageTrade = await new LeverageTrade__factory(admin).deploy(
      mockTWD.address,
      mockUSD.address,
      priceOracle.address
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
  });
});
