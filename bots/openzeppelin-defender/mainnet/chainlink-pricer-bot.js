require("dotenv").config()

const {
	DefenderRelaySigner,
	DefenderRelayProvider
} = require("defender-relay-client/lib/ethers")
const chainlinkPricerLogic = require("../../core-logic/chainlink-pricer")

// Entrypoint for the Autotask
exports.handler = async function (credentials) {
	// config
	const relayerAddress = "0x2ce708d31669d3a53f07786d6e06659891100d3f" // Relayer address
	const addressbookAddress = "0xCa19F26c52b11186B4b1e76a662a14DA5149EA5a" // AddressBook module
	const pricerAddress = "0x6a1F5eF89Bd6CB297BeDEEEbff3308d240dBa99E" // WETH pricer
	const pricerAsset = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" // WETH address
	const chainlinkAggregatorAddress =
		"0x639fe6ab55c921f74e7fac1ee960c0b6293ba612" // Chainlink price feed

	// Initialize default provider and defender relayer signer
	const provider = new DefenderRelayProvider(credentials)
	const signer = new DefenderRelaySigner(credentials, provider, {
		speed: "fast",
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
		PRICER_BOT_MAINNET_API_KEY: apiKey,
		PRICER_BOT_MAINNET_API_SECRET: apiSecret
	} = process.env
	exports
		.handler({ apiKey, apiSecret })
		.then(() => process.exit(0))
		.catch(error => {
			console.error(error)
			process.exit(1)
		})
}
