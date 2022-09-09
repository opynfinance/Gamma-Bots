require("dotenv").config()

// ## ARBITRUM RINKEBY:
// OpynController: '0x2acb561509a082bf2c58ce86cd30df6c2c2017f6'
// OpynAddressBook: '0x2d3E178FFd961BD8C0b035C926F9f2363a436DdC'
// OpynOracle: '0xe4d64aed5e76bCcE2C255f3c819f4C3817D42f19'
// OpynNewCalculator: '0xa91B46bDDB891fED2cEE626FB03E2929702951A6'
// OpynOptionRegistry: '0x051B162A50Fb91A52bBC8D80A2c9A6918A5e2fd4'
// priceFeed: '0x6b133054A1143E2B1bCA3adDE9558bFa02D48E7E'
// volFeed: '0x1ce8E39E6E02A1FedA7a1246a2470B2d224602B9'
// optionProtocol: '0xb4A0CB2A21384CA1084D1488839700Db5574cd60'
// liquidityPool: '0xd2327FbE765C298C54Fe7791B932465b288bADab'
// authority: '0x52ebde684A8d4659B0981965ec60Ef6b73eaA82f'
// portfolioValuesFeed: '0xa1d80cd1B471DD54c4eD657987Eeed45fd120EC7'
// optionHandler: '0x6508A9d3dcedDe32c7e34Daab2aD7AEc3292A792'
// opynInteractions: '0x4c2876B63e622A99195087a63ABA8aac46Cebed8'
// normDist: '0x6219Fa7d61A8D1229825dcc81a93447228Ca80B9'
// BlackScholes: '0x79027A9cA9a7aeD46B448117D8c3e3483a0A6182'
// optionsCompute: '0x2BA8E86C6f281C253461B638d5FC7d021cc26616'

const { ethers } = require("ethers")
const {
	DefenderRelaySigner,
	DefenderRelayProvider
} = require("defender-relay-client/lib/ethers")
const { KeyValueStoreClient } = require("defender-kvstore-client")

const optionRegistryAbi = require("./abi/OptionRegistry.json")
const newControllerAbi = require("./abi/NewController.json")

// block that the option regsitry was deployed on
const optionRegistryDeployBlock = 13730032

// Entrypoint for the Autotask
// Function to keep track of all active Vault IDs and periodically check their collateral health factors and add/remove collateral as needed
exports.handler = async function (credentials) {
	const store = new KeyValueStoreClient({ path: "./store.json" })
	// config
	const relayerAddress = "0x8a8b3efb77c973f54f7b072cff3bd47240aac605" // updated
	const optionRegistryAddress = "0x217D9CD001CFBc9A8E1b812752b537556e073D4f"
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
	// multiple of upperHeathFactor above which extra collateral is removed
	const upperhealthFactorBuffer = 1.1
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
		console.log(err)
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
					upperHealthFactor,
					collatRequired,
					collatAsset
				] = await optionRegistry.checkVaultHealth(activeVaultIds[i])

				console.log({
					arrayId: activeVaultIds[i],
					isBelowMin,
					isAboveMax,
					healthFactor: healthFactor.toNumber(),
					upperHealthFactor: upperHealthFactor.toNumber(),
					collatRequired: parseInt(collatRequired, 16),
					collatAsset
				})
				if (
					isBelowMin ||
					(isAboveMax &&
						healthFactor > upperhealthFactorBuffer * upperHealthFactor)
				) {
					const tx = await optionRegistry.adjustCollateral(activeVaultIds[i], {
						gasLimit: 100000000
					})

					await tx.wait()
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
