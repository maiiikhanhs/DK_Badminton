# QR nhận tiền tùy chỉnh theo buổi chơi

## Mục tiêu

- Cho phép chọn ảnh QR từ Thư viện ảnh ngay tại trang Chi tiết buổi chơi.
- Mỗi buổi giữ đúng QR đã sử dụng; thay QR ở một buổi không làm đổi các buổi cũ.
- QR vừa lưu trở thành QR mặc định cho các buổi được tạo sau.
- Dữ liệu cũ tiếp tục dùng QR đóng sẵn trong app và toàn bộ tính năng hoạt động offline.

## Dữ liệu và lưu trữ

- Tăng IndexedDB lên version 5 và thêm bảng `paymentQrs`:
  - `id`, `ownerId`.
  - `imageBlob`: ảnh PNG vuông đã cắt, không lưu ảnh gốc.
  - `mimeType: 'image/png'`, `width: 1024`, `height: 1024`.
  - `contentHash`: SHA-256 của PNG để tránh lưu trùng trong cùng tài khoản.
  - `createdAt`, `updatedAt`.
- Index bảng: `id`, `ownerId`, `[ownerId+createdAt]`, `&[ownerId+contentHash]`.
- Thêm `paymentQrId: string | null` vào `BadmintonSession`.
- Migration đặt `paymentQrId = null` cho toàn bộ bản ghi cũ. Giá trị `null` luôn dùng ảnh QR mặc định hiện tại trong bundle app.
- Lưu `latestPaymentQrId:<ownerId>` trong bảng `settings`. Khi tạo buổi mới, repository chụp ID hiện tại vào bản ghi; không đọc động khi hiển thị nên các buổi đã lưu không đổi theo mặc định mới.
- `PaymentQrRepository` cung cấp `getForSession`, `saveForSession` và `getLatestId`. Mọi thao tác kiểm tra `ownerId`.
- `saveForSession` chạy một Dexie transaction trên `paymentQrs`, `sessions` và `settings`: tái sử dụng bản ghi nếu hash trùng, cập nhật `session.paymentQrId`, rồi cập nhật QR gần nhất. Nếu bất kỳ bước nào lỗi, QR cũ của buổi vẫn nguyên vẹn.
- Không cung cấp xóa QR hoặc quay về QR mặc định trong phiên bản này. Bản ghi QR cũ được giữ vì có thể vẫn được các buổi trước tham chiếu.

## Chọn và căn chỉnh ảnh

- Nút **Đổi QR** nằm ngay dưới QR thu nhỏ trong bảng **Mỗi người cần đóng**. Chạm trực tiếp QR vẫn mở màn hình xem QR đầy đủ như hiện tại.
- Nút dùng `input type="file" accept="image/png,image/jpeg,image/webp"` để Android mở bộ chọn ảnh hệ thống; không yêu cầu camera.
- Chặn tệp lớn hơn 10 MB, sai loại, ảnh không giải mã được hoặc kích thước nhỏ hơn 256×256 px. Thông báo lỗi tiếng Việt và giữ QR cũ.
- Sau khi chọn, mở màn hình căn chỉnh toàn màn hình:
  - Vùng nhìn và vùng xuất đều là hình vuông 1:1.
  - Ảnh ban đầu dùng chế độ phủ kín khung; người dùng kéo bằng một ngón tay và zoom bằng hai ngón hoặc thanh trượt.
  - Giới hạn zoom/di chuyển để khung không lộ vùng trống; không xoay ảnh và không thêm bộ lọc.
  - **Hủy** đóng màn hình, giải phóng URL ảnh tạm và không lưu.
  - **Dùng QR này** vẽ vùng cắt lên canvas 1024×1024, xuất PNG rồi lưu.
- Trong lúc xử lý/lưu, khóa thao tác lặp và hiện **Đang lưu QR…**. Nếu canvas hoặc IndexedDB lỗi, giữ nguyên màn hình căn chỉnh để người dùng thử lại.

## Hiển thị và chia sẻ

- Tạo hook/component dùng chung để lấy `paymentQrId`, tạo `objectURL` từ Blob và thu hồi URL khi đổi ảnh hoặc unmount.
- `PaymentQr` nhận URL ảnh đã resolve thay vì import cứng. Khi `paymentQrId = null`, dùng asset QR hiện tại.
- Trang chi tiết, modal QR đầy đủ và `ShareResultCard` phải dùng cùng một URL QR đã resolve.
- Trước khi tạo ảnh chia sẻ, tiếp tục chờ ảnh QR tải xong; QR tùy chỉnh được xuất đúng như đang hiển thị.
- Nếu bản ghi QR bị thiếu/hỏng, hiển thị lỗi rõ ràng và không tự thay bằng QR khác, tránh chuyển tiền nhầm. QR mặc định chỉ áp dụng khi `paymentQrId` thật sự là `null`.
- Không thêm QR vào form tạo/sửa, menu tài khoản hoặc database cloud.

## Kiểm thử và nghiệm thu

- Migration v4 → v5 giữ nguyên dữ liệu và đặt QR của buổi cũ thành `null`.
- Repository kiểm tra lưu mới, tái sử dụng ảnh trùng hash, cách ly tài khoản, cập nhật buổi + QR gần nhất nguyên tử và rollback khi lỗi.
- Kiểm thử bộ cắt với ảnh ngang, dọc và vuông; kéo/zoom không để lộ nền; PNG đầu ra đúng 1024×1024.
- UI chặn sai định dạng, ảnh quá 10 MB, ảnh quá nhỏ và ảnh lỗi; Hủy không thay QR; lưu thành công cập nhật ngay trang chi tiết.
- Buổi cũ dùng QR bundle; đổi QR chỉ tác động buổi hiện tại; buổi tạo sau nhận ID gần nhất; các buổi trước vẫn giữ QR cũ.
- Ảnh chia sẻ chứa QR tùy chỉnh và quét được; modal QR hiển thị đúng ảnh đầy đủ.
- Chạy lint, toàn bộ Vitest, production build, Capacitor sync và Gradle debug build; cài đè lên Android sau khi có thiết bị kết nối.

## Giả định đã chốt

- QR chỉ được chọn từ Thư viện ảnh; không dùng camera và không tự nhận diện/xác minh nội dung mã QR.
- Chỉ lưu vùng QR vuông đã cắt, không lưu bố cục ngân hàng hoặc ảnh nguồn.
- Không có nút quay về QR mặc định, thư viện quản lý QR hay xóa QR trong UI.
- Ảnh và quan hệ QR chỉ tồn tại trên thiết bị, trong phạm vi tài khoản hiện tại.
