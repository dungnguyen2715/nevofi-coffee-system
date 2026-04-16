import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private prisma: PrismaService) {}

  // Đọc từ Slave
  async findByEmail(email: string) {
    return this.prisma.$replica.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });
  }

  // Đọc từ Slave - Hỗ trợ login đa năng
  async findByLoginIdentity(loginIdentity: string) {
    return this.prisma.$replica.user.findFirst({
      where: {
        OR: [{ email: loginIdentity }, { phone: loginIdentity }],
      },
      include: { userRoles: { include: { role: true } } },
    });
  }

    async findById(userId: string) {
    return this.prisma.$replica.user.findUnique({
      where: { userId },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });
  }

  // Ghi vào Master (Hỗ trợ Transaction)
  async create(data: Prisma.UserCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.user.create({ data });
  }

  
}