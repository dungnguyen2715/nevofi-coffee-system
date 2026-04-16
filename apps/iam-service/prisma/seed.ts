import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg'; // Thêm dòng này
import { Pool } from 'pg';                    // Thêm dòng này
import * as argon2 from 'argon2';

// 1. Tạo kết nối Pool tới Master DB (Cổng 5433)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// 2. Truyền adapter vào PrismaClient theo đúng Interface của Prisma 7
const prisma = new PrismaClient({ adapter });
async function main() {
  // Default permissions (IAM bounded context)
  const permissions = [
    { permissionName: 'iam:users:read', resource: 'users', action: 'read' },
    { permissionName: 'iam:users:create', resource: 'users', action: 'create' },
    { permissionName: 'iam:users:update', resource: 'users', action: 'update' },
    { permissionName: 'iam:users:delete', resource: 'users', action: 'delete' },
    { permissionName: 'iam:roles:read', resource: 'roles', action: 'read' },
    { permissionName: 'iam:roles:create', resource: 'roles', action: 'create' },
    { permissionName: 'iam:roles:update', resource: 'roles', action: 'update' },
    { permissionName: 'iam:permissions:read', resource: 'permissions', action: 'read' },
    { permissionName: 'iam:permissions:assign', resource: 'permissions', action: 'assign' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
    //   where: { permissionName: p.permissionName },
    where: { resource_action: { resource: p.resource, action: p.action } },
    update: {},
    create: p,
    });
  }

  // Default roles (matches SRS + seed requirement)
  const roles = [
    { roleName: 'SYSTEM_ADMIN', description: 'Supreme authority - full IAM + global oversight' },
    { roleName: 'BRANCH_ADMIN', description: 'Branch-level admin' },
    { roleName: 'BRANCH_MANAGER', description: 'Branch manager' },
    { roleName: 'STAFF', description: 'Branch staff' },
    { roleName: 'CUSTOMER', description: 'End customer' },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { roleName: r.roleName },
      update: {},
      create: r,
    });
  }

  // Assign all permissions to SYSTEM_ADMIN
  const systemAdmin = await prisma.role.findUnique({ where: { roleName: 'SYSTEM_ADMIN' } });
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: systemAdmin!.roleId, permissionId: perm.permissionId } },
      update: {},
      create: { roleId: systemAdmin!.roleId, permissionId: perm.permissionId },
    });
  }

  // Super admin user
  const hashed = await argon2.hash('admin123');
  await prisma.user.upsert({
    where: { email: 'admin@nevoficoffee.vn' },
    update: {},
    create: {
      email: 'admin@nevoficoffee.vn',
      passwordHash: hashed,
      fullName: 'System Administrator',
      phone: '0987654321',
      status: 'ACTIVE',
    },
  });

  // Assign SYSTEM_ADMIN role
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@nevoficoffee.vn' } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser!.userId, roleId: systemAdmin!.roleId } },
    update: {},
    create: { userId: adminUser!.userId, roleId: systemAdmin!.roleId },
  });

  console.log('✅ IAM seed completed');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());