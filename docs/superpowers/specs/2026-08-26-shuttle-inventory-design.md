# DK Badminton — Quản lý Kho cầu

## Mục tiêu

Thêm kho cầu riêng cho từng tài khoản. Mỗi buổi chơi bắt buộc chọn cầu từ kho cá nhân hoặc do người khác mang; chỉ cầu từ kho mới làm thay đổi tồn kho. Giá của buổi mới lấy từ lần nạp gần nhất và được lưu snapshot trong buổi chơi.

## Dữ liệu và giao dịch

- IndexedDB version 4 thêm `shuttleTransactions` gồm giao dịch nạp và sử dụng; tồn kho, tổng đã dùng và giá mới nhất được suy ra từ sổ giao dịch.
- Buổi chơi thêm `shuttleSource: inventory | external`. Buổi cũ migration thành `external` và không tạo biến động kho.
- Tạo, sửa và xóa buổi từ kho cập nhật session và giao dịch sử dụng trong cùng một Dexie transaction. Sửa hoàn giao dịch cũ trước khi áp dụng dữ liệu mới; xóa hoàn cầu.
- Sửa/xóa lần nạp bị chặn nếu làm tồn kho âm. Mọi thao tác kiểm tra `ownerId`.

## Giao diện

- Menu thêm **Kho cầu** và route bảo vệ `/inventory`.
- Trang kho hiển thị cầu đang có, cầu đã đánh, giá mới nhất, form nạp và lịch sử giao dịch. Giao dịch nạp được sửa/xóa; giao dịch sử dụng liên kết tới buổi chơi.
- Form buổi chơi bắt buộc chọn nguồn. Nguồn kho tự điền và khóa giá, hiển thị tồn; nguồn ngoài nhập giá thủ công. Kho trống dẫn người dùng sang trang nạp.
- Chi tiết buổi chơi thêm nhãn nguồn dưới phép tính tiền cầu; trang chủ và thẻ lịch sử giữ nguyên bố cục.

## Xác minh

- Kiểm thử migration, cách ly tài khoản, tổng hợp kho, giá mới nhất, nạp/sửa/xóa, thiếu tồn và toàn bộ điều chỉnh kho qua CRUD buổi chơi.
- Kiểm thử UI menu, trang kho, form nguồn, trạng thái trống và chi tiết nguồn cầu.
- Chạy lint, Vitest, production build, Capacitor sync và Gradle debug build.
