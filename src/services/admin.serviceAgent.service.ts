import { prisma } from '../db';

export interface ServiceAgentCreate {
  name: string;
  wechatId?: string | null;
}

export interface ServiceAgentUpdate {
  name?: string;
  wechatId?: string | null;
  isActive?: boolean;
}

export async function listServiceAgents() {
  return prisma.serviceAgent.findMany({
    orderBy: { id: 'asc' },
  });
}

export async function listActiveServiceAgents() {
  return prisma.serviceAgent.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' },
  });
}

export async function getServiceAgentById(id: number) {
  return prisma.serviceAgent.findUnique({ where: { id } });
}

export async function createServiceAgent(data: ServiceAgentCreate) {
  return prisma.serviceAgent.create({
    data: {
      name: data.name,
      wechatId: data.wechatId ?? null,
    },
  });
}

export async function updateServiceAgent(id: number, data: ServiceAgentUpdate) {
  return prisma.serviceAgent.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.wechatId !== undefined && { wechatId: data.wechatId }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

export async function deleteServiceAgent(id: number) {
  return prisma.serviceAgent.delete({ where: { id } });
}
