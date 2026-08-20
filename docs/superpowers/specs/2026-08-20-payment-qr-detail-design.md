# DK Badminton — Thiết kế QR nhận tiền trong chi tiết buổi chơi

## Mục tiêu

Hiển thị QR nhận tiền tĩnh của chủ ứng dụng ngay trên trang **Chi tiết buổi chơi**, không mã hóa sẵn số tiền chuyển khoản và không cần kết nối mạng. Ở màn hình dọc thông thường của OPPO, người dùng nhìn thấy thông tin buổi chơi, mức đóng, QR và các nút thao tác trong cùng vùng nhìn đầu tiên.

Thiết kế được người dùng duyệt là phương án **QR thu gọn trong ô trắng, nằm bên phải tiền nữ/nam trong bảng kết quả**.

## Phạm vi

- Dùng ảnh QR do người dùng cung cấp tại thời điểm triển khai.
- Ảnh được đóng gói cục bộ trong ứng dụng; không tải lên máy chủ và không gọi API tạo QR.
- QR chỉ chứa thông tin tài khoản nhận tiền đã có trong ảnh, không thêm số tiền của buổi chơi.
- Chỉ trang chi tiết buổi chơi hiển thị QR. Màn hình tạo/sửa và kết quả tính thử không hiển thị QR.
- Không thêm bảng hoặc trường dữ liệu vào IndexedDB.
- Không thay đổi công thức chia tiền, tài khoản đăng nhập hoặc dữ liệu buổi chơi.

## Tài nguyên QR

- Sao chép ảnh người dùng cung cấp vào `src/assets/payment-qr.jpg` để Vite và Capacitor đóng gói cùng ứng dụng.
- Giữ nguyên ảnh gốc nhằm bảo toàn khả năng quét và phần thông tin tài khoản khi xem lớn.
- Chế độ thu gọn dùng một khung cắt bằng CSS để chỉ hiện mã QR cùng logo thanh toán. Không tạo lại hoặc chỉnh sửa nội dung mã.
- Không ghi số tài khoản hoặc tên chủ tài khoản trực tiếp trong source dạng text.
- Vì ảnh được đóng gói trong APK, bất kỳ người nào có quyền sử dụng hoặc giải nén APK đều có thể xem ảnh QR; đây là hành vi mong đợi của tính năng nhận tiền.

## Bố cục trang chi tiết

Giữ thứ tự tổng thể:

1. Tiêu đề ngày chơi và nút sửa.
2. Lưới thông tin 2×2: người chơi, tiền sân, tiền cầu và số giờ chơi.
3. Ghi chú dạng một dòng gọn; nội dung dài được rút gọn và có thể mở xem đầy đủ.
4. Bảng kết quả tích hợp QR.
5. Nút **Sửa & tính lại** và **Xóa**.
6. Thanh điều hướng dưới.

Trong bảng kết quả:

- Tiêu đề **Mỗi người cần đóng** nằm ở trên.
- Phần chính chia hai cột:
  - Cột trái hiển thị tiền nữ và tiền nam; trường hợp chỉ có một giới tính hiển thị **Mỗi người**.
  - Cột phải là ô QR nền trắng, bo góc, có nhãn **QR nhận tiền**.
- Bốn giá trị tiền cầu, tổng chi phí, tổng thu và tiền dư nằm thành hàng gọn phía dưới.
- Ở chiều rộng điện thoại phổ biến, QR thu gọn khoảng 130–136px. Ở màn hình rất hẹp, kích thước có thể giảm nhưng không dưới 112px.
- Tối ưu “không cần cuộn” cho màn hình dọc của OPPO với dữ liệu thông thường. Màn hình ngang hoặc nội dung trợ năng/phông chữ phóng lớn vẫn được phép cuộn để không cắt mất dữ liệu.

## Tương tác QR

- Toàn bộ ô QR là một nút có nhãn trợ năng **Mở QR nhận tiền**.
- Chạm QR mở hộp thoại ở giữa màn hình bằng portal, nằm trên thanh điều hướng.
- Hộp thoại hiển thị toàn bộ ảnh gốc ở kích thước lớn nhất có thể trong viewport, giữ đúng tỉ lệ và vùng trắng quanh QR.
- Có nút **Đóng** rõ ràng; đồng thời hỗ trợ chạm nền tối và phím `Escape` trên web.
- Khóa cuộn nền khi hộp thoại mở.
- Không có nút chuyển khoản, không tự mở ứng dụng ngân hàng và không truyền dữ liệu ra ngoài.

## Cấu trúc code

- Tạo `PaymentQr.tsx` chịu trách nhiệm:
  - ảnh thu gọn;
  - trạng thái mở/đóng;
  - hộp thoại ảnh đầy đủ;
  - trợ năng và khóa cuộn nền.
- Mở rộng `ResultPanel` bằng một prop tùy chọn cho nội dung QR. Khi không truyền prop, bố cục hiện tại của form tạo/sửa giữ nguyên.
- `SessionDetailPage` truyền `PaymentQr` vào `ResultPanel`.
- CSS dùng modifier riêng, ví dụ `result-panel--with-qr`, để chỉ nén bảng kết quả trên trang chi tiết.
- Không sao chép logic tính tiền sang component QR.

## Trạng thái và lỗi

- Ảnh được bundle khi build nên bình thường không có trạng thái tải mạng.
- Nếu ảnh không tải được, ô QR hiển thị thông báo ngắn **Không thể hiển thị QR** và phần chi tiết còn lại vẫn hoạt động.
- QR không phụ thuộc tài khoản local hoặc bản ghi buổi chơi; mọi tài khoản trên bản cài đặt này dùng cùng QR nhận tiền của chủ ứng dụng.

## Kiểm thử

- Trang tạo/sửa vẫn hiển thị `ResultPanel` cũ và không có QR.
- Trang chi tiết hiển thị đúng ảnh QR thu gọn với buổi chỉ nam, chỉ nữ và có cả hai giới tính.
- Chạm QR mở ảnh đầy đủ; nút đóng, chạm nền và `Escape` đều đóng được.
- Modal nằm giữa viewport và nằm trên thanh điều hướng dưới.
- QR không chứa hoặc nhận prop số tiền của buổi chơi.
- Không phát sinh request mạng khi mở QR.
- Kiểm tra trực quan ở chiều rộng 320px, 390px và viewport OPPO dọc; không tràn ngang.
- Xác minh mã có thể được một thiết bị khác quét ở chế độ thu gọn và chế độ toàn màn hình.
- Chạy lint, toàn bộ Vitest, production build, Capacitor sync và Gradle debug build trước khi cài đè lên OPPO.

## Ngoài phạm vi

- Chọn hoặc đổi QR trong giao diện.
- QR riêng theo từng tài khoản.
- Tạo VietQR từ ngân hàng/số tài khoản.
- Điền sẵn số tiền hoặc nội dung chuyển khoản.
- Lưu trạng thái đã thanh toán của người chơi.
