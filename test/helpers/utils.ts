import { BigNumber, Signer, Contract } from "ethers";
import { MockToken__factory } from "../../typechain";

export const toBN = (value: number, scale = 18): BigNumber => {
  return scale == 0
    ? BigNumber.from(value)
    : BigNumber.from(value).mul(BigNumber.from(10).pow(scale));
};

export const getOutputAmount = (
  inputAmount: BigNumber,
  reserveTWD: BigNumber,
  reserveUSD: BigNumber
): BigNumber => {
  return reserveTWD
    .mul(reserveUSD)
    .div(reserveTWD.add(inputAmount))
    .sub(reserveUSD);
};

export const deployMockToken = async (
  name: string,
  symbol: string,
  signer: Signer
) => {
  return await new MockToken__factory(signer).deploy(name, symbol);
};

// ERC20 helpers
export const batchMint = async (
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

export const mint = async (
  token: Contract,
  account: string,
  amount: number
) => {
  await token.mint(account, toBN(amount));
};

export const balanceOf = async (
  account: string,
  token: Contract
): Promise<BigNumber> => {
  return await token.balanceOf(account);
};

export const approve = async (
  spender: string,
  amount: number,
  token: Contract,
  signer: Signer
) => {
  await token.connect(signer).approve(spender, toBN(amount));
};
