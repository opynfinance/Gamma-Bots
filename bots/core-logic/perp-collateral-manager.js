require("dotenv").config()
const { ethers } = require("ethers")

const perpHedgingReactorAbi = require("../abi/PerpHedgingReactor.json")

const perpCollateralManagerLogic = async (
	signer,
	perpHedgingReactorAddress
) => {
	const perpHedgingReactor = new ethers.Contract(
		perpHedgingReactorAddress,
		perpHedgingReactorAbi,
		signer
	)

	const minHealthFactor = 4000
	const maxHealthFactor = 6000

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

module.exports = perpCollateralManagerLogic
