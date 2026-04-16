# 🛡️ Capital Coffee - IAM Service (Identity & Access Management)

Dịch vụ IAM là "trái tim" bảo mật của hệ thống Microservices Capital Coffee. Được thiết kế để quản lý danh tính, phân quyền và kiểm soát truy cập với khả năng chịu tải cao.

## 🚀 Công nghệ sử dụng (Tech Stack)
* **Framework:** NestJS (Node.js)
* **ORM:** Prisma 7.x (Sử dụng Driver Adapter cho PostgreSQL)
* **Database:** PostgreSQL Cluster (Master-Slave Replication)
* **Security:** Argon2 (Password Hashing), Passport.js (JWT & Local Strategy)
* **Validation:** Class-validator & Class-transformer
* **Architecture:** Clean Architecture & Repository Pattern

## 🏗️ Kiến trúc hạ tầng (Infrastructure)
Dịch vụ áp dụng mô hình **Master-Slave Replication** để tối ưu hóa hiệu năng:
* **Master (Port 5433):** Chuyên xử lý các lệnh Ghi (Write) như Register, Update Profile, Revoke Token.
* **Slave (Port 5434):** Chuyên xử lý các lệnh Đọc (Read) như Validate User, Check Permission, Fetch Profile.
* **Database Transaction:** Đảm bảo tính nguyên tử (Atomicity) cho các luồng phức tạp (ví dụ: Tạo User đi kèm gán Role và ghi Audit Log).



## 🔐 Tính năng cốt lõi (Core Features)
1.  **RBAC (Role-Based Access Control):** Phân quyền dựa trên vai trò (SYSTEM_ADMIN, BRANCH_MANAGER, CUSTOMER...).
2.  **Token Rotation:** Cơ chế làm mới Token an toàn, tự động thu hồi (Revoke) Refresh Token cũ để chống tấn công chiếm quyền phiên.
3.  **Audit Logging:** Ghi lại vết mọi thao tác nhạy cảm (Login, Register, Logout) phục vụ kiểm toán và bảo mật.
4.  **Session Management:** Quản lý phiên làm việc theo thời gian thực, hỗ trợ theo dõi IP và thiết bị truy cập.
5.  **Multi-Identity Login:** Cho phép đăng nhập linh hoạt bằng cả Email hoặc Số điện thoại.

## 🛠️ Kỹ năng chuyên sâu đã áp dụng
* **Prisma 7 Adapter:** Khởi tạo kết nối thông qua `pg.Pool` thay vì URL trực tiếp, tối ưu cho môi trường High-performance.
* **Repository Pattern:** Tách biệt lớp logic nghiệp vụ và lớp truy xuất dữ liệu, giúp code dễ dàng Unit Test và bảo trì.
* **Security Best Practices:** Loại bỏ dữ liệu nhạy cảm (password hash) ngay tại tầng Service, áp dụng cơ chế băm mật khẩu hiện đại nhất (Argon2).
