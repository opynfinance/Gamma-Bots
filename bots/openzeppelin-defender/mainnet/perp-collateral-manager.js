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
	const relayerAddress = "0x4a3865707b58580bd8c859d606fed02a0c3dec4a"
	const perpHedgingReactorAddress = "0xDd418b4Ec8396191D08957bD42F549e215B8e89a"

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
		PERP_COLLAT_MANAGER_BOT_MAINNET_API_KEY: apiKey,
		PERP_COLLAT_MANAGER_BOT_MAINNET_SECRET: apiSecret
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
