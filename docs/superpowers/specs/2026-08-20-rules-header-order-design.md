# Đảo thứ tự tiêu đề trang Luật chơi

## Mục tiêu

Trên trang Luật chơi, hiển thị tiêu đề **Luật chơi** trước và dòng phụ **Theo luật BWF** bên dưới. Các trang khác giữ nguyên thứ tự dòng phụ trước tiêu đề.

## Thiết kế

- Mở rộng `PageHeader` bằng tùy chọn trình bày để đặt `eyebrow` sau `title`; mặc định vẫn là thứ tự hiện tại nhằm bảo toàn mọi màn hình đang dùng component.
- Trang `/rules` bật tùy chọn mới, tạo thứ tự: nút quay lại — **Luật chơi** — **Theo luật BWF**.
- Không sao chép header riêng, không thay đổi nội dung, route hoặc hành vi nút quay lại.
- Bổ sung khoảng cách CSS phù hợp khi eyebrow nằm sau tiêu đề để hai dòng không dính nhau.

## Kiểm thử

- Xác nhận DOM của trang Luật chơi đặt heading trước dòng “Theo luật BWF”.
- Xác nhận một trang dùng `PageHeader` mặc định vẫn đặt eyebrow trước heading.
- Chạy lint, toàn bộ Vitest, production build và kiểm tra trực quan trên chiều rộng điện thoại.
