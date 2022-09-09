require("dotenv").config()

// ## ARBITRUM RINKEBY:
// OpynController: '0x2acb561509a082bf2c58ce86cd30df6c2c2017f6'
// OpynAddressBook: '0x2d3E178FFd961BD8C0b035C926F9f2363a436DdC'
// OpynOracle: '0xe4d64aed5e76bCcE2C255f3c819f4C3817D42f19'
// OpynNewCalculator: '0xa91B46bDDB891fED2cEE626FB03E2929702951A6'
// OpynOptionRegistry: '0x217D9CD001CFBc9A8E1b812752b537556e073D4f'
// priceFeed: '0x27F70AC0453254B3CaA0A0400dB78387c474FAdD'
// volFeed: '0x05e8B7179c9674D6a12A4373b2dbd33E78302F90'
// optionProtocol: '0xf44a3def943c781543A7bC3Dd4127Ec435c1fd39'
// liquidityPool: '0x022601eB546e007562A6dD4AE4840544E6B85c9B'
// authority: '0x96AC14eE2CeEE2328f13B095A52613319d678Dd1'
// portfolioValuesFeed: '0x4D2f15471F0d60474d7B1953a27f2c9d642B91C1'
// optionHandler: '0x1c4dB5B6028EE95ad4E07cf83F3AcC797f478125'
// opynInteractions: '0x1dFB7feBe6f02B359bE5c718b4f14E92Eb3B1C8a'
// normDist: '0x77AD1298c2Cb0B48b1D8D817b3Fc6EAE9E9cecA8'
// BlackScholes: '0x8f4E5f0D5D8907c6A08527895B777BBc6b0bac48'
// optionsCompute: '0xed652E08488c0d02Ba8B108F5432Bee8F03fDcc9'
// accounting: '0x8DE2e57c48F7e6D12B4193311C2bC1d5e6C4C2bd'
// uniswapV3HedgingReactor: '0xaa5FcA49bd299E7A3fd1a4b0CB89039413D5580C'
// perpHedgingReactor: '0xaE5AFaA42aaeEFf8f603F897c583bd4D3e09355b'

const { ethers, BigNumber } = require("ethers")
const {
	DefenderRelaySigner,
	DefenderRelayProvider
} = require("defender-relay-client/lib/ethers")

const perpHedgingReactorAbi = require("./abi/PerpHedgingReactor.json")

// Entrypoint for the Autotask
// Function to keep track of all active Vault IDs and periodically check their collateral health factors and add/remove collateral as needed
exports.handler = async function (credentials) {
	// config
	const relayerAddress = "0x5da1a4e25daa5e786e34cf224d37990de1fd7f20"
	const perpHedgingReactorAddress = "0xed7a8131A77350967D0E0BF6290873F3f406567f"

	const minHealthFactor = 4000
	const maxHealthFactor = 6000

	// Initialize default provider and defender relayer signer
	const provider = new ethers.providers.JsonRpcProvider(
		"http://18.117.106.118:8547/"
		// "arbitrum-rinkeby"
	)
	const signer = new ethers.Wallet(
		process.env.TESTNET_DEPLOYER_ACCOUNT_PK,
		provider
	)
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
			gasLimit: "10000000"
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
			console.log("error hit")
			process.exit(1)
		})
}
