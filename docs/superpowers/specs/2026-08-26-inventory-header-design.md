# Tinh gọn tiêu đề trang Kho cầu

## Phạm vi

- Xóa dòng phụ `Theo dõi cầu của bạn` khỏi đầu trang Kho cầu.
- Giữ nguyên tiêu đề `Kho cầu` và nút quay lại.
- Dùng hành vi sẵn có của `PageHeader`: khi không truyền `eyebrow`, tiêu đề tự căn giữa theo chiều dọc với nút quay lại và không để lại khoảng trống.
- Không thay đổi header của các trang khác, dữ liệu kho hoặc logic ứng dụng.

## Xác minh

- Trang `/inventory` chỉ hiển thị `Kho cầu` cạnh nút quay lại.
- Không còn chuỗi `Theo dõi cầu của bạn` trong source hoặc giao diện.
- Chạy lint và production build.
