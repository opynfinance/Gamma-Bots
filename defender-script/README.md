# OZ Defender Scripts

Bots, Bots everywhere using OZ Defender

## Local Development Setup

- Clone this repo.
- Hop into `/defender-script`
- Run `yarn install --frozen-lockfile`.

## Chainlink Pricer Autotask

Chainlink pricer autotask is a JS script that run every 1 min to push a specific asset price from Chainlink to the Oracle module through the pricer contract.

Every Chainlink pricer bot have:
- Relayer address: the wallet address used to make transactions (managed by OZ Defender)
- AddressBook address: Gamma Addressbook module
- Pricer address: the pricer contract that handle pushing the asset price to the Oracle module

### How It Work ?

- Add `API_KEY` and `API_SECRET` (Relayer keys) and `INFURA_KEY` into `.env` file.
- Run `yarn chainlink-pricer` for Chainlink pricer.

### Functionalities

- Loop through all Otoken contracts deployed from OtokenFactory
- Get the underlying, strike and collateral asset from the Otoken
- If
  - One of those assets is equal to the pricer asset
  - And current timestamp equal or passed the Otoken expiry timestamp 
  - And no price pushed before for this asset at this timestamp in the Oracle module
  - And pricer locking period is passed
- Then get the round ID from chainlink that correspond to the asset price at the expiry timestamp
- Call the Pricer contract to submit price to Oracle module through `setExpiryPriceInOracle(expiryTimestamp, priceRoundId)`

#### How to get Chainlink round ID that correspond to the price at the expiry timestamp ?

- Get current round ID and round timestamp
- If current round timestamp greater or equal expiry timestamp
 - Get previous round ID and previosu round timestamp and store it
 - If previous round timestamp is different than zero
   - If previous round timestamp is less than expiry timestamp then exit loop (roundTimestamp >= expiry && previousRoundTimestamp < expiry => round ID found)
   - Else store previous round ID and timestamp in current round ID and decrease ID by 1

## Compound Pricer Autotask

Compound pricer autotask is a JS script that run every 1 min to make a transaction to COmpound pricer contract to pull a specific cToken price in USD.

Every Chainlink pricer bot have:
- Relayer address: the wallet address used to make transactions (managed by OZ Defender)
- AddressBook address: Gamma Addressbook module
- Pricer address: the pricer contract that handle pushing the asset price to the Oracle module

### How It Work ?

- Add `API_KEY` and `API_SECRET` (Relayer keys) and `INFURA_KEY` into `.env` file.
- Run `yarn compound-pricer` for Compound pricer.

### Functionalities

- Loop through all Otoken contracts deployed from OtokenFactory
- Get the underlying, strike and collateral asset from the Otoken
- If
  - One of those assets is equal to the pricer asset
  - And current timestamp equal or passed otoken expiry timestamp
  - And no price pushed before for this asset at this timestamp in the Oracle module
  - And locking period is passed
- Then make transaction to the pricer through `setExpiryPriceInOracle()` passing the expiry timestamp as arg

## Chainlink Price Disputer: WETH/USD

Chainlink disputer autotoask is a JS script that run every 1 min to disputer new WETH/USD pushed prices in case a specific price deviate a %X from the off-chain source.

Chainlink disputer autotask have:
- Relayer address: the wallet address used to make transactions (managed by OZ Defender)
- AddressBook address: Gamma Addressbook module

### How It Work ?

- Add `API_KEY` and `API_SECRET` (Relayer keys) and `INFURA_KEY` into `.env` file.
- Run `yarn chainlink-pricer` for Chainlink pricer.

### Functionalities

- Get ETH hourly prices from coinbase
- Loop through all Otoken contracts deployed from OtokenFactory
- If current timestamp equal or passed otoken expiry timestamp
  - loop through coinbase prices array, and get the price that correspond to the expiry timestamp
  - Get the underlying, strike and collateral asset from the Otoken
  - If
    - One of those assets is equal to WETH
    - And locking period is passed
    - And dispute period is not over
  - Get asset price(WETH) from Oracle and divide it by 1e8
  - If price is different then 0 (price is pushed from pricer), calculate difference between on-chain and off-chain price
  - If difference greater than 0.1% of the off-chain price, dispute oracle price by submitting off-chain price through `disputeExpiryPrice()` in Oracle.sol passing `WETH address`, `expiry timestamp` and the `new price` as args

