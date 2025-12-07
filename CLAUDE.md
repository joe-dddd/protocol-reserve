# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Venus Protocol Reserve - Solidity contracts managing protocol income distribution and risk fund management. Part of Venus Protocol DeFi lending/borrowing system.

## Commands

```bash
# Install
yarn install

# Compile (standard + zkSync)
yarn compile

# Test
yarn test
npx hardhat test tests/ProtocolReserve/ProtocolShareReserve.ts  # single file

# Coverage
npx hardhat coverage

# Lint
yarn lint                    # all (ts + sol + prettier)
yarn lint:sol                # solidity only
yarn lint:ts                 # typescript only

# Format
yarn prettier                # fix
yarn prettier:check          # check only

# Build (compile + typechain)
yarn build

# Deploy (local)
npx hardhat deploy

# Deploy (network)
npx hardhat deploy --network bsctestnet

# Generate docs
yarn docgen

# Clean
yarn clean
```

## Architecture

### Core Contracts

**ProtocolShareReserve** (`contracts/ProtocolReserve/ProtocolShareReserve.sol`)
- Receives protocol income from VTokens
- Categorizes income into schemas: PROTOCOL_RESERVES (spread) and ADDITIONAL_REVENUE (liquidation)
- Distributes funds to configured destinations based on percentage allocation
- Entry point: `updateAssetsState()` called by VTokens, `releaseFunds()` triggers distribution

**RiskFundV2** (`contracts/ProtocolReserve/RiskFundV2.sol`)
- Holds converted base assets per Comptroller pool
- Funds transferred to Shortfall contract for bad debt auctions via `transferReserveForAuction()`
- Updated by RiskFundConverter after token conversions

**TokenConverters** (`contracts/TokenConverter/`)
- `AbstractTokenConverter`: Base for all converters, handles oracle-based token swaps with incentives
- `RiskFundConverter`: Converts assets to base asset for RiskFund, tracks per-pool reserves
- `SingleTokenConverter`: Converts to destination's base asset (e.g., XVS for XVSVault)
- `ConverterNetwork`: Registry of converters, enables private conversions between converters

### Income Flow

```
VToken.reduceReserves() → ProtocolShareReserve.updateAssetsState()
                                    ↓
                          releaseFunds() distributes to:
                          ├── RiskFundConverter → RiskFundV2 → Shortfall
                          ├── SingleTokenConverter → XVSVaultTreasury
                          └── Other destinations
```

### Key Patterns

- **Two schemas**: PROTOCOL_RESERVES for spread income, ADDITIONAL_REVENUE for liquidation proceeds
- **Private conversions**: Converters swap tokens between themselves without user incentives
- **Per-pool tracking**: RiskFund tracks reserves per Comptroller for isolated pool risk management
- **Upgradeable proxies**: All core contracts use OpenZeppelin upgradeable pattern

## Dependencies

External Venus packages provide contract artifacts and deployments:
- `@venusprotocol/governance-contracts`: AccessControlManager, Timelock
- `@venusprotocol/isolated-pools`: Comptroller, VToken, PoolRegistry
- `@venusprotocol/oracle`: ResilientOracle for price feeds
- `@venusprotocol/venus-protocol`: Core pool contracts

## Networks

Supported: bsctestnet, bscmainnet, ethereum, sepolia, opbnbtestnet, opbnbmainnet, arbitrumsepolia, arbitrumone, opsepolia, opmainnet, basesepolia, basemainnet, unichainsepolia, unichainmainnet, zksyncsepolia, zksyncmainnet

## Environment Variables

```
DEPLOYER_PRIVATE_KEY=       # for mainnet deployments
MNEMONIC=                   # for testnet deployments
ETHERSCAN_API_KEY=          # contract verification
ARCHIVE_NODE_<network>=     # RPC URLs (e.g., ARCHIVE_NODE_bscmainnet)
FORK=true                   # enable fork testing
FORKED_NETWORK=             # network to fork (e.g., bscmainnet)
```

## Testing

- Unit tests in `tests/` mirror contract structure
- Fork tests in `tests/fork/` require `FORK=true` and `FORKED_NETWORK`
- Uses smock for mocking, hardhat-network-helpers for time/block manipulation
