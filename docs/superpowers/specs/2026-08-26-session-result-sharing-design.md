# DK Badminton — Chia sẻ kết quả buổi chơi bằng ảnh

## Mục tiêu

Trang chi tiết buổi chơi tạo một ảnh PNG có thương hiệu DK Badminton, đầy đủ thông tin buổi chơi, mức đóng, QR nhận tiền và tổng kết. Người dùng xem trước ảnh trước khi chia sẻ qua bảng chia sẻ Android hoặc lưu vào album `Pictures/DK Badminton`.

## Thiết kế

- Biểu tượng góc phải của trang chi tiết chuyển từ sửa sang chia sẻ; nút `Sửa & tính lại` phía dưới giữ nguyên.
- Một component ảnh độc lập được render ngoài màn hình ở chiều rộng 1080px và xuất PNG bằng `html-to-image`. Component chỉ đọc snapshot `BadmintonSession`, không thay đổi database.
- Preview toàn màn hình có trạng thái tạo ảnh, lỗi/thử lại, ảnh có thể cuộn, nút `Lưu ảnh`, nút `Chia sẻ` và xử lý Escape/nút Back Android.
- Chia sẻ native ghi PNG vào cache bằng Capacitor Filesystem rồi mở Capacitor Share. Trình duyệt dùng Web Share khi hỗ trợ và tải ảnh xuống khi không hỗ trợ.
- Lưu ảnh Android dùng plugin nội bộ `SaveImage`: MediaStore trên Android 10+, thư mục Pictures và quyền ghi bộ nhớ trên Android 7–9. Trình duyệt tải PNG xuống máy.

## Nội dung ảnh

- Logo, tên DK Badminton, ngày chơi, người chơi, tiền sân, phép tính tiền cầu, thời lượng và khoảng giờ.
- Ghi chú chỉ xuất hiện khi có nội dung.
- Mức đóng theo snapshot của buổi chơi, bao gồm hai mức ăn/uống và phụ thu nam khi áp dụng.
- QR nhận tiền cục bộ và dải tổng kết gồm tiền ăn/uống khi có, tổng chi phí, tổng thu và tiền đớp.
- Không có thanh điều hướng, nút sửa hoặc nút xóa.

## Xử lý lỗi và kiểm thử

- Không xuất ảnh thiếu logo hoặc QR; lỗi tạo/lưu/chia sẻ không làm mất preview.
- Khóa thao tác lặp khi đang tạo ảnh hoặc đang gọi native API; file cache cũ được dọn ở lần chia sẻ tiếp theo.
- Kiểm thử component cho trường hợp có/không ăn uống, ghi chú, QR và thời gian; kiểm thử dịch vụ cho tên file, xuất 1080px, Filesystem, Share và SaveImage.
- Chạy lint, Vitest, production build, Capacitor sync và Gradle assembleDebug; smoke-test cài đè trên OPPO khi ADB kết nối.
