import { BigNumber } from "ethers";

export const toBN = (value: number, scale = 18): BigNumber => {
  return scale == 0
    ? BigNumber.from(value)
    : BigNumber.from(value).mul(BigNumber.from(10).pow(scale));
};
