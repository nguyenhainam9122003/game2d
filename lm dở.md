# Những phần còn dang dở (so với rachoi.app)

> File này tóm tắt nhanh "còn thiếu gì". Chi tiết đầy đủ + lịch sử quyết định nằm ở `PLAN.md` mục "Giai đoạn 3b".

## Đã xong

- **Đủ 12/12 game** của rachoi.app: XO, Cờ ca-rô, Ô ăn quan, Cờ vua, Cờ tướng, Cờ vây, Bắn tàu, Bắn máy bay, Đô-mi-nô, Sudoku, Ghép số, Tìm số.
- **4 mức độ khó** (Dễ/Vừa/Khó/Cao thủ) cho các game đối kháng.
- **"Tuỳ chọn chơi"**: chọn đồng hồ (không tính giờ / đồng hồ cờ / theo nước) + số ván — và đã nối vào ván chơi thật (đếm ngược, tự thua khi hết giờ, tự đi nước dễ khi hết giờ theo-nước, vòng lặp nhiều ván) cho **chế độ chơi với máy + 2 người chung máy**.
- **Nút "Tạm dừng"** trong ván: Chơi tiếp / Âm thanh / Luật chơi / Chơi lại / Cài đặt / Rời trò chơi — đã có ở cả 12 game.
- **Nút "Nước trước" / "Nước sau"** (xem lại lịch sử nước đi, không sửa được ván đang chơi) — **mới làm xong cho Cờ vua thôi**, chưa làm cho 6 game còn lại (XO, Caro, Ô ăn quan, Cờ tướng, Cờ vây, Đô-mi-nô — đây là các game có khái niệm "nước đi" rõ ràng nên dùng chung được `useMoveHistory` đã viết sẵn; Bắn tàu/Bắn máy bay/3 puzzle 1 người không hợp với tính năng này). Lúc làm có gặp đúng loại lỗi React đã gặp ở phần đồng hồ trước đó (gọi `setState` của hook khác bên trong updater của `setState` khác) — đã sửa và test lại kỹ ở Cờ vua.

## Còn thiếu — ưu tiên theo thứ tự

1. **Đồng hồ + số ván chưa áp dụng cho chế độ Online** — hiện chỉ chạy ở "chơi với máy" và "2 người chung máy". Chơi online vẫn không có đồng hồ/nhiều ván. Cần đồng bộ qua server (Durable Object) nên khó hơn, chưa làm.

2. **Chrome trong ván còn thiếu** (mục C trong PLAN.md):
   - Nút "Nước trước" / "Nước sau" — **đã xong cho Cờ vua, còn 6 game nữa cần làm theo** (xem mục "Đã xong" ở trên).
   - Nút "Đi lại" — xin undo một nước — chưa làm (khác với xem lại lịch sử: cái này sửa thật trạng thái ván).
   - Panel chat có "Trả lời nhanh" (câu gợi ý bấm nhanh) — hiện chat online đã có nhưng chưa có khung câu trả lời nhanh kiểu rachoi.

3. **Màn Home còn thiếu** (mục D):
   - Nút "Sắp xếp" — kéo-thả đổi thứ tự game.
   - Nút "Vào bàn" ở header — vào thẳng 1 bàn online bằng mã mà không cần chọn game trước.

4. **Màn "Tôi" (Cài đặt) còn sơ sài** (mục E) — hiện chỉ có theme/màu nhấn/họa tiết nền. Rachoi.app có thêm:
   - Avatar + biệt danh đổi được, "Ván đã chơi", "Chia sẻ app".
   - Cỡ chữ (Thường/Lớn).
   - Nhóm Âm thanh (nhạc nền — hiện chỉ có nút bật/tắt trong Tạm dừng, chưa có nhạc/âm thanh thật nào được phát).
   - Nhóm Cảm giác: Hiệu ứng, Rung, Gợi ý khi bí.
   - Nhóm Trò chuyện: bật/tắt chat, hình dán, người đã chặn.
   - Nhóm Riêng tư: gửi số liệu ẩn danh, "Những gì được gửi".
   - Nhóm Trợ giúp: Gửi góp ý, Khắc phục mất kết nối, link web.

5. **Giản lược riêng từng game, ghi nợ lại để làm sau nếu cần** (không bắt buộc, chỉ liệt kê):
   - **Cờ vây**: cố định bàn 9×9 (chưa chọn được 13×13/19×19), chưa có giai đoạn đánh dấu quân chết — phải ăn quân thật trước khi bỏ lượt 2 lần.
   - **Bắn tàu / Bắn máy bay**: chưa có tuỳ chọn "mỗi lượt 1 phát" (luôn theo luật mặc định trúng-thì-bắn-tiếp cho Bắn tàu); chưa có tính năng "Ghi chú" (đánh dấu ô nghi ngờ trên bàn đối phương).
   - **Đô-mi-nô**: chưa có 2 biến thể bốc bài "bốc tới khi nối được" / "không bốc" (luôn dùng "bốc đúng 1 quân").
   - **Sudoku**: giới hạn số lần sai cố định 3 (rachoi cho chọn 1/3/5); chưa có 2 chế độ nhiều người (Đua / Cùng giải).
   - **Ghép số, Tìm số**: chưa có chế độ nhiều người (Đua, hoặc tranh số/mỗi người 1 tờ).
   - **3 game puzzle 1 người** (Sudoku, Ghép số, Tìm số) hiện không implement interface `Game<S,M>` dùng chung → chưa chơi online/2 người được, màn chọn chế độ đã ẩn hẳn 2 dòng đó để tránh gây hiểu lầm, nhưng về sau nếu muốn làm multiplayer cho 3 game này sẽ cần thiết kế riêng.

6. **Go-live thật sự**: domain + deploy Cloudflare Worker (server online) — đã ghi nợ từ Giai đoạn 2, chưa làm. Hiện tại server online chỉ chạy local qua `wrangler dev`.

## Gợi ý thứ tự làm tiếp

Theo đúng mức độ ảnh hưởng tới "đã sẵn sàng golive chưa": mục 2 (chrome trong ván) và mục 4 (màn Tôi) là 2 mảng lớn còn lại ảnh hưởng tới trải nghiệm chung mọi game. Mục 1 (đồng hồ online) và mục 5 (giản lược riêng từng game) có thể để sau vì ít ảnh hưởng tới cảm nhận "đã đủ tính năng" ban đầu. Mục 6 (deploy thật) là bước cuối cùng, cần tài khoản Cloudflare + domain của bạn nên phải có bạn tham gia, không tự làm được.
