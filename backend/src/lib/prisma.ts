import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient;

try {
  prismaInstance = new PrismaClient();
} catch (error) {
  prismaInstance = new Proxy({} as PrismaClient, {
    get() {
      throw error;
    },
  });
}

export const prisma = prismaInstance;
