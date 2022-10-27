require("dotenv").config()

const {
    DefenderRelaySigner,
    DefenderRelayProvider
} = require("defender-relay-client/lib/ethers")
const deltaHedgerLogic = require("../../core-logic/delta-hedger")
const { KeyValueStoreClient } = require("defender-kvstore-client")
// Entrypoint for the Autotask
exports.handler = async function (credentials) {
    const store = new KeyValueStoreClient({ path: "./store.json" })
    // config
    const relayerAddress = "0xada6667926b8a600576637f7ec7957ab05b99be7" // Relayer address
    const managerAddress = "0xAdDE1FbBac16EA891622E6e3814eE34cA86C10B0" // Manager module
    const oracleAddress = "0xBA1880CFFE38DD13771CB03De896460baf7dA1E7"
    const pricerAsset = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" // WETH address

    // Initialize default provider and defender relayer signer
    const provider = new DefenderRelayProvider(credentials)
    const signer = new DefenderRelaySigner(credentials, provider, {
        speed: "fast",
        from: relayerAddress
    })
    return deltaHedgerLogic(
        signer,
        oracleAddress,
        managerAddress,
        pricerAsset,
        store
    )
}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
    const {
        DELTA_BOT_MAINNET_API_KEY: apiKey,
        DELTA_BOT_MAINNET_API_SECRET: apiSecret
    } = process.env
    exports
        .handler({ apiKey, apiSecret })
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error)
            process.exit(1)
        })
}
