const { ethers } = require('ethers')

const ManagerAbi = require('../abi/Manager.json')
const OracleAbi = require('../abi/Oracle.json')

const deltaHedgerLogic = async (
    signer,
    oracleAddress,
    managerAddress,
    pricerAssetAddress,
    store
) => {
    if (!(await store.get("hasHedged"))) {
        // oracle instance
        const oracle = new ethers.Contract(oracleAddress, OracleAbi, signer)
        // pricer instance
        const manager = new ethers.Contract(managerAddress, ManagerAbi, signer)
        // Otoken expiry hour in UTC
        const expiryHour = 8
        const deltaAmount = ethers.utils.parseEther("33.86")
        const hedgingReactorId = 0
        console.log('Oracle: ', oracle.address)
        console.log('Pricer asset: ', pricerAssetAddress)

        // set expiry timestamp
        let expiryTimestamp = new Date()
        expiryTimestamp.setHours(expiryHour)
        expiryTimestamp.setMinutes(0)
        expiryTimestamp.setSeconds(0)
        expiryTimestamp = Math.floor(expiryTimestamp.getTime() / 1000)

        // current timestamp in UTC seconds
        let currentTimestamp = new Date()
        const hour = currentTimestamp.getHours()
        currentTimestamp = Math.floor(currentTimestamp.getTime() / 1000)

        console.log('Expiry timestamp: ', expiryTimestamp.toString())

        if (hour == expiryHour) {
            let isLockingPeriodOver = await oracle.isLockingPeriodOver(
                pricerAssetAddress,
                expiryTimestamp
            )

            if (isLockingPeriodOver) {
                let tx = await manager.rebalancePortfolioDelta(
                    deltaAmount,
                    hedgingReactorId,
                    { gasLimit: '10000000' }
                )
                await store.put("hasHedged", true)
                console.log('Tx hash: ', tx.hash)
            } else {
                console.log(
                    'No need to delta hedge '
                )
            }
        }
    }
}

module.exports = deltaHedgerLogic
