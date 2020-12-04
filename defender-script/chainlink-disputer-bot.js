// WETH disputer
require('dotenv').config();

const { ethers } = require("ethers");
const { DefenderRelaySigner } = require('defender-relay-client/lib/ethers');
const fetch = require('node-fetch');
const BigNumber = require('bignumber.js');

const AddressBookAbi = require('./abi/AddressBook.json');
const OtokenFactory = require('./abi/OtokenFactory.json');
const OracleAbi = require('./abi/Oracle.json');
const OtokenAbi = require('./abi/Otoken.json');

// WETH mainnet address
const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

/**
 * Check if underlying, collateral or strike asset is equal to WETH address
 * @param {*} underlyingAsset   otoken underlying asset
 * @param {*} collateralAsset   otoken collateral asset
 * @param {*} strikeAsset       otoken strike asset
 */
function isSupported(underlyingAsset, collateralAsset, strikeAsset) {
    return WETH == underlyingAsset || WETH == collateralAsset || WETH == strikeAsset;
}

// Entrypoint for the Autotask
exports.handler = async function(credentials) {
    const relayerAddress = '0x5f4ee22c55931836949c4574a6a43473b3062fd7';
    const addressbookAddress = '0x7630e7dE53E3d1f298f653d27fcF3710c602331C';

    // Initialize default provider and defender relayer signer
    const provider = new ethers.providers.InfuraProvider('rinkeby', process.env.INFURA_KEY);
    const signer = new DefenderRelaySigner(credentials, provider, { 
        speed: 'fast', 
        from: relayerAddress,
    });

    // addressbook instance
    const addressbook = new ethers.Contract(addressbookAddress, AddressBookAbi, signer);
    // otoken factory address
    const otokenFactoryAddress = await addressbook.getOtokenFactory();
    // oracle address
    const oracleAddress = await addressbook.getOracle();
    // oTokenFactory instance
    const otokenFactory = new ethers.Contract(otokenFactoryAddress, OtokenFactory, signer);
    // oracle instance
    const oracle = new ethers.Contract(oracleAddress, OracleAbi, signer);
    console.log('Oracle: ', oracle.address);

    // current timestamp in UTC milliseconds
    const currentTimestamp = Math.floor(new Date().getTime() / 1000);
    console.log('Current timestamp: ', currentTimestamp);    

    // let request = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
    // const price = new BigNumber((await request.json()).ethereum.usd)    
    let request = await fetch('https://api.pro.coinbase.com/products/ETH-USD/candles?granularity=3600')
    let response = await request.json()
    let price;

    // get all deployed otokens
    const otokensCounter = await otokenFactory.getOtokensLength();

    for (let i = 0; i < otokensCounter; i++) {
        let otokenAddress = await otokenFactory.otokens(i);
        let otoken = new ethers.Contract(otokenAddress, OtokenAbi, signer);
        let expiryTimestamp = await otoken.expiryTimestamp();

        response.map(p => {
            if(p[0] ==  expiryTimestamp) {
                price = new BigNumber(p[3])
            }
        })
        console.log("Current WETH price: ", price.toString())
    
        if(currentTimestamp >= expiryTimestamp) {
            let underlyingAsset = await otoken.underlyingAsset();
            let collateralAsset = await otoken.collateralAsset();
            let strikeAsset = await otoken.strikeAsset();
            let isLockingPeriodOver = await oracle.isLockingPeriodOver(WETH, expiryTimestamp);
            let isDisputePeriodOver = await oracle.isDisputePeriodOver(WETH, expiryTimestamp);

            if (
                (isSupported(underlyingAsset, collateralAsset, strikeAsset)) &&
                isLockingPeriodOver &&
                !isDisputePeriodOver
            ) {
                let oraclePrice = new BigNumber(await oracle.getExpiryPrice(WETH, expiryTimestamp)).dividedBy(1e8)
                let diff = price.isGreaterThan(oraclePrice) ? price.minus(oraclePrice) : oraclePrice.minus(price)
                
                if(diff.isGreaterThan(price.multipliedBy(0.1))) {
                    console.log("Disputing price");

                    await oracle.disputeExpiryPrice(WETH, expiryTimestamp, price.toString())
                }
            }
        }
    }
}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
    const { API_KEY: apiKey, API_SECRET: apiSecret } = process.env;
    exports.handler({ apiKey, apiSecret })
        .then(() => process.exit(0))
        .catch(error => { console.error(error); process.exit(1); });
}