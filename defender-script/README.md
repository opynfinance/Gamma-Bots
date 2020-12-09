# OZ Defender Scripts

Bots, Bots everywhere using OZ Defender

## Local Development Setup

- Clone this repo.
- Hop into `/defender-script`
- Run `yarn install --frozen-lockfile`.

## Chainlink Pricer Autotask

Chainlink autotask is a JS script that run every 1 min to push a specific asset price from Chainlink to the Oracle module through the pricer contract.
Every Chainlink pricer bot have:
- Relayer address: the wallet address used to make transactions (managed by OZ Defender)
- AddressBook address: Gamma Addressbook module
- Pricer address: the pricer contract that handle pushing the asset price to the Oracle module

### How It Work ?

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

- Add `API_KEY` and `API_SECRET` (Relayer keys) and `INFURA_KEY` into `.env` file.
- Run `yarn chainlink-pricer` for Chainlink pricer.
- Run `yarn compound-pricer` for Compound pricer.

## Chainlink Pricer Disputer: WETH/USD


