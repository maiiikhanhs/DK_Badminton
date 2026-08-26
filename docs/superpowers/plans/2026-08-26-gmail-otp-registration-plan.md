# Kế hoạch triển khai xác minh Gmail bằng OTP

## Chặng 1 — Google Apps Script

1. Thêm source `google-apps-script/Code.gs` có `doGet`, `doPost`, gửi OTP và xác minh OTP.
2. Chỉ nhận địa chỉ `@gmail.com`; OTP 6 số, sống 5 phút, cooldown 60 giây và tối đa 5 lần sai.
3. Lưu bản băm OTP trong `CacheService`; Gmail gửi qua `GmailApp`.
4. Cấp quyền Gmail, triển khai Web App chạy dưới quyền chủ sở hữu và lấy URL `/exec`.
5. Kiểm tra health endpoint và thử gửi/xác minh với Gmail nhận thử.

## Chặng 2 — Tích hợp DK Badminton

1. Thêm cấu hình endpoint qua biến môi trường và file mẫu không chứa thông tin tài khoản Google.
2. Tạo `OtpService` tách biệt, chuẩn hóa phản hồi và timeout; Android dùng HTTP native, Vite local dùng proxy theo endpoint cấu hình.
3. Mở rộng `AuthService` bằng phép kiểm tra email tồn tại trước khi gửi, nhưng giữ `register` là điểm duy nhất ghi tài khoản.
4. Đổi RegisterPage thành luồng nhập thông tin → gửi OTP → xác minh → tạo tài khoản local.
5. Giữ trạng thái Gmail/mật khẩu chờ xác minh trong React memory; không ghi mật khẩu tạm xuống storage.
6. Bổ sung countdown gửi lại, lỗi mạng, mã sai/hết hạn và quay lại sửa Gmail.

## Chặng 3 — Kiểm thử và build

1. Unit test OtpService và chuẩn hóa lỗi.
2. Auth/UI test: Gmail không hợp lệ, không ghi trước xác minh, OTP đúng tạo một tài khoản, tài khoản cũ không đổi.
3. Chạy lint, toàn bộ Vitest và production build.
4. Đồng bộ Capacitor và build APK debug; cài đè khi OPPO được kết nối.

