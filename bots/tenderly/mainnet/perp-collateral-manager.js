require("dotenv").config()
const { ethers } = require("ethers")
const perpCollateralManagerLogic = require("../../core-logic/perp-collateral-manager")

// Entrypoint for the Autotask
// Function to keep track of all active Vault IDs and periodically check their collateral health factors and add/remove collateral as needed
exports.handler = async function () {
	// config
	const perpHedgingReactorAddress = "0xDd418b4Ec8396191D08957bD42F549e215B8e89a"

	// Initialize default provider and defender relayer signer
	const provider = new ethers.providers.JsonRpcProvider(
		process.env.ALCHEMY_RPC_ENDPOINT
	)
	const signer = new ethers.Wallet(
		process.env.REDUNDANT_PERP_COLLAT_BOT_PK,
		provider
	)

	return perpCollateralManagerLogic(signer, perpHedgingReactorAddress)
}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
	exports
		.handler()
		.then(() => process.exit(0))
		.catch(error => {
			console.error(error)
			console.log("error hit")
			process.exit(1)
		})
}
