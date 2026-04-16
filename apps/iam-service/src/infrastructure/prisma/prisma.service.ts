import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly readClient: PrismaClient;

  constructor() {
    // 1. Thiết lập cho Master (Ghi - Cổng 5433)
    const masterPool = new Pool({ connectionString: process.env.DATABASE_URL });
    const masterAdapter = new PrismaPg(masterPool);
    super({ adapter: masterAdapter }); 

    // 2. Thiết lập cho Slave (Đọc - Cổng 5434)
    const slavePool = new Pool({ connectionString: process.env.READ_DATABASE_URL });
    const slaveAdapter = new PrismaPg(slavePool);
    this.readClient = new PrismaClient({ adapter: slaveAdapter });
  }

  async onModuleInit() {
    // Prisma 7 tự động kết nối qua adapter, nhưng gọi connect để đảm bảo an toàn
    await this.$connect();
    await (this.readClient as any).$connect();
  }

  // Luồng điều hướng thông minh để đáp ứng yêu cầu Scalability [cite: 240]
  readonly $replica = this.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const readOps = ['findUnique', 'findFirst', 'findMany', 'count', 'aggregate', 'groupBy'];
          
          if (readOps.includes(operation)) {
            // Điều hướng lệnh Đọc sang Slave (Port 5434)
            return (this.readClient as any)[model][operation](args);
          }
          // Điều hướng lệnh Ghi sang Master (Port 5433)
          return query(args);
        },
      },
    },
  });

  async onModuleDestroy() {
    await this.$disconnect();
    await (this.readClient as any).$disconnect();
  }
}