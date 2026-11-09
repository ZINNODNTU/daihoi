# V28 — Đánh số ghế theo hàng ngang, không tính ô trống và lối đi

**Cập nhật:** 09/11/2026. Workspace local: `D:\daihoi`. Không cần migration Supabase.

## Quy tắc

1. Đánh số **01, 02, 03... từ trái sang phải** trong từng hàng ngang (A, B, C...). Sang hàng mới bắt đầu lại từ 01.
2. Chỉ **những ô đang có ghế thực** được tính số. Ghế **đại biểu** (xanh) và **khách mời** (tím) dùng chung một dãy số trong hàng.
3. **Ô trống và lối đi không được đánh số, không làm tăng số ghế**. Cột lưới C1, C2... chỉ dùng xác định vị trí để vẽ, không phải số ghế.
4. Ghế đã khóa vẫn là ghế vật lý nên giữ số; không được phân đại biểu vào ghế khóa.
5. Mã ghế được tự cập nhật theo số ghế mới, ví dụ `G-A-01`, `G-A-02`, `G-A-03`, khi cần tránh mã trùng với ghế bên ngoài lưới, hệ thống thêm hậu tố duy nhất.
6. **ID ghế, vị trí x/y, loại ghế, trạng thái khóa và phân công người ngồi không thay đổi khi chỉ đổi số**. Giao diện sơ đồ, file phân ghế Excel và thẻ đại biểu đều dùng mã/số đã lưu trong Supabase.

## Ví dụ

| Cột lưới | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hàng A (bố trí) | Đại biểu | Đại biểu | Trống | Lối đi | Khách mời | Trống | Đại biểu | Trống |
| **Số ghế hiển thị** | **01** | **02** | — | — | **03** | — | **04** | — |

Không còn hiện 01, 02, 05, 07 như mã cột lưới cũ.

## Áp dụng cho sơ đồ

- **Sơ đồ mới**: khi tô ghế, xóa ghế, chọn mẫu lối đi giữa hoặc đổi kích thước lưới, số ghế tính lại liên tục trong hàng.
- **Sơ đồ đã tạo theo quy tắc cũ**: mở ở **Admin → Sơ đồ hội trường**; trình chỉnh sửa phát hiện và chuẩn hóa nhãn của ghế lưới, báo **Có thay đổi chưa lưu**. Nhấn **Lưu sơ đồ** để ghi thật vào Supabase. Chưa bấm Lưu thì số ghế công bố cho đại biểu vẫn giữ như cũ.
- Nếu việc đổi số ảnh hưởng tới các ghế đã phân công, hệ thống xác nhận lại trước khi lưu; ID và người ngồi vẫn giữ nguyên, nhưng **mã ghế trên thẻ và Excel sẽ đổi**.
- Sao chép sơ đồ từ Đại hội khác và áp dụng thư viện mẫu cũng chuẩn hóa lại số ghế lưới, không sao chép người ngồi.
- Ghế canvas tự do nằm ngoài lưới giữ nguyên mã/số thủ công. Khu ghế sinh tự do với lối đi bằng `aisleAfter` vốn đã đánh số nối tiếp theo số ghế thực khi tạo khu; quy tắc chuẩn hóa tự động V28 chỉ dành cho **lưới** để không tự thay các mã VIP/khu tùy chỉnh.

## Kiểm thử

- `tests/seating-numbering-v28.test.mjs`: kiểm tra lối đi/ô trống, trộn hai loại ghế, giữ UUID phân công, ghế khóa, chuẩn hóa sơ đồ cũ, tránh trùng mã, UI và Excel.
- `tests/seating-grid.test.mjs`: cập nhật kỳ vọng cũ (số cột) thành kỳ vọng mới (số ghế thực).
- Kiểm thử sau sửa: `npm run lint`, `node --test tests/*.test.mjs`, `npm run build`, `git diff --check`.
- Không tự ý cập nhật ghế thật trên Supabase để test vì có thể đang dùng cho phiên điểm danh.

**Trạng thái:** mã nguồn local; chưa push GitHub hoặc Vercel.
