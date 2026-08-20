# Thu nhỏ sơ đồ sân trên điện thoại

## Mục tiêu

Thu nhỏ nhẹ sơ đồ sân cầu lông để người dùng nhìn được nhiều phần sân hơn trên màn hình điện thoại mà không thay đổi nội dung hoặc chức năng.

## Thiết kế

- Ở màn hình rộng tối đa `480px`, đặt `.court-figure` rộng `78%` vùng nội dung và căn giữa bằng margin tự động. Với vùng nội dung phổ biến trên điện thoại, khung sân sẽ rộng khoảng `250px` để ưu tiên hiển thị trọn sơ đồ phía trên thanh điều hướng dưới.
- Trên màn hình lớn hơn, giữ nguyên kích thước hiện tại.
- Giữ nguyên tỷ lệ SVG, chữ, đường biên, màu sắc, chú giải và toàn bộ dữ liệu luật.
- Không thêm nút phóng to, thu nhỏ, xoay sân hoặc trạng thái tương tác.

## Kiểm thử

- Xác nhận khung sân dùng `78%` và căn giữa ở viewport điện thoại; không tràn ngang.
- Xác nhận sơ đồ vẫn rộng `100%` vùng chứa trên màn hình lớn hơn `480px`.
- Kiểm tra cả tab Đánh đơn và Đánh đôi, chạy lint, Vitest và production build.
