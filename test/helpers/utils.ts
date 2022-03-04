import { BigNumber } from "ethers";

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
