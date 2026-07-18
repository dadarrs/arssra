import { PrismaClient } from '@prisma/client';

class Database {
  public client: PrismaClient;

  constructor() {
    this.client = new PrismaClient({
      log: ['warn', 'error'],
    });
  }
}

export default new Database().client;
