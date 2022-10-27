const { ethers } = require('ethers')

const AddressBookAbi = require('../abi/AddressBook.json')
const OracleAbi = require('../abi/Oracle.json')
const ChainlinkPricerAbi = require('../abi/ChainLinkPricer.json')
const AggregatorInterfaceAbi = require('../abi/AggregatorInterface.json')

const chainlinkPricerLogic = async (
	signer,
	addressbookAddress,
	pricerAddress,
	pricerAssetAddress,
	chainlinkAggregatorAddress
) => {
	// addressbook instance
	const addressbook = new ethers.Contract(
		addressbookAddress,
		AddressBookAbi,
		signer
	)

	// oracle address
	const oracleAddress = await addressbook.getOracle()
	// oracle instance
	const oracle = new ethers.Contract(oracleAddress, OracleAbi, signer)
	// pricer instance
	const pricer = new ethers.Contract(pricerAddress, ChainlinkPricerAbi, signer)
	// chainlink price feed instance
	const chainlinkAggregator = new ethers.Contract(
		chainlinkAggregatorAddress,
		AggregatorInterfaceAbi,
		signer
	)
	// Otoken expiry hour in UTC
	const expiryHour = 8

	console.log('Oracle: ', oracle.address)
	console.log('Pricer: ', pricer.address)
	console.log('Pricer asset: ', pricerAssetAddress)
	console.log('Chainlink aggregator: ', chainlinkAggregator.address)

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
	console.log('Current timestamp: ', currentTimestamp)
	console.log('Current hour: ', hour)

	if (hour == expiryHour) {
		let expiryPrice = await oracle.getExpiryPrice(
			pricerAssetAddress,
			expiryTimestamp
		)
		let isLockingPeriodOver = await oracle.isLockingPeriodOver(
			pricerAssetAddress,
			expiryTimestamp
		)

		if (expiryPrice[0].toString() == '0' && isLockingPeriodOver) {
			// round id for expiry timestamp
			let priceRoundId = await chainlinkAggregator.latestRound()
			let priceRoundTimestamp = await chainlinkAggregator.getTimestamp(
				priceRoundId
			)
			// round id before price round id
			let previousRoundId
			let previousRoundTimestamp

			// check if otoken price is not on-chain, and latest chainlink round timestamp is greater than otoken expiry timestamp and locking period over
			if (priceRoundTimestamp.toString() >= expiryTimestamp) {
				// loop and decrease round id until previousRoundTimestamp < expiryTimestamp && priceRoundTimestamp >= expiryTimestamp
				// if previous round timestamp != 0 && less than expiry timestamp then exit => price round id found
				// else store previous round id in price round id (as we are searching for the first round id that it timestamp >= expiry timestamp)
				for (let j = priceRoundId.sub(1); j > 0; j = j.sub(1)) {
					previousRoundId = j
					previousRoundTimestamp = await chainlinkAggregator.getTimestamp(j)

					if (previousRoundTimestamp.toString() != '0') {
						if (
							previousRoundTimestamp.toString() < expiryTimestamp.toString()
						) {
							break
						} else {
							priceRoundId = previousRoundId
							priceRoundTimestamp = previousRoundTimestamp
						}
					}
				}

				console.log('Found round id: ', priceRoundId.toString())
				console.log('Found round timestamp: ', priceRoundTimestamp.toString())

				let tx = await pricer.setExpiryPriceInOracle(
					expiryTimestamp,
					priceRoundId,
					{ gasLimit: '10000000' }
				)

				console.log('Tx hash: ', tx.hash)
			} else {
				console.log(
					'Chainlink latest round timestamp is not grater than or equal the expiry timestamp '
				)
			}
		}
	}
}

module.exports = chainlinkPricerLogic
