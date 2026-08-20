# Đảo thứ tự tiêu đề trang Luật chơi

## Mục tiêu

Trên trang Luật chơi, hiển thị tiêu đề **LUẬT CHƠI** trước và dòng phụ **Theo luật BWF** bên dưới. Các trang khác giữ nguyên thứ tự dòng phụ trước tiêu đề.

## Thiết kế

- Mở rộng `PageHeader` bằng tùy chọn trình bày để đặt `eyebrow` sau `title`; mặc định vẫn là thứ tự hiện tại nhằm bảo toàn mọi màn hình đang dùng component.
- Trang `/rules` bật tùy chọn mới, tạo thứ tự: nút quay lại — **LUẬT CHƠI** — **Theo luật BWF**.
- Dùng chính chuỗi tiêu đề viết hoa `LUẬT CHƠI`, không chỉ biến đổi bằng CSS; mục **Luật chơi** trong menu vẫn giữ cách viết hiện tại.
- Không sao chép header riêng, không thay đổi nội dung, route hoặc hành vi nút quay lại.
- Khi eyebrow nằm sau tiêu đề, thêm class trạng thái cho hàng header và căn các phần tử theo mép trên; nút quay lại nhờ đó ngang với dòng **LUẬT CHƠI**, thay vì căn giữa toàn bộ khối hai dòng.
- Tăng khoảng cách phía trên của **Theo luật BWF** từ `6px` lên `9px` để dòng phụ xích xuống nhẹ. Kiểu căn chỉnh này chỉ kích hoạt khi `eyebrowAfterTitle` được bật.

## Kiểm thử

- Xác nhận DOM của trang Luật chơi đặt heading “LUẬT CHƠI” trước dòng “Theo luật BWF”.
- Xác nhận một trang dùng `PageHeader` mặc định vẫn đặt eyebrow trước heading.
- Kiểm tra trực quan nút quay lại ngang với tiêu đề và dòng BWF không dính tiêu đề trên chiều rộng điện thoại.
- Chạy lint, toàn bộ Vitest, production build và kiểm tra trực quan trên chiều rộng điện thoại.
