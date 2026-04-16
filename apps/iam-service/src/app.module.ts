import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { PrismaService } from './infrastructure/prisma/prisma.service';

@Module({
  imports: [AuthModule, UsersModule, RolesModule, PermissionsModule, SessionsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
