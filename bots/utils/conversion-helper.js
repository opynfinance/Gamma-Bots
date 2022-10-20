const { BigNumber, BigNumberish, utils } = require("ethers")
// import BigNumber from 'bignumber.js'

const formatEth = x => Number(utils.formatEther(x))
function truncate(num, places = 3) {
	return Math.trunc(num * Math.pow(10, places)) / Math.pow(10, places)
}
const tFormatEth = (x, places = 3) => truncate(formatEth(x), places)
const toWei = x => utils.parseEther(x)
const call = false,
	put = true
const MAX_BPS = BigNumber.from(10000)
const CALL = false
const PUT = true
const SECONDS_IN_DAY = 86400
const SECONDS_IN_YEAR = SECONDS_IN_DAY * 365.25
const fromWei = x => utils.formatEther(x)
const fromUSDC = x => utils.formatUnits(x, 6)
const tFormatUSDC = (x, places = 3) => truncate(Number(fromUSDC(x)), places)
const fmtExpiration = x => toWei(x.toString())
const toUSDC = x => utils.parseUnits(x, 6)
const toOpyn = x => utils.parseUnits(x, 8)
const toWeiFromUSDC = x => utils.parseUnits(x, 12)
const fromWeiToUSDC = x => utils.parseUnits(utils.formatEther(x), 6)
const fromOpyn = x => utils.formatUnits(x, 8)
const convertRounded = x => Math.round(Number(x.toString()))
const scaleNum = (x, decimals) => utils.parseUnits(x, decimals)
const genOptionTimeFromUnix = (now, future) => (future - now) / SECONDS_IN_YEAR
const sample = x => x[Math.floor(Math.random() * x.length)]
const percentDiff = (a, b) => (a === b ? 0 : Math.abs(1 - a / b))
const percentDiffArr = (a, b) => {
	const diffs = a.map(i => {
		let j = b[idx]
		return percentDiff(Number(i), Number(j))
	})
	const sum = diffs.reduce((a, b) => a + b, 0)
	return sum
}
const createValidExpiry = (now, days) => {
	const multiplier = (now - 28800) / 86400
	return (Number(multiplier.toFixed(0)) + 1) * 86400 + days * 86400 + 28800
}

const sum = function (array) {
	let total = 0
	for (let i = 0; i < array.length; i++) {
		total += array[i]
	}
	return total
}

const mean = function (array) {
	let arraySum = sum(array)
	return arraySum / array.length
}

const median = function (array) {
	array = array.sort()
	if (array.length % 2 === 0) {
		// array with even number elements
		return (array[array.length / 2] + array[array.length / 2 - 1]) / 2
	} else {
		return array[(array.length - 1) / 2] // array with odd number elements
	}
}
const parseTokenAmount = (value, decimals) =>
	BigNumber.from(value).mul(BigNumber.from(10).pow(BigNumber.from(decimals)))

module.exports = {
	formatEth,
	tFormatEth,
	toWei,
	fromWei,
	fromUSDC,
	toOpyn,
	toWeiFromUSDC,
	fromWeiToUSDC,
	fromOpyn,
	toUSDC
}
