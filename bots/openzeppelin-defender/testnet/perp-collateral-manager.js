require("dotenv").config()
const { ethers } = require("ethers")
const {
	DefenderRelaySigner,
	DefenderRelayProvider
} = require("defender-relay-client/lib/ethers")
const perpCollateralManagerLogic = require("../../core-logic/perp-collateral-manager")

// Entrypoint for the Autotask
// Function to keep track of all active Vault IDs and periodically check their collateral health factors and add/remove collateral as needed
exports.handler = async function (credentials) {
	// config
	const relayerAddress = "" // no perp relayer address created.
	const perpHedgingReactorAddress = "0xed7a8131A77350967D0E0BF6290873F3f406567f"

	// Initialize default provider and defender relayer signer
	const provider = new DefenderRelayProvider(credentials)
	const signer = new DefenderRelaySigner(credentials, provider, {
		speed: "fast",
		from: relayerAddress
	})

	return perpCollateralManagerLogic(signer, perpHedgingReactorAddress)
}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
	const {
		PERP_COLLAT_MANAGER_BOT_TESTNET_API_KEY: apiKey, // doesnt exist
		PERP_COLLAT_MANAGER_BOT_TESTNET_SECRET: apiSecret // doesnt exist
	} = process.env
	exports
		.handler({ apiKey, apiSecret })
		.then(() => process.exit(0))
		.catch(error => {
			console.error(error)
			console.log("error hit")
			process.exit(1)
		})
}
