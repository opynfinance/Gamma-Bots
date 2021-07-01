require('dotenv').config();

const { ethers } = require("ethers");
const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');

const AddressBookAbi = require('./abi/AddressBook.json');
const OracleAbi = require('./abi/Oracle.json');
const YearnPricerAbi = require('./abi/YearnPricer.json');

// Entrypoint for the Autotask
exports.handler = async function(credentials) {
    // config
    const relayerAddress = '0xfacb407914655562d6619b0048a612b1795df783';                    // Relayer address
    const addressbookAddress = '0x1E31F2DCBad4dc572004Eae6355fB18F9615cBe4';                // AddressBook module
    const pricerAddress = '0x7494ec6d7a9a9e67774cc9b8d3aea26a8eb59db3';                     // Yearn pricer
    const pricerAsset = '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9';                       // yUSDC address
    const underlyingAsset = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

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
    const pricer = new ethers.Contract(pricerAddress, YearnPricerAbi, signer);
    // Otoken expiry hour in UTC
    const expiryHour = 8;

    console.log('Oracle: ', oracle.address);
    console.log('Pricer: ', pricer.address);
    console.log('Pricer asset: ', pricerAsset);

    // set expiry timestamp
    let expiryTimestamp = new Date();
    expiryTimestamp.setHours(expiryHour);
    expiryTimestamp.setMinutes(0);
    expiryTimestamp.setSeconds(0);
    expiryTimestamp = Math.floor(expiryTimestamp.getTime() / 1000);

    // current timestamp in UTC seconds
    let currentTimestamp = new Date();
    const hour = currentTimestamp.getHours()
    const weekday = currentTimestamp.toLocaleString("default", { weekday: "long" })
    currentTimestamp = Math.floor(currentTimestamp.getTime() / 1000);

    console.log('Expiry timestamp: ', expiryTimestamp.toString())
    console.log('Current timestamp: ', currentTimestamp);
    console.log('Current hour: ', hour);

    if((hour >= expiryHour) && (weekday == 'Friday')) {
        let underlyingPrice = await oracle.getExpiryPrice(underlyingAsset, expiryTimestamp)

        if (underlyingPrice[0].toString() != '0') {
            let expiryPrice = await oracle.getExpiryPrice(pricerAsset, expiryTimestamp);
            let isLockingPeriodOver = await oracle.isLockingPeriodOver(pricerAsset, expiryTimestamp);

            if (expiryPrice[0].toString() == '0' && isLockingPeriodOver) {
                console.log('pushing yearn asset price')

                let tx = await pricer.setExpiryPriceInOracle(expiryTimestamp, {gasLimit: '1000000'});

                console.log('Tx hash: ', tx.hash);
            }
            else {
                console.log('Can\'t push price, already exist or locking period not over yet!');
            }
        }
        else {
            console.log('Underlying price not found in oracle!')
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
