# Hiển thị tài khoản trong menu

## Mục tiêu

Thêm một thẻ thông tin ở đầu menu tùy chọn để người dùng luôn nhận biết tài khoản đang đăng nhập. Thẻ hiển thị nhãn **Thông tin tài khoản** và email ngay bên dưới.

## Thiết kế

- `HeaderMenu` lấy `account` từ `useAuth()` cùng với hàm `logout` hiện tại.
- Thẻ tài khoản nằm sau tiêu đề **Tùy chọn**, trước mục **Luật chơi** và **Đăng xuất**.
- Thẻ chỉ hiển thị thông tin, không phải nút, liên kết hoặc `menuitem`; bấm vào không điều hướng và không đóng menu.
- Dùng biểu tượng tài khoản ở bên trái, nhãn **Thông tin tài khoản** ở dòng trên và `account.email` ở dòng dưới.
- Email dài được phép xuống dòng hoặc ngắt an toàn trong chiều rộng dropdown, không làm menu tràn màn hình.
- Giữ nguyên toàn bộ hành vi mở/đóng menu, điều hướng Luật chơi và đăng xuất. Không thêm route, database hay khả năng sửa tài khoản.

## Trợ năng và kiểm thử

- Nội dung email đọc được bằng trình đọc màn hình như văn bản thông thường; thẻ không nhận focus vì không có hành động.
- Kiểm thử xác nhận email của tài khoản đăng nhập xuất hiện khi mở menu, thẻ không phải mục có thể bấm và các mục Luật chơi/Đăng xuất vẫn hoạt động.
- Chạy lint, toàn bộ Vitest và production build; kiểm tra menu ở chiều rộng điện thoại để bảo đảm email không tràn.

## Khả năng mở rộng

Sau này có thể đổi thẻ thành liên kết tới trang tài khoản mà không thay đổi dữ liệu đăng nhập. Phiên bản này chỉ hiển thị email.
