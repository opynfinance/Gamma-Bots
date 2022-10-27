require("dotenv").config()
const { ethers } = require("ethers")
const chainlinkPricerLogic = require("../../core-logic/chainlink-pricer")

// Entrypoint for the Autotask
exports.handler = async function () {
	// config
	const addressbookAddress = "0xCa19F26c52b11186B4b1e76a662a14DA5149EA5a" // AddressBook module
	const pricerAddress = "0x6a1F5eF89Bd6CB297BeDEEEbff3308d240dBa99E" // WETH pricer
	const pricerAsset = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" // WETH address
	const chainlinkAggregatorAddress =
		"0x639fe6ab55c921f74e7fac1ee960c0b6293ba612" // Chainlink price feed

	// Initialize default provider and defender relayer signer
	const provider = new ethers.providers.JsonRpcProvider(
		process.env.ALCHEMY_RPC_ENDPOINT
	)
	const signer = new ethers.Wallet(
		process.env.REDUNDANT_PRICER_BOT_PK,
		provider
	)
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
	exports
		.handler()
		.then(() => process.exit(0))
		.catch(error => {
			console.error(error)
			process.exit(1)
		})
}
