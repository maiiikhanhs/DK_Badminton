# Tinh gọn tiêu đề trang Luật chơi

## Mục tiêu

Xóa hoàn toàn dòng **Theo luật BWF**. Header trang Luật chơi chỉ còn nút quay lại và tiêu đề **Luật chơi**, được căn cân đối trên một hàng.

## Thiết kế

- Trang `/rules` gọi `PageHeader` chỉ với tiêu đề **Luật chơi** và nút quay lại; không truyền `eyebrow`.
- Xóa tùy chọn `eyebrowAfterTitle` cùng các class CSS liên quan vì không còn màn hình nào sử dụng. `PageHeader` trở lại cấu trúc mặc định: eyebrow tùy chọn luôn nằm trước tiêu đề.
- Nút quay lại và tiêu đề được căn giữa theo chiều dọc trong cùng hàng, giữ nút `42px`, khoảng cách ngang `12px` và tiêu đề khoảng `2.6rem`.
- Riêng trang Luật chơi giảm khoảng cách dưới header từ `24px` xuống `20px` để nối nhịp hợp lý với khối nội dung đầu tiên.
- Không thay đổi tên mục menu, route, hành vi nút quay lại hoặc header các trang khác.

## Kiểm thử

- Xác nhận trang Luật chơi có heading “Luật chơi” và không còn văn bản “Theo luật BWF”.
- Xác nhận `PageHeader` mặc định vẫn hỗ trợ eyebrow trước heading trên các trang khác.
- Kiểm tra trực quan nút quay lại ngang giữa tiêu đề và khoảng cách xuống khối nội dung hợp lý trên chiều rộng điện thoại.
- Chạy lint, toàn bộ Vitest, production build và kiểm tra trực quan trên chiều rộng điện thoại.
