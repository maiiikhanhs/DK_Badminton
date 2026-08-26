# DK Badminton — Xác minh Gmail bằng OTP khi đăng ký

## Mục tiêu

- Chỉ tài khoản đăng ký mới phải xác minh quyền sở hữu địa chỉ Gmail bằng OTP.
- Tài khoản đã tồn tại trên thiết bị tiếp tục đăng nhập bình thường và không bị yêu cầu xác minh lại.
- Sau lần đăng ký, người dùng vẫn đăng nhập bằng Gmail và mật khẩu như hiện tại.
- Tài khoản, phiên đăng nhập và dữ liệu buổi chơi tiếp tục được lưu offline bằng Dexie.

## Phạm vi

- Chỉ chấp nhận địa chỉ kết thúc chính xác bằng `@gmail.com` sau khi trim và chuyển lowercase.
- Google Apps Script chạy bằng một Gmail riêng của DK Badminton.
- `MailApp` gửi email từ Gmail của app nhưng không có quyền đọc hộp thư; `CacheService` lưu OTP tạm thời.
- Không thêm Supabase, Firebase, Google Sheets hoặc database online.
- Đăng ký mới cần kết nối mạng; đăng nhập và sử dụng tài khoản đã tạo vẫn hoạt động offline.

## Kiến trúc

Luồng đăng ký:

1. Người dùng nhập Gmail, mật khẩu và xác nhận mật khẩu.
2. App kiểm tra dữ liệu và kiểm tra Gmail chưa tồn tại trên thiết bị.
3. App gọi Google Apps Script với thao tác `sendOtp`.
4. Apps Script sinh OTP 6 số, lưu bản băm vào `CacheService` và gửi mã qua Gmail của app.
5. App chuyển sang màn hình xác minh và chỉ giữ Gmail/mật khẩu tạm trong bộ nhớ.
6. Người dùng nhập mã; app gọi thao tác `verifyOtp`.
7. Apps Script trả kết quả xác minh.
8. Chỉ khi xác minh thành công, app mới gọi `AuthService.register`, băm mật khẩu bằng PBKDF2 và ghi tài khoản vào Dexie.
9. Tài khoản được đăng nhập và chuyển tới Trang chủ.

Endpoint Apps Script nhận JSON qua `doPost(e)` và trả JSON bằng `ContentService`. `doGet()` chỉ trả trạng thái hoạt động, không gửi hoặc xác minh OTP.

## Quy tắc OTP

- OTP gồm đúng 6 chữ số.
- OTP có hiệu lực 5 phút.
- Mỗi Gmail phải chờ 60 giây trước khi yêu cầu mã tiếp theo.
- Mỗi mã cho phép tối đa 5 lần nhập sai; vượt giới hạn phải gửi mã mới.
- Gửi mã mới vô hiệu hóa mã cũ.
- Xác minh thành công xóa OTP khỏi cache và mã không thể dùng lại.
- Cache lưu bản băm của OTP, thời điểm hết hạn và số lần nhập sai; không lưu OTP thô.
- Khóa Apps Script được dùng khi gửi hoặc xác minh để hạn chế thao tác đồng thời làm sai trạng thái.
- Nếu Google thu hồi cache trước thời hạn, app coi mã đã hết hạn và cho phép gửi mã mới.

## Giao diện

### Tạo tài khoản

- Giữ ba trường Gmail, Mật khẩu và Nhập lại mật khẩu.
- Nút chính đổi thành **Gửi mã xác minh**.
- Khi đang gửi, khóa form và hiển thị **Đang gửi mã…**.
- Không cho gửi nếu Gmail không thuộc `@gmail.com`, mật khẩu dưới 8 ký tự hoặc xác nhận không khớp.

### Xác minh Gmail

- Hiển thị tiêu đề **Xác minh Gmail** và địa chỉ đang được xác minh.
- Một ô nhập OTP dạng numeric, giới hạn 6 chữ số.
- Nút **Xác minh** bị khóa khi chưa đủ 6 số hoặc đang xử lý.
- Hiển thị bộ đếm **Gửi lại mã sau 60 giây**, sau đó đổi thành nút **Gửi lại mã**.
- Có nút quay lại để sửa Gmail. Quay lại hoặc tải lại app sẽ xóa thông tin đăng ký tạm.
- Không ghi mật khẩu tạm vào Dexie, localStorage, URL hoặc log.

