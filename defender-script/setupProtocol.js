const { ethers } = require("ethers")
const mockUSDCAbi = require("./abi/MockUSDC.json")
const dotenv = require("dotenv")
dotenv.config()

const mintTokens = async () => {
	const deployer = new ethers.Wallet(
		process.env.TESTNET_DEPLOYER_ACCOUNT_PK,
		new ethers.providers.InfuraProvider("arbitrum-rinkeby")
	)
	const liquidityPoolAddress = "0x43A57D321fC8ED34F7C2DADf5ca9E21B0ce6B742"
	const usdcAddress = "0x3C6c9B6b41B9E0d82FeD45d9502edFFD5eD3D737"
	const balance = await deployer.getBalance()
	console.log({ balance: ethers.utils.formatEther(balance) })
	const usdc = new ethers.Contract(usdcAddress, mockUSDCAbi, deployer)

	usdc.mint("10000000", { gasLimit: "1000000000000" }) // 10,000 usdc
}

mintTokens()
