const { ethers } = require('ethers')

const newControllerAbi = require("../abi/NewController.json")
const optionRegistryAbi = require("../abi/OptionRegistry.json")
const liquidityPoolAbi = require("../abi/LiquidityPool.json")
const pvFeedAbi = require("../abi/PvFeed.json")


const settlerLogic = async (
    signer,
    optionRegistryAddress,
    controllerAddress,
    liquidityPoolAddress,
    pvfeedAddress
) => {
    // oracle instance
    const liquidityPool = new ethers.Contract(liquidityPoolAddress, liquidityPoolAbi, signer)
    // option registry instance
    const optionRegistry = new ethers.Contract(optionRegistryAddress, optionRegistryAbi, signer)
    // controller instance
    const controller = new ethers.Contract(controllerAddress, newControllerAbi, signer)
    // pvfeed instance
    const pvfeed = new ethers.Contract(pvfeedAddress, pvFeedAbi, signer)
    // Otoken expiry hour in UTC
    const expiryHour = 8
    // current timestamp in UTC seconds
    let currentTimestamp = new Date()
    const hour = currentTimestamp.getHours()
    currentTimestamp = Math.floor(currentTimestamp.getTime() / 1000)
    if (hour == expiryHour) {
        const series = await pvfeed.getAddressSet()

        for (let i = 0; i < series.length(); i++) {
            const vaultId = await optionRegistry.vaultIds(series[i])
            const vault = await controller.getVault(optionRegistryAddress, vaultId)
            if ((await controller.isSettlementAllowed(series[i])) && vault.shortAmounts[0] > 0) {
                let tx = await liquidityPool.settleVault(
                    series[i],
                    { gasLimit: '10000000' }
                )
                console.log('Tx hash: ', tx.hash)
            } else {
                console.log("Vault already settled")
            }
        }
    }

}

module.exports = settlerLogic
