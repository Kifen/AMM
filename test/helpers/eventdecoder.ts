import { ethers, Signer } from "ethers";
import { Provider } from "@ethersproject/abstract-provider";

const decoder = new ethers.utils.AbiCoder();

export const EXCHANGE_EVENT = "Exchange";
export const OPEN_POSITION_EVENT = "OpenPosition";
export const DEPOSIT_TOKEN_EVENT = "DepositToken";
export const ADD_LIQUIDITY_EVENT = "AddLiquidity";
export const UPDATE_RESERVES_EVENT = "UpdateReserves";

const AddLiquidity = [
  "event AddLiquidity(address indexed LP, uint256 indexed twd, uint256 indexed usd)",
];

const Exchange = [
  "event Exchange(address indexed sender, address indexed tradedToken, uint256 indexed tradedAmount)",
];

const UpdateReserves = [
  "event UpdateReserves(uint256 oldRu, uint256 newRu, uint256 oldRt, uint256 newRt)",
];

const DepositToken = [
  "event DepositToken(address indexed account, address indexed token, uint256 indexed amount)",
];

const OpenPosition = [
  "event OpenPosition(address indexed account, address indexed leverage, uint256 indexed amount, uint256 side)",
];

const AddLiquidity_Event_Hash = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("AddLiquidity(address,uint256,uint256)")
);

const Exchange_Event_Hash = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("Exchange(address,address,uint256)")
);

const UpdateReserves_Event_Hash = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("UpdateReserves(uint256,uint256,uint256,uint256)")
);

const DepositToken_Event_Hash = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("DepositToken(address,address,uint256)")
);

const OpenPosition_Event_Hash = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("OpenPosition(address,uint64,uint256,uint256)")
);

const getObj = (event: string) => {
  let ABI;
  let hash;

  switch (event) {
    case ADD_LIQUIDITY_EVENT:
      ABI = AddLiquidity;
      hash = AddLiquidity_Event_Hash;
      break;
    case UPDATE_RESERVES_EVENT:
      ABI = UpdateReserves;
      hash = UpdateReserves_Event_Hash;
      break;
    case EXCHANGE_EVENT:
      ABI = Exchange;
      hash = Exchange_Event_Hash;
      break;
    case DEPOSIT_TOKEN_EVENT:
      ABI = DepositToken;
      hash = DepositToken_Event_Hash;
      break;
    default:
    case OPEN_POSITION_EVENT:
      ABI = OpenPosition;
      hash = OpenPosition_Event_Hash;
      break;
      ABI = undefined;
  }

  if (!ABI) {
    throw new Error(`Event ${event} is not supported`);
  }

  return { abi: ABI, hash: hash };
};

export const parseEvents = (receipt: any, event: string) => {
  const { abi, hash } = getObj(event);

  let log;
  for (let i = 0; i < receipt.logs.length; i++) {
    log = receipt.logs[i];

    if (log.topics[0] === hash) {
      log = receipt.logs[i];
      break;
    }
  }

  let iface = new ethers.utils.Interface(abi);
  let decodedLog = iface.parseLog(log);
  return decodedLog.args;
};
