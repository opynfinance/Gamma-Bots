require('dotenv').config()
const { ethers, BigNumber } = require('ethers')
const {
	DefenderRelaySigner,
	DefenderRelayProvider
} = require('defender-relay-client/lib/ethers')

const perpHedgingReactorAbi = require('./abi/PerpHedgingReactor.json')

// Entrypoint for the Autotask
// Function to keep track of all active Vault IDs and periodically check their collateral health factors and add/remove collateral as needed
exports.handler = async function (credentials) {
	// config
	const relayerAddress = '0x4a3865707b58580bd8c859d606fed02a0c3dec4a'
	const perpHedgingReactorAddress = '0xDd418b4Ec8396191D08957bD42F549e215B8e89a'

	const minHealthFactor = 4000
	const maxHealthFactor = 6000

	// Initialize default provider and defender relayer signer
	const provider = new DefenderRelayProvider(credentials)
	const signer = new DefenderRelaySigner(credentials, provider, {
		speed: 'fast',
		from: relayerAddress
	})

	console.log({ signer })

	const perpHedgingReactor = new ethers.Contract(
		perpHedgingReactorAddress,
		perpHedgingReactorAbi,
		signer
	)

	const [isBelowMin, isAboveMax, healthFactor, collateralToTransfer] =
		await perpHedgingReactor.checkVaultHealth()

	if (healthFactor < minHealthFactor || healthFactor > maxHealthFactor) {
		const tx = await perpHedgingReactor.syncAndUpdate({
			gasLimit: '10000000'
		})
		await tx.wait()
	}

	console.log({
		isBelowMin,
		isAboveMax,
		healthFactor: healthFactor.toNumber(),
		collateralToTransfer: collateralToTransfer.toNumber()
	})
}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
	const {
		PERP_REACTOR_MARGIN_BOT_API_KEY: apiKey,
		PERP_REACTOR_MARGIN_BOT_SECRET: apiSecret
	} = process.env
	exports
		.handler({ apiKey, apiSecret })
		.then(() => process.exit(0))
		.catch(error => {
			console.error(error)
			console.log('error hit')
			process.exit(1)
		})
}
