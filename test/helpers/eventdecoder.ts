import { ethers, Signer } from "ethers";
import { Provider } from "@ethersproject/abstract-provider";

const localProvider = new ethers.providers.JsonRpcProvider(
  "http://localhost:8545"
);

const decoder = new ethers.utils.AbiCoder();

export const EXCHANGE_EVENT = "EXCHANGE";
export const ADD_LIQUIDITY_EVENT = "AddLiquidity";
export const UPDATE_RESERVES_EVENT = "UpdateReserves";

// Retrieved from artifacts/contracts/Exchange.sol/AMMExchange.json
const AddLiquidity = [
  {
    indexed: true,
    internalType: "address",
    name: "LP",
    type: "address",
  },
  {
    indexed: true,
    internalType: "uint256",
    name: "twd",
    type: "uint256",
  },
  {
    indexed: true,
    internalType: "uint256",
    name: "usd",
    type: "uint256",
  },
];

// Retrieved from artifacts/contracts/Exchange.sol/AMMExchange.json
const Exchange = [
  {
    indexed: true,
    internalType: "address",
    name: "sender",
    type: "address",
  },
  {
    indexed: true,
    internalType: "address",
    name: "tradedToken",
    type: "address",
  },
  {
    indexed: true,
    internalType: "uint256",
    name: "tradedAmount",
    type: "uint256",
  },
];

// Retrieved from artifacts/contracts/Exchange.sol/AMMExchange.json
const UpdateReserves = [
  {
    indexed: false,
    internalType: "uint256",
    name: "oldRu",
    type: "uint256",
  },
  {
    indexed: false,
    internalType: "uint256",
    name: "newRu",
    type: "uint256",
  },
  {
    indexed: false,
    internalType: "uint256",
    name: "oldRt",
    type: "uint256",
  },
  {
    indexed: false,
    internalType: "uint256",
    name: "newRt",
    type: "uint256",
  },
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
    default:
      ABI = undefined;
  }

  if (!ABI) {
    throw new Error(`Event ${event} is not supported`);
  }

  return { abi: ABI, hash: hash };
};

export const getEventData = async (
  txReceipt: any,
  event: string
): Promise<any> => {
  let decodedEvent: any;

  switch (event) {
    case EXCHANGE_EVENT:
      decodedEvent = decodeIndexedEvent(EXCHANGE_EVENT, txReceipt);
      break;
    case UPDATE_RESERVES_EVENT:
      decodedEvent = decodeUnindexedEvent(UPDATE_RESERVES_EVENT, txReceipt);
      break;
  }

  return decodedEvent;
};

const decodeUnindexedEvent = (event: string, txReceipt: any) => {
  const obj = getObj(event);
  let types: string[] = [];
  let names: string[] = [];

  let unIndexedEvents = obj.abi.filter((e) => e.indexed === false);
  for (const element of unIndexedEvents) {
    types.push(element["type"]);
    names.push(element["name"]);
  }

  let data;
  for (const item of txReceipt.logs) {
    if (item.topics[0] == obj.hash) {
      data = item.data;
    }
  }

  const decodedLogs = decoder.decode([...types], data);
  return Object.assign(
    {},
    ...names.map((n, index) => ({ [n]: decodedLogs[index] }))
  );
};

const decodeIndexedEvent = (event: string, txReceipt: any): any => {
  try {
    let types: string[] = [];
    let names: string[] = [];

    const obj = getObj(event);

    for (const element of obj.abi) {
      if (element["indexed"]) {
        types.push(element["type"]);
        names.push(element["name"]);
      }
    }

    let topics: string[] = [];
    for (const item of txReceipt.logs) {
      if (item.topics[0] == obj.hash) {
        topics = item.topics.slice(1);
      }
    }
    const decoded = topics.map((element, index) => {
      return decoder.decode([types[index]], element).toString();
    });

    return Object.assign(
      {},
      ...names.map((n, index) => ({ [n]: decoded[index] }))
    );
  } catch (error) {
    throw error;
  }
};
