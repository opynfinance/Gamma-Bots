require('dotenv').config();

// ## ARBITRUM RINKEBY:

// OpynController: '0xb2923CAbbC7dd78e9573D1D6d755E75dCB49CE47',
// OpynAddressBook: '0x2d3E178FFd961BD8C0b035C926F9f2363a436DdC',
// OpynOracle: '0xe4d64aed5e76bCcE2C255f3c819f4C3817D42f19',
// OpynNewCalculator: '0xa91B46bDDB891fED2cEE626FB03E2929702951A6',
// OpynOptionRegistry: '0x6973D330375D2423831FE551865E78d434fb861E',
// priceFeed: '0x3F438709DEF8E2Bd9E4Af59179949851B510ddD8',
// volFeed: '0xC1338Aae110fcFfbDA03bc3B433372F4eE1Bd17E',
// optionProtocol: '0xa0b2b6b8959AdfD00531FcA4D9C54703e981efB8',
// liquidityPool: '0x43A57D321fC8ED34F7C2DADf5ca9E21B0ce6B742',
// authority: '0xa5AD6fE9C808f3961EA8821B541Eb948776cC567'


const { ethers } = require("ethers");
const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');
// const BigNumber = require('bignumber.js');

const AddressBookAbi = require('./abi/AddressBook.json');
const OtokenFactory = require('./abi/OtokenFactory.json');
const OracleAbi = require('./abi/Oracle.json');
const ChainlinkPricerAbi = require('./abi/ChainLinkPricer.json');
const AggregatorInterfaceAbi = require('./abi/AggregatorInterface.json');
const OtokenAbi = require('./abi/Otoken.json');
const OptionRegistryAbi = require("./abi/OptionRegistry.json");

// Entrypoint for the Autotask
exports.handler = async function(credentials) {
    // config
    const relayerAddress = '0x06f4e3d50d16511740f742f7c5dc3ceca93d81f0';                    // Relayer address - updated
    const addressbookAddress = '0x2d3E178FFd961BD8C0b035C926F9f2363a436DdC';                // AddressBook module
    const pricerAddress = '0xFfe61399050D2ACABa00419248B8616A4Bf56F9E';                     // WETH pricer
    const pricerAsset = '0xE32513090f05ED2eE5F3c5819C9Cce6d020Fefe7';                       // WETH address
    const chainlinkAggregatorAddress = '0x5f0423B1a6935dc5596e7A24d98532b67A0AeFd8';        // Chainlink price feed
    const optionRegistryAddress = '0x6973D330375D2423831FE551865E78d434fb861E';

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
    // option registry instance
    const optionRegistry = new ethers.Contract(optionRegistryAddress, OptionRegistryAbi, signer)

    console.log('Oracle: ', oracle.address);
    console.log('Pricer: ', pricer.address);
    console.log('Pricer asset: ', pricerAsset);
    console.log('Chainlink aggregator: ', chainlinkAggregator.address);
    console.log("Option registry address: ", optionRegistry.address)

    const vaultCount = await optionRegistry.vaultCount()
    console.log("vault count:", vaultCount)
    for (let i=0; i <= vaultCount; i++){
        const [isBelowMin, isAboveMax, healthFactor, collatRequired, collatAsset] = await optionRegistry.checkVaultHealth(1)
        console.log({isBelowMin, isAboveMax, healthFactor, collatRequired, collatAsset})
    }


}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
    const { VAULT_THRESHOLD_BOT_API_KEY: apiKey, VAULT_THRESHOLD_BOT_API_SECRET: apiSecret } = process.env;
    exports.handler({ apiKey, apiSecret })
        .then(() => process.exit(0))
        .catch(error => { console.error(error); process.exit(1); });
}
