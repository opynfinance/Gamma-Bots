const { Relayer } = require('defender-relay-client');
const {
    DefenderRelaySigner,
    DefenderRelayProvider
} = require("defender-relay-client/lib/ethers")
const { ethers } = require('ethers')

const managerAbi = [{"inputs":[{"internalType":"address","name":"_authority","type":"address"},{"internalType":"address","name":"_liquidityPool","type":"address"},{"internalType":"address","name":"_optionHandler","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"ExceedsDeltaLimit","type":"error"},{"inputs":[],"name":"InvalidAddress","type":"error"},{"inputs":[],"name":"NotKeeper","type":"error"},{"inputs":[],"name":"NotProxyManager","type":"error"},{"inputs":[],"name":"PRBMathSD59x18__AbsInputTooSmall","type":"error"},{"inputs":[],"name":"UNAUTHORIZED","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"contract IAuthority","name":"authority","type":"address"}],"name":"AuthorityUpdated","type":"event"},{"inputs":[],"name":"authority","outputs":[{"internalType":"contract IAuthority","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"uint64","name":"expiration","type":"uint64"},{"internalType":"uint128","name":"strike","type":"uint128"},{"internalType":"bool","name":"isPut","type":"bool"},{"internalType":"address","name":"underlying","type":"address"},{"internalType":"address","name":"strikeAsset","type":"address"},{"internalType":"address","name":"collateral","type":"address"}],"internalType":"struct Types.OptionSeries","name":"_optionSeries","type":"tuple"},{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"uint256","name":"_price","type":"uint256"},{"internalType":"uint256","name":"_orderExpiry","type":"uint256"},{"internalType":"address","name":"_buyerAddress","type":"address"},{"internalType":"bool","name":"_isBuyBack","type":"bool"},{"internalType":"uint256[2]","name":"_spotMovementRange","type":"uint256[2]"}],"name":"createOrder","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"uint64","name":"expiration","type":"uint64"},{"internalType":"uint128","name":"strike","type":"uint128"},{"internalType":"bool","name":"isPut","type":"bool"},{"internalType":"address","name":"underlying","type":"address"},{"internalType":"address","name":"strikeAsset","type":"address"},{"internalType":"address","name":"collateral","type":"address"}],"internalType":"struct Types.OptionSeries","name":"_optionSeriesCall","type":"tuple"},{"components":[{"internalType":"uint64","name":"expiration","type":"uint64"},{"internalType":"uint128","name":"strike","type":"uint128"},{"internalType":"bool","name":"isPut","type":"bool"},{"internalType":"address","name":"underlying","type":"address"},{"internalType":"address","name":"strikeAsset","type":"address"},{"internalType":"address","name":"collateral","type":"address"}],"internalType":"struct Types.OptionSeries","name":"_optionSeriesPut","type":"tuple"},{"internalType":"uint256","name":"_amountCall","type":"uint256"},{"internalType":"uint256","name":"_amountPut","type":"uint256"},{"internalType":"uint256","name":"_priceCall","type":"uint256"},{"internalType":"uint256","name":"_pricePut","type":"uint256"},{"internalType":"uint256","name":"_orderExpiry","type":"uint256"},{"internalType":"address","name":"_buyerAddress","type":"address"},{"internalType":"uint256[2]","name":"_callSpotMovementRange","type":"uint256[2]"},{"internalType":"uint256[2]","name":"_putSpotMovementRange","type":"uint256[2]"}],"name":"createStrangle","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"deltaLimit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"keeper","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"liquidityPool","outputs":[{"internalType":"contract ILiquidityPool","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"optionHandler","outputs":[{"internalType":"contract IAlphaOptionHandler","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"proxyManager","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pullManager","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"int256","name":"delta","type":"int256"},{"internalType":"uint256","name":"reactorIndex","type":"uint256"}],"name":"rebalancePortfolioDelta","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract IAuthority","name":"_newAuthority","type":"address"}],"name":"setAuthority","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"_delta","type":"uint256[]"},{"internalType":"address[]","name":"_keeper","type":"address[]"}],"name":"setDeltaLimit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_keeper","type":"address"},{"internalType":"bool","name":"_auth","type":"bool"}],"name":"setKeeper","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_optionHandler","type":"address"}],"name":"setOptionHandler","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_proxyManager","type":"address"}],"name":"setProxyManager","outputs":[],"stateMutability":"nonpayable","type":"function"}]

exports.handler = async function(credentials) {
  const relayerAddress = "0xada6667926b8a600576637f7ec7957ab05b99be7" // Relayer address
  const managerAddress = "0xAdDE1FbBac16EA891622E6e3814eE34cA86C10B0";
  const relayer = new Relayer(credentials);
  const {
    queryParameters, // Object with key-values from query parameters
  } = credentials.request;
  delta = queryParameters.delta;
  reactor_index = queryParameters.reactor_index;
  
  // Initialize default provider and defender relayer signer
  const provider = new DefenderRelayProvider(credentials)
  const signer = new DefenderRelaySigner(credentials, provider, {
        speed: "fast",
        from: relayerAddress
  })
  // manager instance
  const manager = new ethers.Contract(managerAddress, managerAbi, signer);
  const deltaLim = await manager.deltaLimit(relayerAddress);
  if (deltaLim < delta) {
  	throw "error: delta limit exceeded"
  }
  let tx = await manager.rebalancePortfolioDelta(
                		delta, reactor_index,
                    	{ gasLimit: '10000000' }
                						  )
  console.log('Tx hash: ', tx.hash)
  return tx.hash;
}