//SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract TestBuilciber is ERC20Burnable {
    uint public constant _totalSupply = 1_000_000 * (10**18);
    uint public immutable lockStart;
    uint public lockDuration;
    address public owner;

    constructor(uint _lockDuration) ERC20("TestBuilciber", "tBCB") {
        lockStart = block.timestamp;
        lockDuration = _lockDuration;
        owner = msg.sender;
        _mint(owner, _totalSupply);
    }

    modifier onlyOwner {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    function _isLocked(uint timeStamp) internal view returns(bool) {
        if (timeStamp - lockStart < lockDuration) {
            return true;
        }
        return false;
    }

    function _isTransferrable(address caller, address recipient, uint timeStamp) internal view returns(bool) {
        if (caller == owner || caller == address(0) || recipient == address(0) || !_isLocked(timeStamp)) {
            return true;
        }
        return false;
    }

    function changeLockDuration(uint newLockDuration) external onlyOwner{
        lockDuration = newLockDuration;
    }

    function changeOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Missing address input");
        owner = newOwner;
    }

    function _update(address sender, address recipient, uint256 amount) internal virtual override {
        require(_isTransferrable(sender, recipient, block.timestamp), "You cannot transfer this token yet");
        super._update(sender, recipient, amount);
    }

    function _approve(address _owner, address spender, uint256 amount, bool emitEvent) internal virtual override {
        require(_isTransferrable(_owner, spender, block.timestamp), "You cannot spend this token yet");
        super._approve(_owner, spender, amount, emitEvent);
    }

}
