require("dotenv").config()

const {
    DefenderRelaySigner,
    DefenderRelayProvider
} = require("defender-relay-client/lib/ethers")
const settlerLogic = require("../../core-logic/settler")
// Entrypoint for the Autotask
exports.handler = async function (credentials) {
    // config
    const relayerAddress = "0xada6667926b8a600576637f7ec7957ab05b99be7" // Relayer address
    const optionRegistryAddress = "0x04706DE6cE851a284b569EBaE2e258225D952368"
    const controllerAddress = "0x594bD4eC29F7900AE29549c140Ac53b5240d4019"
    const liquidityPoolAddress = "0xC10B976C671Ce9bFf0723611F01422ACbAe100A5"
    const pvfeedAddress = "0x14eF340B33bD4f64C160E3bfcD2B84D67E9b33dF"

    // Initialize default provider and defender relayer signer
    const provider = new DefenderRelayProvider(credentials)
    const signer = new DefenderRelaySigner(credentials, provider, {
        speed: "fast",
        from: relayerAddress
    })
    return settlerLogic(
        signer,
        optionRegistryAddress,
        controllerAddress,
        liquidityPoolAddress,
        pvfeedAddress
    )
}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
    const {
        SETTLER_BOT_MAINNET_API_KEY: apiKey,
        SETTLER_BOT_MAINNET_API_SECRET: apiSecret
    } = process.env
    exports
        .handler({ apiKey, apiSecret })
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error)
            process.exit(1)
        })
}
