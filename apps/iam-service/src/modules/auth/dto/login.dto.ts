import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({ example: 'admin@nevoficoffee.vn', description: 'Email hoặc Số điện thoại' })
  @IsNotEmpty({ message: 'Danh tính đăng nhập không được để trống' })
  @IsString()
  @Transform(({ value }) => value?.trim().toLowerCase())
  loginIdentity: string;

  @ApiProperty({ example: 'Password123!' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString()
  password: string;
}