import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ example: 'Nguyen Van A', description: 'Họ và tên đầy đủ' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim()) // Tự động xóa khoảng trắng
  fullName: string;

  @ApiProperty({ example: 'admin@nevofilcoffee.vn' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @Transform(({ value }) => value?.trim().toLowerCase()) // Chuyển về chữ thường để tránh lỗi duplicate
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'Tối thiểu 8 ký tự, 1 hoa, 1 thường, 1 số' })
  @IsNotEmpty()
  @MinLength(8, { message: 'Mật khẩu phải từ 8 ký tự trở lên' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { 
    message: 'Mật khẩu phải bao gồm ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số' 
  })
  password: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @Matches(/^(0[3|5|7|8|9])([0-9]{8})$/, { message: 'Số điện thoại Việt Nam không hợp lệ' })
  phone?: string;
}