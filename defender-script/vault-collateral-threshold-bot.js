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
const { KeyValueStoreClient } = require("defender-kvstore-client")

const optionRegistryAbi = require("./abi/OptionRegistry.json")
const newControllerAbi = require("./abi/NewController.json")

// block that the option regsitry was deployed on
const optionRegistryDeployBlock = 12621911

// Entrypoint for the Autotask
// Function to keep track of all active Vault IDs and periodically check their collateral health factors and add/remove collateral as needed
exports.handler = async function (credentials) {
	const store = new KeyValueStoreClient({ path: "./store.json" })
	// config
	const relayerAddress = "0x8a8b3efb77c973f54f7b072cff3bd47240aac605" // updated
	const optionRegistryAddress = "0xA6005cAcF024404d4335751d4dE8c23ff6EC5214"
	const controllerAddress = "0x2acb561509a082bf2c58ce86cd30df6c2c2017f6"

	// Initialize default provider and defender relayer signer
	const provider = new DefenderRelayProvider(credentials)
	const signer = new DefenderRelaySigner(credentials, provider, {
		speed: "fast",
		from: relayerAddress
	})
	// the block number on which this function was last called
	let lastQueryBlock
	// an array of vaultIDs which need their health factor checking
	let activeVaultIds
	// the vaultCount for the option registry on the last function call
	let previousVaultCount
	try {
		// get persistant variables from store
		lastQueryBlock = parseInt(
			await store.get("collateralThresholdLastQueryBlock")
		)
		activeVaultIds = JSON.parse(await store.get("activeVaultIds"))
		previousVaultCount = parseInt(await store.get("previousVaultCount"))
		console.log({ lastQueryBlock, activeVaultIds, previousVaultCount })
	} catch (err) {
		console.log("error retrieving data from store")
	}
	// if these are undefined, it must be the first function call or the data is corrupted so build from scratch
	if (!activeVaultIds || !lastQueryBlock || !previousVaultCount) {
		activeVaultIds = []
		lastQueryBlock = optionRegistryDeployBlock
		previousVaultCount = 0
	}
	// option registry instance
	const optionRegistry = new ethers.Contract(
		optionRegistryAddress,
		optionRegistryAbi,
		signer
	)

	// Opyn controller instance
	const controller = new ethers.Contract(
		controllerAddress,
		newControllerAbi,
		signer
	)

	const currentBlock = await provider.getBlockNumber()
	// will contain emitted SettledVault events since the previous function execution
	let events = []
	// 10000 block range is max limit for queries for some providers
	// if this is true something has probably gone wrong
	if (currentBlock > lastQueryBlock + 10000) {
		for (let i = lastQueryBlock; i <= currentBlock; i = i + 10000) {
			// iterate over 10000 batches of blocks to catch up to currentBlock
			const newEvents = await controller.queryFilter(
				controller.filters.VaultSettled(),
				i,
				i + 9999
			)

			console.log({ newEvents })
			if (newEvents.length) {
				events.push(newEvents)
			}
		}
	} else {
		events = await controller.queryFilter(
			controller.filters.VaultSettled(),
			lastQueryBlock
		)
	}
	console.log({ events })
	// set last query block to current block value
	await store.put("collateralThresholdLastQueryBlock", currentBlock.toString())
	// return vault IDs of settled vault events where the vault owner is the option registry
	let settledEventIds = []
	if (events.length) {
		settledEventIds = events
			.filter(event => event?.args?.accountOwner == optionRegistryAddress)
			.map(event => event?.args?.vaultId.toNumber())
		console.log({ settledEventIds })
	}
	// check how many vaults have ever existed
	const vaultCount = (await optionRegistry.vaultCount()).toNumber()
	console.log("vault count:", vaultCount)

	// create an array of vault IDs that have been created since last execution
	const additionalVaultIds = Array.from(Array(vaultCount + 1).keys()).slice(
		previousVaultCount + 1
	)
	console.log({ additionalVaultIds })
	// update previousVaultCount in storage
	await store.put("previousVaultCount", vaultCount.toString())
	// add newly created vault IDs to existing array of active vault IDs
	activeVaultIds.push(...additionalVaultIds)
	// remove activeVaultIds which appear in settledEventIds
	activeVaultIds = activeVaultIds.filter(id => !settledEventIds.includes(id))
	// update activeVaultIDs in storage
	await store.put("activeVaultIds", JSON.stringify(activeVaultIds))
	console.log({ activeVaultIds })

	// iterate over vaults and check health. adjust if needed
	if (activeVaultIds.length) {
		for (let i = 0; i <= activeVaultIds.length - 1; i++) {
			try {
				const [
					isBelowMin,
					isAboveMax,
					healthFactor,
					collatRequired,
					collatAsset
				] = await optionRegistry.checkVaultHealth(activeVaultIds[i])

				console.log({
					arrayId: activeVaultIds[i],
					isBelowMin,
					isAboveMax,
					healthFactor: healthFactor.toNumber(),
					collatRequired: collatRequired.toNumber(),
					collatAsset
				})
				if (isBelowMin || isAboveMax) {
					await optionRegistry.adjustCollateral(activeVaultIds[i], {
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
