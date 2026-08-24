// TRION Chain Registry — 100+ chains across every VM family.
// Public RPC endpoints only. Chain IDs follow the TRION internal registry.

export interface ChainDef {
  id: number          // TRION internal id
  name: string
  nativeChainId: number
  vm: string
  category: string
  rpcs: string[]
  explorer: string
  nativeToken: string
  finalitySec: number
  avgGasUsd: number
  blockTimeSec: number
}

const evm = (
  id: number, native: number, name: string, token: string, gas: number,
  rpcs: string[], explorer: string, finality = 12, blockTime = 12,
  category = 'L1',
): ChainDef => ({ id, nativeChainId: native, name, vm: 'EVM', category, rpcs, explorer, nativeToken: token, finalitySec: finality, avgGasUsd: gas, blockTimeSec: blockTime })

export const CHAINS: ChainDef[] = [
  // ── Major EVM L1s ──────────────────────────────────────────────────────
  evm(1, 1, 'Ethereum', 'ETH', 8.5, ['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth', 'https://cloudflare-eth.com'], 'https://etherscan.io', 720, 12),
  evm(56, 56, 'BNB Chain', 'BNB', 0.3, ['https://bsc-dataseed.binance.org', 'https://rpc.ankr.com/bsc'], 'https://bscscan.com', 9, 3),
  evm(137, 137, 'Polygon', 'POL', 0.02, ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'], 'https://polygonscan.com', 256, 2),
  evm(43114, 43114, 'Avalanche', 'AVAX', 0.12, ['https://api.avax.network/ext/bc/C/rpc', 'https://rpc.ankr.com/avalanche'], 'https://snowtrace.io', 3, 2),
  evm(250, 250, 'Fantom', 'FTM', 0.05, ['https://rpc.ftm.tools', 'https://rpc.ankr.com/fantom'], 'https://ftmscan.com', 3, 1),
  evm(1284, 1284, 'Moonbeam', 'GLMR', 0.15, ['https://rpc.api.moonbeam.network'], 'https://moonbeam.moonscan.io', 36, 12),
  evm(1285, 1285, 'Moonriver', 'MOVR', 0.12, ['https://rpc.api.moonriver.moonbeam.network'], 'https://moonriver.moonscan.io', 36, 12),
  evm(61, 61, 'Ethereum Classic', 'ETC', 0.4, ['https://etc.rivet.link', 'https://rpc.ankr.com/etc'], 'https://blockscout.com/etc/mainnet', 720, 13),
  evm(321, 321, 'KCC', 'KCS', 0.1, ['https://rpc-mainnet.kcc.network'], 'https://kccscan.com', 9, 3),
  evm(1666600000, 1666600000, 'Harmony', 'ONE', 0.05, ['https://api.harmony.one'], 'https://explorer.harmony.one', 6, 2),
  evm(50, 50, 'XDC Network', 'XDC', 0.01, ['https://rpc.xinfin.network'], 'https://xdcscan.io', 6, 2),
  evm(1116, 1116, 'Core DAO', 'CORE', 0.2, ['https://rpc.coredao.org'], 'https://scan.coredao.org', 9, 3),
  evm(2000, 2000, 'Dogechain', 'WDOGE', 0.05, ['https://rpc.dogechain.dog'], 'https://explorer.dogechain.dog', 12, 5),
  evm(122, 122, 'Fuse', 'FUSE', 0.02, ['https://rpc.fuse.io'], 'https://explorer.fuse.io', 12, 5),
  evm(100, 100, 'Gnosis', 'xDAI', 0.01, ['https://rpc.gnosischain.com', 'https://rpc.ankr.com/gnosis'], 'https://gnosisscan.io', 12, 5),
  evm(8217, 8217, 'Klaytn', 'KAIA', 0.05, ['https://public-en.node.kaia.io'], 'https://kaiascan.io', 3, 1),
  evm(30, 30, 'Rootstock (RSK)', 'RBTC', 0.1, ['https://public-node.rsk.co'], 'https://explorer.rsk.co', 600, 30),
  evm(314, 314, 'Filecoin FVM', 'FIL', 0.05, ['https://api.node.glif.io'], 'https://filfox.info', 90, 30),
  evm(106, 106, 'Velas', 'VLX', 0.01, ['https://evmexplorer.velas.com/rpc'], 'https://evmexplorer.velas.com', 3, 1),
  evm(25, 25, 'Cronos', 'CRO', 0.3, ['https://evm.cronos.org', 'https://cronos-evm-rpc.publicnode.com'], 'https://cronoscan.com', 18, 6),
  evm(1313161554, 1313161554, 'Aurora', 'ETH', 0.02, ['https://mainnet.aurora.dev'], 'https://explorer.aurora.dev', 12, 2),
  evm(59144, 59144, 'Linea', 'ETH', 0.5, ['https://rpc.linea.build', 'https://rpc.ankr.com/linea'], 'https://lineascan.build', 96, 12, 'L2'),
  evm(534352, 534352, 'Scroll', 'ETH', 0.4, ['https://rpc.scroll.io'], 'https://scrollscan.com', 180, 3, 'L2'),
  evm(324, 324, 'zkSync Era', 'ETH', 0.35, ['https://mainnet.era.zksync.io'], 'https://explorer.zksync.io', 360, 2, 'L2'),
  evm(1101, 1101, 'Polygon zkEVM', 'ETH', 0.1, ['https://zkevm-rpc.com'], 'https://zkevm.polygonscan.com', 180, 3, 'L2'),

  // ── Major EVM L2s ───────────────────────────────────────────────────────
  evm(10, 10, 'OP Mainnet', 'ETH', 0.5, ['https://mainnet.optimism.io', 'https://optimism-rpc.publicnode.com'], 'https://optimistic.etherscan.io', 120, 2, 'L2'),
  evm(42161, 42161, 'Arbitrum One', 'ETH', 0.3, ['https://arb1.arbitrum.io/rpc', 'https://arbitrum-rpc.publicnode.com'], 'https://arbiscan.io', 96, 0.25, 'L2'),
  evm(8453, 8453, 'Base', 'ETH', 0.1, ['https://mainnet.base.org', 'https://base-rpc.publicnode.com'], 'https://basescan.org', 120, 2, 'L2'),
  evm(5000, 5000, 'Mantle', 'ETH', 0.1, ['https://rpc.mantle.xyz'], 'https://mantlescan.xyz', 36, 2, 'L2'),
  evm(1088, 1088, 'Metis Andromeda', 'METIS', 0.2, ['https://andromeda.metis.io/?owner=1088'], 'https://explorer.metis.io', 60, 4, 'L2'),
  evm(252, 252, 'Fraxtal', 'frxETH', 0.1, ['https://rpc.frax.com'], 'https://fraxscan.com', 60, 6, 'L2'),
  evm(34443, 34443, 'Mode', 'ETH', 0.05, ['https://mainnet.mode.network'], 'https://modescan.io', 120, 2, 'L2'),
  evm(167000, 167000, 'Taiko', 'ETH', 0.3, ['https://rpc.mainnet.taiko.xyz'], 'https://taikoscan.io', 240, 12, 'L2'),
  evm(81457, 81457, 'Blast', 'ETH', 0.1, ['https://rpc.blast.io'], 'https://blastscan.io', 120, 2, 'L2'),
  evm(196, 196, 'X Layer', 'OKB', 0.05, ['https://rpc.xlayer.tech'], 'https://www.oklink.com/xlayer', 60, 3, 'L2'),
  evm(169, 169, 'Manta Pacific', 'ETH', 0.05, ['https://pacific-rpc.manta.network'], 'https://pacific-explorer.manta.network', 120, 6, 'L2'),
  evm(60808, 60808, 'Bob Network', 'ETH', 0.05, ['https://rpc.gobob.xyz'], 'https://explorer.gobob.xyz', 600, 30, 'L2'),
  evm(200901, 200901, 'Bitlayer', 'BTC', 0.1, ['https://rpc.bitlayer.org'], 'https://www.btrscan.com', 60, 3, 'L2'),
  evm(7777777, 7777777, 'Zora', 'ETH', 0.02, ['https://rpc.zora.energy'], 'https://explorer.zora.energy', 120, 2, 'L2'),
  evm(999, 999, 'WEMIX', 'WEMIX', 0.05, ['https://api.wemix.com'], 'https://wemixscan.com', 12, 5),
  evm(42220, 42220, 'Celo', 'CELO', 0.01, ['https://forno.celo.org', 'https://celo-rpc.publicnode.com'], 'https://celoscan.io', 12, 5),
  evm(16661, 16661, '0G Chain', '0G', 0.01, ['https://evmrpc.0g.ai', 'https://rpc.0g.ai'], 'https://scan.0g.ai', 24, 5),
  evm(177, 177, 'HashKey Chain', 'HSK', 0.05, ['https://mainnet.hsk.xyz'], 'https://explorer.hsk.xyz', 60, 5),
  evm(1514, 1514, 'Story', 'IP', 0.1, ['https://rpc.storyrpc.io'], 'https://storyscan.xyz', 60, 5),
  evm(146, 146, 'Sonic', 'S', 0.01, ['https://rpc.soniclabs.com'], 'https://sonicscan.org', 3, 1),
  evm(10143, 10143, 'Monad', 'MON', 0.05, ['https://rpc.monad.xyz'], 'https://monadscan.com', 3, 1),
  evm(8822, 8822, 'IOTA EVM', 'IOTA', 0.01, ['https://evm.iota.org'], 'https://iota.evmexplorer.com', 12, 5),
  evm(1329, 1329, 'SEI EVM', 'SEI', 0.01, ['https://evm-rpc.sei-protocol.com'], 'https://seitrace.com', 3, 1),
  evm(7700, 7700, 'Canto', 'CANTO', 0.05, ['https://canto.slingshot.finance'], 'https://tuber.build', 12, 6),
  evm(245022934, 245022934, 'Neon EVM', 'NEON', 0.05, ['https://mainnet.neonevm.org'], 'https://neonscan.org', 3, 1),
  evm(23294, 23294, 'Sapphire (Oasis)', 'ROSE', 0.02, ['https://sapphire.oasis.io'], 'https://explorer.oasis.io/mainnet/sapphire', 60, 6),
  evm(42262, 42262, 'Emerald (Oasis)', 'ROSE', 0.02, ['https://emerald.oasis.dev'], 'https://explorer.oasis.io/mainnet/emerald', 60, 6),
  evm(4689, 4689, 'IoTeX', 'IOTX', 0.02, ['https://rpc.ankr.com/iotex'], 'https://iotexscan.io', 12, 5),
  evm(1030, 1030, 'Conflux eSpace', 'CFX', 0.02, ['https://evm.confluxrpc.com'], 'https://evm.confluxscan.net', 60, 2),
  evm(255, 255, 'Kroma', 'ETH', 0.05, ['https://api.kroma.network'], 'https://blockscout.kroma.network', 120, 2, 'L2'),
  evm(7560, 7560, 'Cyber', 'CYBER', 0.05, ['https://rpc.cyber.co'], 'https://cyberscan.co', 60, 3),
  evm(40, 40, 'Telos', 'TLOS', 0.01, ['https://mainnet.telos.net/evm'], 'https://www.teloscan.io', 3, 1),
  evm(66, 66, 'OKC (OKX Chain)', 'OKT', 0.1, ['https://exchainrpc.okex.org'], 'https://www.oklink.com/oktc', 12, 6),
  evm(677, 677, 'BotChain', 'BOT', 0.01, ['https://rpc.botchain.ai'], 'https://scan.botchain.ai', 12, 5),

  // ── SVM (Solana family) ─────────────────────────────────────────────────
  {
    id: 900, nativeChainId: 900, name: 'Solana', vm: 'SVM', category: 'L1',
    rpcs: ['https://api.mainnet-beta.solana.com', 'https://solana-rpc.publicnode.com'],
    explorer: 'https://solscan.io', nativeToken: 'SOL', finalitySec: 12.8, avgGasUsd: 0.01, blockTimeSec: 0.4,
  },
  {
    id: 901, nativeChainId: 905, name: 'Eclipse', vm: 'SVM', category: 'L2',
    rpcs: ['https://mainnetbeta.eclipse-rpc.alchemy.com'],
    explorer: 'https://explorer.eclipse-rpc.io', nativeToken: 'ETH', finalitySec: 12, avgGasUsd: 0.02, blockTimeSec: 0.5,
  },
  {
    id: 902, nativeChainId: 1111, name: 'Sonic SVM', vm: 'SVM', category: 'L2',
    rpcs: ['https://api.mainnet-alpha.sonic.game'],
    explorer: 'https://sonicscan.org', nativeToken: 'SOL', finalitySec: 12, avgGasUsd: 0.01, blockTimeSec: 0.4,
  },

  // ── Move VM ─────────────────────────────────────────────────────────────
  {
    id: 5002, nativeChainId: 1, name: 'Aptos', vm: 'MOVE', category: 'L1',
    rpcs: ['https://fullnode.mainnet.aptoslabs.com/v1'],
    explorer: 'https://explorer.aptoslabs.com', nativeToken: 'APT', finalitySec: 1, avgGasUsd: 0.01, blockTimeSec: 1,
  },
  {
    id: 5003, nativeChainId: 2, name: 'Sui', vm: 'MOVE', category: 'L1',
    rpcs: ['https://fullnode.mainnet.sui.io'],
    explorer: 'https://suiscan.xyz/mainnet', nativeToken: 'SUI', finalitySec: 0.5, avgGasUsd: 0.01, blockTimeSec: 0.35,
  },
  {
    id: 5004, nativeChainId: 126, name: 'Movement', vm: 'MOVE', category: 'L1',
    rpcs: ['https://mainnet.movementnetwork.xyz/v1'],
    explorer: 'https://explorer.movementnetwork.xyz', nativeToken: 'MOVE', finalitySec: 1, avgGasUsd: 0.01, blockTimeSec: 1,
  },

  // ── Cosmos family ───────────────────────────────────────────────────────
  {
    id: 4000, nativeChainId: 4000, name: 'Cosmos Hub', vm: 'COSMOS', category: 'L1',
    rpcs: ['https://cosmos-rpc.publicnode.com', 'https://rpc.cosmos.directory/cosmoshub'],
    explorer: 'https://www.mintscan.io/cosmos', nativeToken: 'ATOM', finalitySec: 6, avgGasUsd: 0.01, blockTimeSec: 6,
  },
  {
    id: 4001, nativeChainId: 4001, name: 'Osmosis', vm: 'COSMOS', category: 'L1',
    rpcs: ['https://osmosis-rpc.publicnode.com', 'https://rpc.osmosis.zone'],
    explorer: 'https://www.mintscan.io/osmosis', nativeToken: 'OSMO', finalitySec: 6, avgGasUsd: 0.01, blockTimeSec: 6,
  },
  {
    id: 4002, nativeChainId: 4002, name: 'Juno', vm: 'COSMOS', category: 'L1',
    rpcs: ['https://rpc.junonetwork.io'],
    explorer: 'https://www.mintscan.io/juno', nativeToken: 'JUNO', finalitySec: 6, avgGasUsd: 0.01, blockTimeSec: 6,
  },
  {
    id: 4003, nativeChainId: 4003, name: 'Evmos', vm: 'COSMOS', category: 'L1',
    rpcs: ['https://evmos-rpc.publicnode.com'],
    explorer: 'https://www.mintscan.io/evmos', nativeToken: 'EVMOS', finalitySec: 6, avgGasUsd: 0.02, blockTimeSec: 6,
  },
  {
    id: 4004, nativeChainId: 4004, name: 'Injective', vm: 'COSMOS', category: 'L1',
    rpcs: ['https://injective-rpc.publicnode.com'],
    explorer: 'https://explorer.injective.network', nativeToken: 'INJ', finalitySec: 1, avgGasUsd: 0.02, blockTimeSec: 1,
  },
  {
    id: 4005, nativeChainId: 4005, name: 'Sei', vm: 'COSMOS', category: 'L1',
    rpcs: ['https://sei-rpc.publicnode.com'],
    explorer: 'https://www.mintscan.io/sei', nativeToken: 'SEI', finalitySec: 0.5, avgGasUsd: 0.01, blockTimeSec: 0.4,
  },
  {
    id: 4006, nativeChainId: 4006, name: 'dYdX', vm: 'COSMOS', category: 'L1',
    rpcs: ['https://dydx-rpc.publicnode.com'],
    explorer: 'https://www.mintscan.io/dydx', nativeToken: 'DYDX', finalitySec: 1, avgGasUsd: 0.01, blockTimeSec: 1,
  },
  {
    id: 4007, nativeChainId: 4007, name: 'Celestia', vm: 'COSMOS', category: 'DA',
    rpcs: ['https://celestia-rpc.publicnode.com'],
    explorer: 'https://www.mintscan.io/celestia', nativeToken: 'TIA', finalitySec: 6, avgGasUsd: 0.01, blockTimeSec: 6,
  },
  {
    id: 4008, nativeChainId: 4008, name: 'Neutron', vm: 'COSMOS', category: 'L1',
    rpcs: ['https://neutron-rpc.publicnode.com'],
    explorer: 'https://www.mintscan.io/neutron', nativeToken: 'NTRN', finalitySec: 6, avgGasUsd: 0.01, blockTimeSec: 6,
  },
  {
    id: 4009, nativeChainId: 4009, name: 'Kava', vm: 'COSMOS', category: 'L1',
    rpcs: ['https://kava-rpc.publicnode.com'],
    explorer: 'https://www.mintscan.io/kava', nativeToken: 'KAVA', finalitySec: 6, avgGasUsd: 0.01, blockTimeSec: 6,
  },
  {
    id: 4010, nativeChainId: 4010, name: 'Terra', vm: 'COSMOS', category: 'L1',
    rpcs: ['https://terra-rpc.publicnode.com'],
    explorer: 'https://www.mintscan.io/terra', nativeToken: 'LUNA', finalitySec: 6, avgGasUsd: 0.01, blockTimeSec: 6,
  },
  {
    id: 4011, nativeChainId: 4011, name: 'Stargaze', vm: 'COSMOS', category: 'L1',
    rpcs: ['https://stargaze-rpc.publicnode.com'],
    explorer: 'https://www.mintscan.io/stargaze', nativeToken: 'STARS', finalitySec: 6, avgGasUsd: 0.01, blockTimeSec: 6,
  },
  {
    id: 4012, nativeChainId: 4012, name: 'Kujira', vm: 'COSMOS', category: 'L1',
    rpcs: ['https://kujira-rpc.publicnode.com'],
    explorer: 'https://www.mintscan.io/kujira', nativeToken: 'KUJI', finalitySec: 6, avgGasUsd: 0.01, blockTimeSec: 6,
  },
  {
    id: 4013, nativeChainId: 4013, name: 'Akash', vm: 'COSMOS', category: 'L1',
    rpcs: ['https://akash-rpc.publicnode.com'],
    explorer: 'https://www.mintscan.io/akash', nativeToken: 'AKT', finalitySec: 6, avgGasUsd: 0.01, blockTimeSec: 6,
  },
  {
    id: 4014, nativeChainId: 4014, name: 'Persistence', vm: 'COSMOS', category: 'L1',
    rpcs: ['https://persistence-rpc.publicnode.com'],
    explorer: 'https://www.mintscan.io/persistence', nativeToken: 'XPRT', finalitySec: 6, avgGasUsd: 0.01, blockTimeSec: 6,
  },
  {
    id: 4015, nativeChainId: 4015, name: 'Initia', vm: 'COSMOS', category: 'L1',
    rpcs: ['https://initia-rpc.publicnode.com'],
    explorer: 'https://www.mintscan.io/initia', nativeToken: 'INIT', finalitySec: 6, avgGasUsd: 0.01, blockTimeSec: 6,
  },

  // ── UTXO family ─────────────────────────────────────────────────────────
  {
    id: 21000, nativeChainId: 21000, name: 'Bitcoin', vm: 'UTXO', category: 'L1',
    rpcs: ['https://blockstream.info/api', 'https://mempool.space/api'],
    explorer: 'https://mempool.space', nativeToken: 'BTC', finalitySec: 3600, avgGasUsd: 5.0, blockTimeSec: 600,
  },
  {
    id: 21001, nativeChainId: 21001, name: 'Litecoin', vm: 'UTXO', category: 'L1',
    rpcs: ['https://litecoin.space/api'],
    explorer: 'https://litecoin.space', nativeToken: 'LTC', finalitySec: 900, avgGasUsd: 0.5, blockTimeSec: 150,
  },
  {
    id: 21002, nativeChainId: 21002, name: 'Dogecoin', vm: 'UTXO', category: 'L1',
    rpcs: ['https://dogechain.info/api/v1'],
    explorer: 'https://dogechain.info', nativeToken: 'DOGE', finalitySec: 360, avgGasUsd: 0.1, blockTimeSec: 60,
  },
  {
    id: 21003, nativeChainId: 21003, name: 'Dash', vm: 'UTXO', category: 'L1',
    rpcs: ['https://insight.dash.org/api'],
    explorer: 'https://insight.dash.org', nativeToken: 'DASH', finalitySec: 300, avgGasUsd: 0.1, blockTimeSec: 150,
  },
  {
    id: 21004, nativeChainId: 21004, name: 'Bitcoin Cash', vm: 'UTXO', category: 'L1',
    rpcs: ['https://api.blockchair.com/bitcoin-cash'],
    explorer: 'https://blockchair.com/bitcoin-cash', nativeToken: 'BCH', finalitySec: 1800, avgGasUsd: 0.5, blockTimeSec: 600,
  },

  // ── Other VM families ───────────────────────────────────────────────────
  {
    id: 22000, nativeChainId: 22000, name: 'TON', vm: 'TON', category: 'L1',
    rpcs: ['https://toncenter.com/api/v2/jsonRPC'],
    explorer: 'https://tonviewer.com', nativeToken: 'TON', finalitySec: 6, avgGasUsd: 0.05, blockTimeSec: 5,
  },
  {
    id: 23000, nativeChainId: 23000, name: 'NEAR Protocol', vm: 'NEAR', category: 'L1',
    rpcs: ['https://rpc.mainnet.near.org'],
    explorer: 'https://nearblocks.io', nativeToken: 'NEAR', finalitySec: 2, avgGasUsd: 0.01, blockTimeSec: 1,
  },
  {
    id: 24000, nativeChainId: 24000, name: 'Starknet', vm: 'STARKNET', category: 'L2',
    rpcs: ['https://starknet-mainnet.public.blastapi.io'],
    explorer: 'https://starkscan.co', nativeToken: 'STRK', finalitySec: 300, avgGasUsd: 0.1, blockTimeSec: 3,
  },
  {
    id: 25000, nativeChainId: 25000, name: 'Polkadot', vm: 'PVM', category: 'RELAY',
    rpcs: ['https://rpc.polkadot.io'],
    explorer: 'https://polkadot.subscan.io', nativeToken: 'DOT', finalitySec: 60, avgGasUsd: 0.1, blockTimeSec: 6,
  },
  {
    id: 25001, nativeChainId: 25001, name: 'Kusama', vm: 'PVM', category: 'RELAY',
    rpcs: ['https://kusama-rpc.polkadot.io'],
    explorer: 'https://kusama.subscan.io', nativeToken: 'KSM', finalitySec: 60, avgGasUsd: 0.05, blockTimeSec: 6,
  },
  {
    id: 25002, nativeChainId: 25002, name: 'Asset Hub (Polkadot)', vm: 'PVM', category: 'PARACHAIN',
    rpcs: ['https://statemint-rpc.polkadot.io'],
    explorer: 'https://assethub-polkadot.subscan.io', nativeToken: 'DOT', finalitySec: 60, avgGasUsd: 0.01, blockTimeSec: 12,
  },
  {
    id: 26000, nativeChainId: 26000, name: 'Tron', vm: 'TVM', category: 'L1',
    rpcs: ['https://api.trongrid.io'],
    explorer: 'https://tronscan.org', nativeToken: 'TRX', finalitySec: 57, avgGasUsd: 3.0, blockTimeSec: 3,
  },
  {
    id: 27000, nativeChainId: 27000, name: 'Stellar', vm: 'STELLAR', category: 'L1',
    rpcs: ['https://horizon.stellar.org'],
    explorer: 'https://stellar.expert', nativeToken: 'XLM', finalitySec: 5, avgGasUsd: 0.01, blockTimeSec: 5,
  },
  {
    id: 28000, nativeChainId: 28000, name: 'Hedera', vm: 'HEDERA', category: 'L1',
    rpcs: ['https://mainnet-public.mirrornode.hedera.com'],
    explorer: 'https://hashscan.io/mainnet', nativeToken: 'HBAR', finalitySec: 3, avgGasUsd: 0.001, blockTimeSec: 3,
  },
  {
    id: 29000, nativeChainId: 29000, name: 'Algorand', vm: 'ALGORAND', category: 'L1',
    rpcs: ['https://mainnet-api.algonode.cloud'],
    explorer: 'https://allo.info', nativeToken: 'ALGO', finalitySec: 3, avgGasUsd: 0.001, blockTimeSec: 3,
  },
  {
    id: 30000, nativeChainId: 30000, name: 'Cardano', vm: 'CARDANO', category: 'L1',
    rpcs: ['https://api.koios.rest'],
    explorer: 'https://cardanoscan.io', nativeToken: 'ADA', finalitySec: 120, avgGasUsd: 0.5, blockTimeSec: 20,
  },
  {
    id: 31000, nativeChainId: 31000, name: 'XRP Ledger', vm: 'XRP', category: 'L1',
    rpcs: ['https://xrplcluster.com', 'https://s1.ripple.com'],
    explorer: 'https://livenet.xrpl.org', nativeToken: 'XRP', finalitySec: 4, avgGasUsd: 0.01, blockTimeSec: 4,
  },
  {
    id: 32000, nativeChainId: 32000, name: 'MultiversX', vm: 'WASM', category: 'L1',
    rpcs: ['https://api.multiversx.com'],
    explorer: 'https://explorer.multiversx.com', nativeToken: 'EGLD', finalitySec: 6, avgGasUsd: 0.01, blockTimeSec: 6,
  },
  {
    id: 33000, nativeChainId: 33000, name: 'VeChain', vm: 'EVM', category: 'L1',
    rpcs: ['https://mainnet.veblocks.net'],
    explorer: 'https://vechainstats.com', nativeToken: 'VET', finalitySec: 60, avgGasUsd: 0.01, blockTimeSec: 10,
  },
  {
    id: 34000, nativeChainId: 34000, name: 'Waves', vm: 'WASM', category: 'L1',
    rpcs: ['https://nodes.wavesnodes.com'],
    explorer: 'https://wavesexplorer.com', nativeToken: 'WAVES', finalitySec: 60, avgGasUsd: 0.01, blockTimeSec: 15,
  },
]

export const VM_FAMILIES = [
  'EVM', 'SVM', 'MOVE', 'COSMOS', 'UTXO', 'TON', 'NEAR',
  'STARKNET', 'PVM', 'TVM', 'STELLAR', 'HEDERA', 'ALGORAND',
  'CARDANO', 'XRP', 'WASM',
]

export const chainCount = CHAINS.length
export const bridgePairsEliminated = (n: number) => (n * (n - 1)) / 2
export const chainById = (id: number) => CHAINS.find(c => c.id === id)
