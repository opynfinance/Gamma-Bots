require('dotenv').config();

const { ethers } = require("ethers");
const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');
// const BigNumber = require('bignumber.js');

const AddressBookAbi = require('./abi/AddressBook.json');
const OtokenFactory = require('./abi/OtokenFactory.json');
const OracleAbi = require('./abi/Oracle.json');
const ChainlinkPricerAbi = require('./abi/ChainLinkPricer.json');
const AggregatorInterfaceAbi = require('./abi/AggregatorInterface.json');
const OtokenAbi = require('./abi/Otoken.json');

// Entrypoint for the Autotask
exports.handler = async function(credentials) {
    // config
    const relayerAddress = '0x7d78c401c69c56cb21f4bf80c53afd92be0ae749';                    // Relayer address
    const addressbookAddress = '0x57ADe7D5E9D2F45A07f8039Da7228ACC305fbeaF';                // AddressBook module
    const pricerAddress = '0x669cC97687c792fc5369d7bdd38cC9CFb2056d98';                     // WETH pricer
    const pricerAsset = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';                       // WETH address
    const chainlinkAggregatorAddress = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419';        // Chainlink price feed

    // Initialize default provider and defender relayer signer
    const provider = new DefenderRelayProvider(credentials);
    const signer = new DefenderRelaySigner(credentials, provider, { 
        speed: 'fast', 
        from: relayerAddress,
    });

    // addressbook instance
    const addressbook = new ethers.Contract(addressbookAddress, AddressBookAbi, signer);
    // oracle address
    const oracleAddress = await addressbook.getOracle();
    // oracle instance
    const oracle = new ethers.Contract(oracleAddress, OracleAbi, signer);
    // pricer instance
    const pricer = new ethers.Contract(pricerAddress, ChainlinkPricerAbi, signer);
    // chainlink price feed instance
    const chainlinkAggregator = new ethers.Contract(chainlinkAggregatorAddress, AggregatorInterfaceAbi, signer);
    // Otoken expiry hour in UTC
    const expiryHour = 8;
    

    console.log('Oracle: ', oracle.address);
    console.log('Pricer: ', pricer.address);
    console.log('Pricer asset: ', pricerAsset);
    console.log('Chainlink aggregator: ', chainlinkAggregator.address);

    // set expiry timestamp
    let expiryTimestamp = new Date();
    expiryTimestamp.setHours(expiryHour);
    expiryTimestamp.setMinutes(0);
    expiryTimestamp.setSeconds(0);
    expiryTimestamp = Math.floor(expiryTimestamp.getTime() / 1000);

    // current timestamp in UTC seconds
    let currentTimestamp = new Date();
    const hour = currentTimestamp.getHours()
    currentTimestamp = Math.floor(currentTimestamp.getTime() / 1000);

    console.log('Expiry timestamp: ', expiryTimestamp.toString())
    console.log('Current timestamp: ', currentTimestamp);
    console.log('Current hour: ', hour);

    if(hour == expiryHour) {
        let expiryPrice = await oracle.getExpiryPrice(pricerAsset, expiryTimestamp);
        let isLockingPeriodOver = await oracle.isLockingPeriodOver(pricerAsset, expiryTimestamp);

        if (expiryPrice[0].toString() == '0' && isLockingPeriodOver) {
            // round id for expiry timestamp
            let priceRoundId = await chainlinkAggregator.latestRound();
            let priceRoundTimestamp = await chainlinkAggregator.getTimestamp(priceRoundId);
            // round id before price round id
            let previousRoundId;
            let previousRoundTimestamp;

            // check if otoken price is not on-chain, and latest chainlink round timestamp is greater than otoken expiry timestamp and locking period over
            if (priceRoundTimestamp.toString() >= expiryTimestamp) {
                // loop and decrease round id until previousRoundTimestamp < expiryTimestamp && priceRoundTimestamp >= expiryTimestamp
                // if previous round timestamp != 0 && less than expiry timestamp then exit => price round id found
                // else store previous round id in price round id (as we are searching for the first round id that it timestamp >= expiry timestamp)
                for (let j = priceRoundId.sub(1); j > 0; j = j.sub(1)) {
                    previousRoundId = j;
                    previousRoundTimestamp = await chainlinkAggregator.getTimestamp(j);

                    if (previousRoundTimestamp.toString() != '0') {    
                        if (previousRoundTimestamp.toString() < expiryTimestamp.toString()) {
                            break;
                        }
                        else {
                            priceRoundId = previousRoundId;
                            priceRoundTimestamp = previousRoundTimestamp;
                        }
                    } 
                }

                console.log('Found round id: ', priceRoundId.toString());
                console.log('Found round timestamp: ', priceRoundTimestamp.toString());

                let tx = await pricer.setExpiryPriceInOracle(expiryTimestamp, priceRoundId, {gasLimit: '1000000'});

                console.log('Tx hash: ', tx.hash);
            }
            else {
                console.log('Chainlink latest round timestamp is not grater than or equal the expiry timestamp ')
            }
        }
    }
}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
    const { API_KEY_MAINTESTING: apiKey, API_SECRET_API_SECRET_KOVAN: apiSecret } = process.env;
    exports.handler({ apiKey, apiSecret })
        .then(() => process.exit(0))
        .catch(error => { console.error(error); process.exit(1); });
}
