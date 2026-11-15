# DK Badminton

Ứng dụng React + Capacitor Android để quản lý buổi chơi cầu lông, chia tiền sân/cầu và ăn uống, quản lý kho cầu, lưu QR nhận tiền và chia sẻ kết quả bằng ảnh.

Tài khoản và dữ liệu được lưu trên từng thiết bị bằng IndexedDB. Gmail OTP dùng Google Apps Script để xác minh khi đăng ký hoặc quên mật khẩu; hiện chưa có tài khoản trực tuyến hay đồng bộ dữ liệu giữa các thiết bị.

## Chức năng hiện có

- Đăng ký Gmail với OTP, đăng nhập và đặt lại mật khẩu cho tài khoản đã có trên thiết bị.
- Tạo, sửa, xóa buổi chơi; tính tiền theo số nam/nữ và thời gian chơi.
- Chia hóa đơn ăn/uống tùy chọn, tách riêng người có tham gia.
- Quản lý kho cầu: nạp cầu, giá cầu, sử dụng/hoàn cầu theo buổi chơi.
- Chọn và cắt QR nhận tiền theo từng buổi; buổi mới kế thừa QR gần nhất.
- Xem trước, chia sẻ và lưu ảnh kết quả; Android hỗ trợ lưu vào album DK Badminton.
- Lịch sử, tổng quan và thông tin luật chơi.

## Công nghệ

- React + TypeScript + Vite
- Capacitor Android
- Dexie / IndexedDB
- React Hook Form + Zod
- Vitest + Testing Library
- Google Apps Script / MailApp cho Gmail OTP

## Chạy local

Yêu cầu Node.js 22.13 trở lên trong nhánh 22.x và npm. Workflow GitHub dùng Node.js 22.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev -- --host 127.0.0.1
```

Mở `http://127.0.0.1:5173/`. Chỉnh `VITE_OTP_ENDPOINT` trong `.env.local` thành URL triển khai Apps Script của bạn rồi khởi động lại Vite. Tệp `.env.local` không được đưa vào Git.

## Cấu hình Gmail OTP

1. Tạo dự án Google Apps Script bằng Gmail chuyên gửi OTP.
2. Dán mã từ `google-apps-script/Code.gs`, chạy `authorizeGmail` và cấp quyền gửi thư.
3. Triển khai dạng Web app: chạy dưới tài khoản của bạn, cho phép người dùng ứng dụng truy cập endpoint.
4. Điền URL kết thúc bằng `/exec` vào `.env.local`:

```dotenv
VITE_OTP_ENDPOINT=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

OTP gồm 6 số, thời hạn 5 phút, gửi lại sau 60 giây và tối đa 5 lần nhập sai. Đăng ký và quên mật khẩu cần Internet; dữ liệu buổi chơi vẫn nằm trong IndexedDB.

Biến có tiền tố `VITE_` được đưa vào mã phía client khi build. URL endpoint không phải khóa bí mật: không đặt mật khẩu Gmail, OAuth token hoặc private key vào các biến này. Pepper của OTP được tạo trong Script Properties của Apps Script.

## QR mặc định và dữ liệu riêng

Repo công khai chỉ chứa ảnh mẫu `src/assets/payment-qr-placeholder.svg`, không có thông tin ngân hàng. Bản clone mới có thể thêm QR bằng nút **Đổi QR** trong chi tiết buổi chơi.

Để sử dụng QR mặc định riêng cho một bản build, đặt ảnh tại `src/assets/payment-qr.jpg`. Tệp này bị Git bỏ qua và được ưu tiên khi có trên máy build. Nếu không có tệp đó, ứng dụng dùng ảnh mẫu. QR đã lưu riêng cho từng buổi trong IndexedDB vẫn được sử dụng như bình thường.

Không đẩy `.env*` riêng, khóa ký Android, `local.properties`, dữ liệu xuất từ thiết bị, APK, thư mục `dist` hoặc `node_modules` lên repo. Chỉ `.env.example` được đưa vào Git.

## Kiểm tra chất lượng

```powershell
npm run lint
npm test
npm run build
```

Các kiểm thử OTP dùng mock, không gửi thư thật. Workflow `.github/workflows/ci.yml` chạy cài đặt từ lockfile, lint, toàn bộ Vitest và production build trên GitHub; không triển khai web, Apps Script hoặc APK.

## Build Android

Cài Android Studio, Android SDK và JDK 21. Mở thư mục `android` để Android Studio thiết lập SDK cho máy hiện tại; đường dẫn SDK cục bộ không được commit.

```powershell
npm run android:sync
npm run android:open
```

Build APK debug bằng dòng lệnh trên Windows:

```powershell
npm run android:build
```

Trên macOS/Linux, sau `npm run android:sync`, chạy `./gradlew assembleDebug` trong thư mục `android`.

APK nằm tại `android/app/build/outputs/apk/debug/app-debug.apk`. Để cập nhật và giữ dữ liệu, cài đè bằng `adb install -r` với cùng application ID và khóa ký. Khóa debug trên máy khác có thể khác khóa cũ; cần giữ khóa ký hiện tại nếu tiếp tục cập nhật bản đã cài.

## Lưu ý dữ liệu

- Mỗi tài khoản chỉ truy cập dữ liệu local thuộc ID của mình trên thiết bị hiện tại.
- Mật khẩu được băm bằng PBKDF2-HMAC-SHA256 với salt riêng; mặc định 600.000 vòng, không lưu mật khẩu thô.
- Quên mật khẩu chỉ áp dụng cho tài khoản `@gmail.com` đã tồn tại trên thiết bị.
- Đăng nhập cùng Gmail trên máy khác không khôi phục lịch sử, kho cầu hoặc QR.
- Gỡ app, xóa dữ liệu ứng dụng hoặc xóa dữ liệu trình duyệt có thể làm mất toàn bộ dữ liệu local.
- Đưa mã nguồn lên GitHub không sao lưu dữ liệu đang có trên điện thoại.

## Repository

[maiiikhanhs/DK_Badminton](https://github.com/maiiikhanhs/DK_Badminton)

Bản đồ/GPS chọn sân và đồng bộ tài khoản trực tuyến chưa được triển khai trong phiên bản hiện tại.
