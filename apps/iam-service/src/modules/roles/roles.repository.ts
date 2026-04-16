import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/infrastructure/prisma/prisma.service";

@Injectable()
export class RolesRepository {
  constructor(private prisma: PrismaService) {}

  async findByName(roleName: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma.$replica; // Ưu tiên đọc từ Slave
    return client.role.findUnique({ where: { roleName } });
  }

  async assignRoleToUser(userId: string, roleName: string) {
    const role = await this.findByName(roleName);
    if (!role) throw new NotFoundException('Role not found');
    return this.prisma.userRole.create({
      data: {
        userId,
        roleId: role.roleId,
      },
    });
  }
}