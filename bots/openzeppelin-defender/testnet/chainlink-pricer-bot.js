require("dotenv").config()

const {
	DefenderRelaySigner,
	DefenderRelayProvider
} = require("defender-relay-client/lib/ethers")
const chainlinkPricerLogic = require("../../core-logic/chainlink-pricer")

// Entrypoint for the Autotask
exports.handler = async function (credentials) {
	// config
	const relayerAddress = "0xed7fe78d227b308768c64c409aee0b3ada79c686" // Relayer address
	const addressbookAddress = "0x2d3E178FFd961BD8C0b035C926F9f2363a436DdC" // AddressBook module
	const pricerAddress = "0x3c1b4C64010b10C66fc41e548C4C9A334DE2D5a5" // WETH pricer
	const pricerAsset = "0xFCfbfcC11d12bCf816415794E5dc1BBcc5304e01" // WETH address
	const chainlinkAggregatorAddress =
		"0x5f0423B1a6935dc5596e7A24d98532b67A0AeFd8" // Chainlink price feed

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
		PRICER_BOT_TESTNET_API_KEY: apiKey,
		PRICER_BOT_TESTNET_API_SECRET: apiSecret
	} = process.env
	exports
		.handler({ apiKey, apiSecret })
		.then(() => process.exit(0))
		.catch(error => {
			console.error(error)
			process.exit(1)
		})
}
