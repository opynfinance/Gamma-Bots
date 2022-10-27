require("dotenv").config()
const { ethers } = require("ethers")

const optionRegistryAbi = require("../abi/OptionRegistry.json")
const newControllerAbi = require("../abi/NewController.json")

const vaultCollateralManagerLogic = async (
	testnet,
	provider,
	signer,
	store,
	optionRegistryAddress,
	controllerAddress,
	optionRegistryDeployBlock
) => {
	// the block number on which this function was last called
	let lastQueryBlock
	// an array of vaultIDs which need their health factor checking
	let activeVaultIds
	// the vaultCount for the option registry on the last function call
	let previousVaultCount
	// multiple of upperHeathFactor above which extra collateral is removed
	const upperhealthFactorBuffer = 1.01
	try {
		// get persistant variables from store
		lastQueryBlock = parseInt(
			await store.get("mainnetCollateralThresholdLastQueryBlock")
		)
		activeVaultIds = JSON.parse(await store.get("mainnetActiveVaultIds"))
		previousVaultCount = parseInt(await store.get("mainnetPreviousVaultCount"))
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
	let settleEvents = []
	let liquidationEvents = []
	// 10000 block range is max limit for queries for some providers
	// if this is true something has probably gone wrong
	if (currentBlock > lastQueryBlock + 100000) {
		for (let i = lastQueryBlock; i <= currentBlock; i = i + 100000) {
			// iterate over 10000 batches of blocks to catch up to currentBlock
			// find instances of settled vaults since the last query
			const settleEventsBatch = await controller.queryFilter(
				controller.filters.VaultSettled(),
				i,
				i + 99999
			)
			// find instances of liquidated vaults since the last query
			const liquidationEventsBatch = await controller.queryFilter(
				controller.filters.VaultLiquidated(),
				i,
				i + 99999
			)
			if (settleEventsBatch.length) {
				settleEvents.push(settleEventsBatch)
			}
			if (liquidationEventsBatch.length) {
				liquidationEvents.push(liquidationEventsBatch)
			}
		}
	} else {
		settleEvents = await controller.queryFilter(
			controller.filters.VaultSettled(),
			lastQueryBlock
		)
		liquidationEvents = await controller.queryFilter(
			controller.filters.VaultLiquidated(),
			lastQueryBlock
		)
	}
	console.log({ settleEvents, liquidationEvents })

	// set last query block to current block value
	await store.put(
		"mainnetCollateralThresholdLastQueryBlock",
		currentBlock.toString()
	)
	// return vault IDs of settled vault events where the vault owner is the option registry
	let settledEventIds = []
	if (settleEvents.length) {
		settledEventIds = settleEvents
			.filter(event => event?.args?.accountOwner == optionRegistryAddress)
			.map(event => event?.args?.vaultId.toNumber())
	}
	if (liquidationEvents.length) {
		settledEventIds.push(
			liquidationEvents
				.filter(event => event?.args?.vaultOwner == optionRegistryAddress)
				.map(event => event?.args?.vaultId.toNumber())
		)
	}
	console.log({ settledEventIds })
	// check how many vaults have ever existed
	const vaultCount = (await optionRegistry.vaultCount()).toNumber()
	console.log("vault count:", vaultCount)

	// create an array of vault IDs that have been created since last execution
	const additionalVaultIds = Array.from(Array(vaultCount + 1).keys()).slice(
		previousVaultCount + 1
	)
	console.log({ additionalVaultIds })
	// update previousVaultCount in storage
	await store.put("mainnetPreviousVaultCount", vaultCount.toString())
	// add newly created vault IDs to existing array of active vault IDs
	activeVaultIds.push(...additionalVaultIds)
	// remove activeVaultIds which appear in settledEventIds
	activeVaultIds = activeVaultIds.filter(id => !settledEventIds.includes(id))
	// update activeVaultIDs in storage
	await store.put("mainnetActiveVaultIds", JSON.stringify(activeVaultIds))
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
					console.log("adjust collateral")
					const tx = await optionRegistry.adjustCollateral(activeVaultIds[i], {
						gasLimit: "1000000"
					})

					await tx.wait()
				}
			} catch (err) {
				console.error("error!:", err)
			}
		}
	}
}

module.exports = vaultCollateralManagerLogic
