require("dotenv").config()
const { ethers } = require("ethers")

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
	const relayerAddress = "0xf308f68a42eb577133df915d995dd8c0aee97b42"
	const optionRegistryAddress = "0x04706DE6cE851a284b569EBaE2e258225D952368"
	const controllerAddress = "0x594bD4eC29F7900AE29549c140Ac53b5240d4019"
	// block that the option regsitry was deployed on
	const optionRegistryDeployBlock = 25976032

	// Initialize default provider and defender relayer signer

	const provider = new DefenderRelayProvider(credentials)
	const signer = new DefenderRelaySigner(credentials, provider, {
		speed: "fast",
		from: relayerAddress
	})

	return vaultCollateralManagerLogic(
		false,
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
		VAULT_THRESHOLD_BOT_API_KEY: apiKey,
		VAULT_THRESHOLD_BOT_API_SECRET: apiSecret
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
