import { CreditLedgerKind, CreditReferenceType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const CHAT_DEVICE_ID_MAX_LENGTH = 120;
export const INITIAL_CHATGPT_CREDITS = 100;
export const IMAGE_GENERATION_CREDIT_COST = 1;
export const VIDEO_GENERATION_CREDIT_COST = 2;

type CreditReference =
  | "image_generation"
  | "video_generation"
  | "admin"
  | "other";

type EnsureWalletResult = {
  walletId: string;
  balance: number;
  initialCredits: number;
  totalSpent: number;
};

function mapReferenceType(referenceType: CreditReference): CreditReferenceType {
  if (referenceType === "image_generation") return CreditReferenceType.image_generation;
  if (referenceType === "video_generation") return CreditReferenceType.video_generation;
  if (referenceType === "admin") return CreditReferenceType.admin;
  return CreditReferenceType.other;
}

export function normalizeDeviceId(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  return normalized.slice(0, CHAT_DEVICE_ID_MAX_LENGTH);
}

export async function ensureCreditWallet(
  deviceId: string,
  tx: Prisma.TransactionClient = prisma
): Promise<EnsureWalletResult> {
  const wallet = await tx.creditWallet.upsert({
    where: { deviceId },
    update: {},
    create: {
      deviceId,
      initialCredits: INITIAL_CHATGPT_CREDITS,
      balance: INITIAL_CHATGPT_CREDITS,
      totalSpent: 0,
    },
    select: {
      id: true,
      balance: true,
      initialCredits: true,
      totalSpent: true,
    },
  });

  return {
    walletId: wallet.id,
    balance: wallet.balance,
    initialCredits: wallet.initialCredits,
    totalSpent: wallet.totalSpent,
  };
}

export async function getCreditSummary(deviceId: string) {
  const wallet = await ensureCreditWallet(deviceId);
  return {
    deviceId,
    balance: wallet.balance,
    initialCredits: wallet.initialCredits,
    totalSpent: wallet.totalSpent,
  };
}

export async function hasEnoughCredits(deviceId: string, cost: number): Promise<boolean> {
  const wallet = await ensureCreditWallet(deviceId);
  return wallet.balance >= cost;
}

export async function consumeCredits(params: {
  deviceId: string;
  amount: number;
  reason: string;
  referenceType: CreditReference;
  referenceId?: string;
  requestId?: string;
}): Promise<{ ok: true; balance: number; totalSpent: number } | { ok: false; balance: number }> {
  if (params.amount <= 0) {
    throw new Error("amount deve ser maior que zero.");
  }

  return prisma.$transaction(async (tx) => {
    const wallet = await ensureCreditWallet(params.deviceId, tx);

    if (params.requestId) {
      const existing = await tx.creditLedger.findUnique({
        where: { requestId: params.requestId },
        select: { walletId: true, kind: true, balanceAfter: true },
      });

      if (existing && existing.walletId === wallet.walletId && existing.kind === CreditLedgerKind.debit) {
        const refreshedWallet = await tx.creditWallet.findUnique({
          where: { id: wallet.walletId },
          select: { balance: true, totalSpent: true },
        });
        return {
          ok: true as const,
          balance: refreshedWallet?.balance ?? existing.balanceAfter,
          totalSpent: refreshedWallet?.totalSpent ?? wallet.totalSpent,
        };
      }
    }

    const debitResult = await tx.creditWallet.updateMany({
      where: {
        id: wallet.walletId,
        balance: { gte: params.amount },
      },
      data: {
        balance: { decrement: params.amount },
        totalSpent: { increment: params.amount },
      },
    });

    if (debitResult.count === 0) {
      const latest = await tx.creditWallet.findUnique({
        where: { id: wallet.walletId },
        select: { balance: true },
      });
      return {
        ok: false as const,
        balance: latest?.balance ?? wallet.balance,
      };
    }

    const updatedWallet = await tx.creditWallet.findUnique({
      where: { id: wallet.walletId },
      select: { balance: true, totalSpent: true },
    });
    const balanceAfter = updatedWallet?.balance ?? Math.max(0, wallet.balance - params.amount);
    const balanceBefore = balanceAfter + params.amount;

    await tx.creditLedger.create({
      data: {
        walletId: wallet.walletId,
        kind: CreditLedgerKind.debit,
        amount: params.amount,
        balanceBefore,
        balanceAfter,
        reason: params.reason.slice(0, 255),
        referenceType: mapReferenceType(params.referenceType),
        referenceId: params.referenceId?.slice(0, 191),
        requestId: params.requestId?.slice(0, 191),
      },
    });

    return {
      ok: true as const,
      balance: balanceAfter,
      totalSpent: updatedWallet?.totalSpent ?? wallet.totalSpent + params.amount,
    };
  });
}
