require("dotenv").config()

// ## ARBITRUM RINKEBY:
// OpynController: '0x2acb561509a082bf2c58ce86cd30df6c2c2017f6'
// OpynAddressBook: '0x2d3E178FFd961BD8C0b035C926F9f2363a436DdC'
// OpynOracle: '0xe4d64aed5e76bCcE2C255f3c819f4C3817D42f19'
// OpynNewCalculator: '0xa91B46bDDB891fED2cEE626FB03E2929702951A6'
// OpynOptionRegistry: '0xA6005cAcF024404d4335751d4dE8c23ff6EC5214'
// priceFeed: '0xDbBF84a29515C783Ea183f92120be7Aa9120fA23'
// volFeed: '0x41780543c3389040E0eb92B4FA2Cd049b712618B'
// optionProtocol: '0x68b60cD8800e7D6CaF0309Bdc03BD2ce966693D1'
// liquidityPool: '0xA7f49544f51f46E3bA2099A3aCad70502b8bc125'
// authority: '0xDc0B3DFe65947C39815DBDbFD53Eb377d9D87EC4'
// portfolioValuesFeed: '0x540932Ac16341384E273bDf888806F001003560B'
// optionHandler: '0xC50bC3833C744dC115c71D3754f2BB0dc1F392eD'
// opynInteractions: '0xBc5A1d61bA745275bdF3242EE231c9b8B1a99c0F'
// normDist: '0x94130623A0a3d2c88d5B1b4f6780FF8C5343Cb0F'
// BlackScholes: '0x152cA928CEc6357568e503632d83Aab066cC35d4'
// optionsCompute: '0xed652E08488c0d02Ba8B108F5432Bee8F03fDcc9'

const { ethers } = require("ethers")
const {
	DefenderRelaySigner,
	DefenderRelayProvider
} = require("defender-relay-client/lib/ethers")

const optionRegistryAbi = require("./abi/OptionRegistry.json")
const newConrollerAbi = require("./abi/NewController.json")
// will contain a list of active vault IDs. i.e vaults which are still open and not settled/expired
let arrayIds = []
// block of the last events query
// initially set to the block the optionRegistry was deployed at
let lastQueryBlock = 12621911
// vault count from the last time this function was called
let previousVaultCount = 0

// Entrypoint for the Autotask
exports.handler = async function (credentials) {
	// config
	const relayerAddress = "0x06f4e3d50d16511740f742f7c5dc3ceca93d81f0" // Relayer address - updated
	const optionRegistryAddress = "0xA6005cAcF024404d4335751d4dE8c23ff6EC5214"
	const controllerAddress = "0x2acb561509a082bf2c58ce86cd30df6c2c2017f6"

	// Initialize default provider and defender relayer signer
	const provider = new DefenderRelayProvider(credentials)
	const signer = new DefenderRelaySigner(credentials, provider, {
		speed: "fast",
		from: relayerAddress
	})

	// option registry instance
	const optionRegistry = new ethers.Contract(
		optionRegistryAddress,
		optionRegistryAbi,
		signer
	)

	// Opyn controller instance
	const controller = new ethers.Contract(
		controllerAddress,
		newConrollerAbi,
		signer
	)

	const currentBlock = await provider.getBlockNumber()
	const events = await controller.queryFilter(
		controller.filters.VaultSettled(),
		lastQueryBlock
	)
	lastQueryBlock = currentBlock
	const settledEventIds = events
		.filter(event => event?.args?.accountOwner == optionRegistryAddress)
		.map(event => event?.args?.vaultId.toNumber())
	console.log({ settledEventIds })

	// check how many vaults exist
	const vaultCount = (await optionRegistry.vaultCount()).toNumber()
	console.log("vault count:", vaultCount)
	// create an array of new vault ids
	const additionalVaultIds = Array.from(Array(vaultCount + 1).keys()).slice(
		previousVaultCount + 1
	)
	console.log({ additionalVaultIds })
	arrayIds.push(...additionalVaultIds)
	previousVaultCount = vaultCount

	// remove arrayids which appear in settledEventIds
	arrayIds = arrayIds.filter(id => !settledEventIds.includes(id))
	console.log({ arrayIds })

	// iterate over vaults and check health. adjust if needed
	if (arrayIds.length) {
		for (let i = 0; i <= arrayIds.length - 1; i++) {
			try {
				const [
					isBelowMin,
					isAboveMax,
					healthFactor,
					collatRequired,
					collatAsset
				] = await optionRegistry.checkVaultHealth(arrayIds[i])

				console.log({
					arrayId: arrayIds[i],
					isBelowMin,
					isAboveMax,
					healthFactor: healthFactor.toNumber(),
					collatRequired: collatRequired.toNumber(),
					collatAsset
				})
				if (isBelowMin || isAboveMax) {
					await optionRegistry.adjustCollateral(arrayIds[i], {
						gasLimit: 100000000
					})
				}
			} catch (err) {
				console.error(err)
			}
		}
	}
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
