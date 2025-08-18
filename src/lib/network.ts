import { NetworkConfig } from '@/lib/types/network';
import { base, baseSepolia } from 'viem/chains';

export const getNetworkConfig = (
  useMainnet: string = process.env.USE_MAINNET || 'false'
): NetworkConfig => {
  if (useMainnet === 'true') {
    baseNetworkConfig.rpcUrl = process.env.BASE_NODE_URL;
    return baseNetworkConfig;
  }

  baseSepoliaNetworkConfig.rpcUrl = process.env.BASE_SEPOLIA_NODE_URL;
  return baseSepoliaNetworkConfig;
};

const baseSepoliaNetworkConfig: NetworkConfig = {
  chain: baseSepolia,
  network: 'base-sepolia',
  explorerUrl: 'https://sepolia.basescan.org',
};

const baseNetworkConfig: NetworkConfig = {
  chain: base,
  network: 'base',
  explorerUrl: 'https://basescan.org',
};
