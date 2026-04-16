import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { UsersRepository } from '../users/repository/users.repository';
import { RolesRepository } from '../roles/roles.repository';
import { RefreshTokensRepository } from './repository/refresh-tokens.repository';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private usersRepo: UsersRepository,
    private rolesRepo: RolesRepository,
    private tokenRepo: RefreshTokensRepository,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Check tồn tại (Slave)
    const exists = await this.usersRepo.findByEmail(dto.email);
    if (exists) throw new BadRequestException('Email đã được đăng ký');

    const hashedPassword = await argon2.hash(dto.password);

    // 2. TRANSACTION: Đảm bảo tạo User + Gán Role phải đi cùng nhau
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await this.usersRepo.create({
          email: dto.email,
          fullName: dto.fullName,
          passwordHash: hashedPassword,
          phone: dto.phone,
        }, tx);

        const defaultRole = await this.rolesRepo.findByName('CUSTOMER', tx);
        if (!defaultRole) throw new InternalServerErrorException('Default role not found');

        await tx.userRole.create({
          data: { userId: user.userId, roleId: defaultRole.roleId },
        });

        // Trả về dữ liệu sạch
        const { passwordHash, ...result } = user;
        return result;
      });
    } catch (error) {
      throw new InternalServerErrorException('Lỗi hệ thống khi đăng ký');
    }
  }

  async validateUser(loginIdentity: string, password: string) {
    const user = await this.usersRepo.findByLoginIdentity(loginIdentity);
    if (!user || user.status !== 'ACTIVE') return null;
    
    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) return null;

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.loginIdentity, dto.password);
    if (!user) throw new UnauthorizedException('Thông tin đăng nhập không chính xác');

    // Tạo JWT Payload chuẩn RBAC
    const payload = { 
      sub: user.userId, 
      email: user.email, 
      roles: user.userRoles.map(ur => ur.role.roleName) 
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRATION'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRATION'),
      }),
    ]);

    // Lưu Refresh Token vào Master
    await this.tokenRepo.create({
      token: refreshToken,
      userId: user.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
    });

    return { accessToken, refreshToken, user };
  }

  async refreshToken(oldToken: string) {
    // 1. Kiểm tra token trong DB (Slave)
    const tokenRecord = await this.tokenRepo.findByToken(oldToken);
    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    // 2. Token Rotation: Thu hồi cái cũ, cấp cái mới (Master Transaction)
    return this.prisma.$transaction(async (tx) => {
      await this.tokenRepo.revoke(oldToken, tx);
      
      const user = await this.usersRepo.findByEmail(tokenRecord.userId); // Hoặc findById
      if(!user) throw new UnauthorizedException("Người dùng không tồn tại")
      const payload = { sub: user.userId, email: user.email, roles: user.userRoles.map(ur => ur.role.roleName) };
      
      const newAccessToken = this.jwtService.sign(payload);
      const newRefreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      await this.tokenRepo.create({
        token: newRefreshToken,
        userId: user.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }, tx);

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    });
  }
}