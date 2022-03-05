pragma solidity ^0.8.0;

library IterableMapping {
    struct Leverage {
        uint256 collateral;
        uint64 postion; // Pack struct into 3 slots.
        address asset;
    }

    struct Account {
        uint256 totalCollateral;
        uint256 totalPostion; // Pack struct into 3 slots.
        Leverage[] leverages;
    }

    struct Map {
        address[] keys;
        mapping(address => Account) accounts;
        mapping(address => uint256) indexOf;
        mapping(address => bool) inserted;
    }

    function get(Map storage map, address key)
        internal
        view
        returns (Account memory)
    {
        return map.accounts[key];
    }

    function getIndexOfKey(Map storage map, address key)
        internal
        view
        returns (int256)
    {
        if (!map.inserted[key]) {
            return -1;
        }
        return int256(map.indexOf[key]);
    }

    function getKeyAtIndex(Map storage map, uint256 index)
        internal
        view
        returns (address)
    {
        return map.keys[index];
    }

    function size(Map storage map) internal view returns (uint256) {
        return map.keys.length;
    }

    function add(
        Map storage map,
        address key,
        Account memory val
    ) internal {
        if (map.inserted[key]) {
            map.accounts[key] = val;
        } else {
            map.inserted[key] = true;
            map.accounts[key] = val;
            map.indexOf[key] = map.keys.length;
            map.keys.push(key);
        }
    }

    function remove(Map storage map, address key) internal {
        if (!map.inserted[key]) {
            return;
        }

        delete map.inserted[key];
        delete map.accounts[key];

        uint256 index = map.indexOf[key];
        uint256 lastIndex = map.keys.length - 1;
        address lastKey = map.keys[lastIndex];

        map.indexOf[lastKey] = index;
        delete map.indexOf[key];

        map.keys[index] = lastKey;
        map.keys.pop();
    }
}
