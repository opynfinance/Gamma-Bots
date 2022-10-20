require("dotenv").config()
const {
	DefenderRelaySigner,
	DefenderRelayProvider
} = require("defender-relay-client/lib/ethers")
const { KeyValueStoreClient } = require("defender-kvstore-client")
const vaultCollateralManagerLogic = require("../../core-logic/vault-collateral-manager")

// Entrypoint for the Autotask
// Function to keep track of all active Vault IDs and periodically check their collateral health factors and add/remove collateral as needed
exports.handler = async function (credentials) {
	const store = new KeyValueStoreClient({ path: "./store.json" })
	// config
	const relayerAddress = "0x8a8b3efb77c973f54f7b072cff3bd47240aac605"
	const optionRegistryAddress = "0x217D9CD001CFBc9A8E1b812752b537556e073D4f"
	const controllerAddress = "0x2acb561509a082bf2c58ce86cd30df6c2c2017f6"
	// block that the option regsitry was deployed on
	const optionRegistryDeployBlock = 14157522

	let provider
	let signer
	// Initialize default provider and defender relayer signer

	provider = new DefenderRelayProvider(credentials)
	signer = new DefenderRelaySigner(credentials, provider, {
		speed: "fast",
		from: relayerAddress
	})

	return vaultCollateralManagerLogic(
		true,
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
	const {
		VAULT_COLLAT_MANAGER_BOT_TESTNET_API_KEY: apiKey,
		VAULT_COLLAT_MANAGER_BOT_TESTNET_API_SECRET: apiSecret
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
