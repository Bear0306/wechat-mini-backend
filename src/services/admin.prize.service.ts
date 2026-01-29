import { prisma } from '../db';

export async function listClaims(page: number, size: number, where: object = {}) {
  const take = Math.min(Math.max(size, 1), 200);
  const skip = Math.max((page - 1) * take, 0);
  const claims = await prisma.contestPrizeClaim.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });
  return claims;
}

export async function verifyClaim(claimId: number, pass: boolean, note?: string) {
  const status = pass ? 'VERIFIED' : 'REJECTED';
  const updated = await prisma.contestPrizeClaim.update({
    where: { id: claimId },
    data: { status, note: note ?? null },
  });
  return { claimId: updated.id, status: updated.status };
}

export async function shipClaim(claimId: number) {
  const updated = await prisma.contestPrizeClaim.update({
    where: { id: claimId },
    data: { status: 'SHIPPED' },
  });
  return { claimId: updated.id, status: updated.status };
}

export async function updateClaimStatus(claimId: number, status: string) {
  const valid: string[] = ['PENDING_INFO', 'SUBMITTED', 'VERIFIED', 'SHIPPED', 'COMPLETED', 'REJECTED'];
  if (!valid.includes(status)) {
    throw new Error('Invalid status');
  }
  const updated = await prisma.contestPrizeClaim.update({
    where: { id: claimId },
    data: { status: status as any },
  });
  return updated;
}
