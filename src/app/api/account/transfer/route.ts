/**
 * Copyright 2025-present Coinbase Global, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { authOptions } from '@/lib/auth';
import { getBalanceForAddress } from '@/lib/balance';
import { cdpClient } from '@/lib/cdp';
import {
  erc20approveAbi,
  getTokenAddresses,
  tokenDecimals,
  TokenKey,
} from '@/lib/constants';
import { InsufficientBalanceError } from '@/lib/errors';
import { getNetworkConfig } from '@/lib/network';
import { executeTransfers } from '@/lib/transfer';
import { TransferRequest } from '@/lib/types/transfer';
import { publicClient } from '@/lib/viem';
import { randomUUID } from 'crypto';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { Address, encodeFunctionData, formatUnits, parseUnits } from 'viem';

const { network } = getNetworkConfig();

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Get account details
  const session = await getServerSession(authOptions);

  try {
    const { recipients, token }: TransferRequest = await request.json();

    if (!recipients || !token) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'At least one recipient is required' },
        { status: 400 }
      );
    }

    const account = await cdpClient.evm.getAccount({ name: session!.user.id });

    console.log({account})

    const recipientAddresses: `0x${string}`[] = recipients.map(
      (r) => r.address as `0x${string}`
    );

    const decimalPrecision = tokenDecimals[token as TokenKey];
    const amounts = recipients.map((r) =>
      parseUnits(r.amount, decimalPrecision)
    );
    const totalTransferAmount = amounts.reduce(
      (sum, amount) => sum + amount,
      BigInt(0)
    );

    const sanitizedToken = token.toLowerCase();

    const tokenBalance = await getBalanceForAddress(
      account.address,
      sanitizedToken
    );
    const rawTokenBalance = parseUnits(tokenBalance, decimalPrecision);
    if (rawTokenBalance < totalTransferAmount) {
      throw new InsufficientBalanceError(
        `Insufficient ${sanitizedToken} balance for transfer. Required: ${formatUnits(totalTransferAmount, decimalPrecision)} ${sanitizedToken}`
      );
    }
console.log({ totalTransferAmount });
    if (token !== 'eth') {
      const tokenAddress = getTokenAddresses(network === 'base')[
        token as TokenKey
      ];
      const result = await cdpClient.evm.sendTransaction({
        address: account.address as `0x${string}`,
        transaction: {
          to: tokenAddress as `0x${string}`,
          data: encodeFunctionData({
            abi: erc20approveAbi,
            functionName: 'approve',
            args: [
              process.env.GASLITE_DROP_ADDRESS as Address,
              totalTransferAmount,
            ],
          }),
          value: BigInt(0),
          type: 'eip1559',
        },
        network,
        idempotencyKey: randomUUID(),
      });

      await publicClient.waitForTransactionReceipt({
        hash: result.transactionHash as `0x${string}`,
      });
    }
console.log({ totalTransferAmount });
    const result = await executeTransfers({
      senderAccount: account,
      token: sanitizedToken as TokenKey,
      addresses: recipientAddresses,
      amounts,
      totalAmount: totalTransferAmount,
    });

    return NextResponse.json({ recipients, result });
  } catch (error) {
    console.error('Transfer error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to process transfer',
      },
      { status: 500 }
    );
  }
}
