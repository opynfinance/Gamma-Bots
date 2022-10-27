require("dotenv").config()
const {
	DefenderRelaySigner,
	DefenderRelayProvider
} = require("defender-relay-client/lib/ethers")
const { KeyValueStoreClient } = require("defender-kvstore-client")
const vaultCollateralManagerLogic = require("../../core-logic/vault-collateral-manager")

// Entrypoint for the Autotask
// Function to keep track of all active Vault IDs and periodically check their collateral health factors and add/remove collateral as needed
exports.handler = async function () {
	const store = new KeyValueStoreClient({ path: "./store.json" })
	// config
	const optionRegistryAddress = "0x217D9CD001CFBc9A8E1b812752b537556e073D4f"
	const controllerAddress = "0x2acb561509a082bf2c58ce86cd30df6c2c2017f6"
	// block that the option regsitry was deployed on
	const optionRegistryDeployBlock = 14157522

	// Initialize default provider and defender relayer signer
	const provider = new ethers.providers.JsonRpcProvider(
		process.env.ALCHEMY_RPC_ENDPOINT
	)
	const signer = new ethers.Wallet(
		process.env.REDUNDANT_VAULT_COLLAT_BOT_PK,
		provider
	)

	return vaultCollateralManagerLogic(
		provider,
		signer,
		store,
		optionRegistryAddress,
		controllerAddress,
		optionRegistryDeployBlock
	)
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
