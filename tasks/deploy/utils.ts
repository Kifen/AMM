import { BigNumber } from "ethers";
import fs from "fs";
import path from "path";

const addressFile = "contract-addresses.json";

export const getSavedContractAddresses = () => {
  let json: any;
  try {
    json = fs.readFileSync(path.join(__dirname, `../../${addressFile}`));
  } catch (err) {
    json = "{}";
  }
  const addrs = JSON.parse(json);
  return addrs;
};

export const saveContractAddress = (
  network: any,
  contract: string,
  address: string
) => {
  const addrs = getSavedContractAddresses();
  addrs[network] = addrs[network] || {};
  addrs[network][contract] = address;

  fs.writeFileSync(
    path.join(__dirname, `../../${addressFile}`),
    JSON.stringify(addrs, null, "    ")
  );
};

export const toBN = (value: number): BigNumber => {
  return BigNumber.from(value).mul(BigNumber.from(10).pow(18));
};

module.exports = {
  getSavedContractAddresses,
  saveContractAddress,
  toBN,
};
