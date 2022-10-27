require('dotenv').config()

const {
	DefenderRelaySigner,
	DefenderRelayProvider
} = require('defender-relay-client/lib/ethers')
const chainlinkPricerLogic = require('../../core-logic/chainlink-pricer')

// Entrypoint for the Autotask
exports.handler = async function (credentials) {
	// config
	const relayerAddress = '0xa7d48256291bcd02656b05e7d38bd5cb617edb29' // Relayer address
	const addressbookAddress = '0xd6e67bF0b1Cdb34C37f31A2652812CB30746a94A' // AddressBook module
	const pricerAddress = '0x7140E3089ec5d5EF0187BdEd69a5b0333d608fDF' // WETH pricer
	const pricerAsset = '0x53320bE2A35649E9B2a0f244f9E9474929d3B699' // WETH address
	const chainlinkAggregatorAddress =
		'0x62CAe0FA2da220f43a51F86Db2EDb36DcA9A5A08' // Chainlink price feed

	// Initialize default provider and defender relayer signer
	const provider = new DefenderRelayProvider(credentials)
	const signer = new DefenderRelaySigner(credentials, provider, {
		speed: 'fast',
		from: relayerAddress
	})
	return chainlinkPricerLogic(
		signer,
		addressbookAddress,
		pricerAddress,
		pricerAsset,
		chainlinkAggregatorAddress
	)
}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
	const {
		PRICER_BOT_TESTNET_API_KEY: apiKey,
		PRICER_BOT_TESTNET_API_SECRET: apiSecret
	} = process.env
	exports
		.handler({
			apiKey,
			apiSecret
		})
		.then(() => process.exit(0))
		.catch(error => {
			console.error(error)
			process.exit(1)
		})
}
