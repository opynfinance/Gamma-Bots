require('dotenv').config();

const { ethers } = require("ethers");
const { DefenderRelaySigner } = require('defender-relay-client/lib/ethers');

const AddressBookAbi = require('./abi/AddressBook.json');
const OtokenFactory = require('./abi/OtokenFactory.json');
const OracleAbi = require('./abi/Oracle.json');
const CompoundPricerAbi = require('./abi/CompoundPricer.json');
const OtokenAbi = require('./abi/Otoken.json');

/**
 * Check if underlying, collateral or strike asset is equal to pricer asset
 * @param {*} pricerAsset       asset that the pricer support
 * @param {*} underlyingAsset   otoken underlying asset
 * @param {*} collateralAsset   otoken collateral asset
 * @param {*} strikeAsset       otoken strike asset
 */
function isSupported(pricerAsset, underlyingAsset, collateralAsset, strikeAsset) {
    return pricerAsset == underlyingAsset || pricerAsset == collateralAsset || pricerAsset == strikeAsset;
}

// Loop through all deployed otoken, for each otoken get underlying, strike and collateral asset
// If:
//      - One of those assets is equal to the pricer asset
//      - And current timestamp equal or passed otoken expiry timestamp
//      - And no price pushed before for this asset at this timestamp in the Oracle module
//      - And locking period is passed
// then:
//      - Make transaction to the pricer

// Entrypoint for the Autotask
exports.handler = async function(credentials) {
    // Rinkeby config
    // Relayer: 0x5f4ee22c55931836949c4574a6a43473b3062fd7
    // AddressBook: 0x7630e7dE53E3d1f298f653d27fcF3710c602331C
    // Pricer: 0x7EaEbc642Af4E92245105De1958B87BF8ee89757

    const relayerAddress = '0x5f4ee22c55931836949c4574a6a43473b3062fd7';
    const addressbookAddress = '0x7630e7dE53E3d1f298f653d27fcF3710c602331C';
    const pricerAddress = '0x7EaEbc642Af4E92245105De1958B87BF8ee89757';

    // Initialize default provider and defender relayer signer
    const provider = new ethers.providers.InfuraProvider('rinkeby', process.env.INFURA_KEY);
    const signer = new DefenderRelaySigner(credentials, provider, { 
        speed: 'fast', 
        from: relayerAddress,
    });

    const addressbook = new ethers.Contract(addressbookAddress, AddressBookAbi, signer);

    const otokenFactoryAddress = await addressbook.getOtokenFactory();
    const oracleAddress = await addressbook.getOracle();

    const otokenFactory = new ethers.Contract(otokenFactoryAddress, OtokenFactory, signer);
    const oracle = new ethers.Contract(oracleAddress, OracleAbi, signer);
    const pricer = new ethers.Contract(pricerAddress, CompoundPricerAbi, signer);

    // asset address that this pricer support
    const pricerAsset = await pricer.cToken();
    // underlying asset for pricer cToken
    const underlyingCtokenAsset = await pricer.underlying()
    // chainlink price feed address
    const underlyingPricer = await pricer.underlyingPricer();

    console.log('Oracle: ', oracle.address);
    console.log('Pricer: ', pricer.address);
    console.log('Pricer cToken: ', pricerAsset);
    console.log('cToken underlying asset: ', underlyingCtokenAsset);
    console.log('Underlying asset pricer: ', underlyingPricer);

    // current timestamp in UTC milliseconds
    const currentTimestamp = Math.floor(new Date().getTime() / 1000);

    console.log('Current timestamp: ', currentTimestamp);

    // get all deployed otokens
    const otokensCounter = await otokenFactory.getOtokensLength();

    for(let i = 0; i < otokensCounter; i++) {
        let otokenAddress = await otokenFactory.otokens(i);
        let otoken = new ethers.Contract(otokenAddress, OtokenAbi, signer);

        let underlyingAsset = await otoken.underlyingAsset();
        let collateralAsset = await otoken.collateralAsset();
        let strikeAsset = await otoken.strikeAsset();

        if(
            isSupported(pricerAsset, underlyingAsset, collateralAsset, strikeAsset)
        ) {
            let expiryTimestamp = await otoken.expiryTimestamp();

            if(currentTimestamp >= expiryTimestamp) {
                console.log('Expired Otoken: ', otoken.address);
                
                let expiryPrice = await oracle.getExpiryPrice(pricerAsset, expiryTimestamp);
                let isLockingPeriodOver = await oracle.isLockingPeriodOver(pricerAsset, expiryTimestamp);

                // need to improve this as this will push again price if price pushed equal to zero
                if((expiryPrice[0].toNumber() == 0) && isLockingPeriodOver) {
                    console.log('Pushing price now');

                    await pricer.setExpiryPriceInOracle(expiryTimestamp, {gasLimit: '1000000'});
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
