import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/infrastructure/prisma/prisma.service";

export interface CreateRefreshTokenData {
  token: string;
  userId: string;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokensRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateRefreshTokenData, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.refreshToken.create({ data: {
        token: data.token,
        expiresAt: data.expiresAt,
        user: {
            connect: {userId: data.userId}
        }
    } });
  }

  async findByToken(token: string) {
    return this.prisma.$replica.refreshToken.findUnique({ where: { token } });
  }

  async revoke(token: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.refreshToken.update({
      where: { token },
      data: { revoked: true },
    });
  }
}