## Tích hợp với Auth hiện tại

- `AuthService.register` tiếp tục là điểm duy nhất tạo tài khoản và băm mật khẩu.
- Thêm dịch vụ OTP riêng để gọi `sendOtp` và `verifyOtp`; dịch vụ này không truy cập database.
- React giữ trạng thái đăng ký đang chờ xác minh trong bộ nhớ.
- Trước khi gửi OTP và trước khi tạo tài khoản, app kiểm tra lại email trùng để xử lý trường hợp cạnh tranh.
- Không migration bảng `accounts`; tài khoản cũ không cần thêm cờ xác minh.
- Không thay đổi đăng nhập, khôi phục phiên hoặc đăng xuất.

## Cấu hình và triển khai

- Gmail gửi OTP là Gmail cá nhân chuyên dụng, không dùng chung với tài khoản cá nhân khác.
- Apps Script được triển khai dạng Web App, chạy với quyền của chủ sở hữu và cho phép app chưa đăng nhập Google truy cập.
- URL Web App được đặt trong cấu hình môi trường của DK Badminton, không ghi trực tiếp rải rác trong component.
- Không đưa mật khẩu Gmail, mã khôi phục hoặc OAuth token vào source hay APK.
- Khi cập nhật Apps Script, tạo deployment/version mới và cập nhật URL nếu Google thay đổi URL triển khai.

## Xử lý lỗi

- Không có mạng hoặc endpoint lỗi: giữ nguyên form và cho phép thử lại.
- Gmail gửi lại quá sớm: hiển thị thời gian còn lại.
- OTP sai: hiển thị thông báo và số lần còn lại.
- OTP hết hạn hoặc vượt số lần sai: yêu cầu gửi mã mới.
- Gmail đã đăng ký trong lúc đang xác minh: không tạo tài khoản trùng.
- Phản hồi Apps Script sai định dạng: coi là lỗi dịch vụ, không tạo tài khoản.
- Không phân biệt công khai Gmail đã có hay chưa trong phản hồi của dịch vụ OTP; kiểm tra trùng local vẫn dùng thông báo hiện tại.

## Kiểm thử

- Apps Script: Gmail hợp lệ/không hợp lệ, cooldown, mã đúng/sai, hết hạn, giới hạn lần nhập, gửi lại vô hiệu mã cũ và dùng một lần.
- OTP client: lỗi mạng, timeout, phản hồi hỏng và chuẩn hóa lỗi tiếng Việt.
- UI: chỉ nhận `@gmail.com`, chuyển đúng sang màn hình OTP, bộ đếm gửi lại, quay lại xóa dữ liệu tạm và khóa nút khi xử lý.
- Auth: tài khoản chưa xác minh không được ghi; OTP đúng tạo đúng một tài khoản; email trùng bị chặn lại trước khi lưu.
- Hồi quy: tài khoản cũ vẫn đăng nhập, khôi phục phiên và đọc toàn bộ dữ liệu cũ.
- Build: lint, Vitest, production build, Capacitor sync và Gradle debug build.

## Giới hạn đã chấp nhận

- Endpoint Apps Script công khai có thể bị người khác gọi nếu tìm thấy URL; cooldown theo Gmail giúp giảm lạm dụng nhưng không thay thế hệ thống chống bot chuyên dụng.
- Gmail và Apps Script có hạn mức gửi; giải pháp phù hợp app cá nhân hoặc nhóm nhỏ, không dành cho lượng người dùng lớn.
- OTP chỉ xác minh email trong luồng chính thức của app. Vì tài khoản và dữ liệu đều local, người sửa APK hoặc dữ liệu thiết bị vẫn có thể bỏ qua kiểm tra phía giao diện.
- Gỡ app vẫn làm mất tài khoản và lịch sử; OTP không tạo đồng bộ nhiều thiết bị hoặc khôi phục dữ liệu.
