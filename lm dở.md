# Những phần còn dang dở (so với rachoi.app)

> File này tóm tắt nhanh "còn thiếu gì". Chi tiết đầy đủ + lịch sử quyết định nằm ở `PLAN.md` mục "Giai đoạn 3b".

## Đã xong

- **Đủ 12/12 game** của rachoi.app: XO, Cờ ca-rô, Ô ăn quan, Cờ vua, Cờ tướng, Cờ vây, Bắn tàu, Bắn máy bay, Đô-mi-nô, Sudoku, Ghép số, Tìm số.
- **4 mức độ khó** (Dễ/Vừa/Khó/Cao thủ) cho các game đối kháng.
- **"Tuỳ chọn chơi"**: chọn đồng hồ (không tính giờ / đồng hồ cờ / theo nước) + số ván — và đã nối vào ván chơi thật (đếm ngược, tự thua khi hết giờ, tự đi nước dễ khi hết giờ theo-nước, vòng lặp nhiều ván) cho **chế độ chơi với máy + 2 người chung máy**.
- **Chrome trong ván** (mục C, cả 7 game có khái niệm "nước đi": Cờ vua, XO, Caro, Ô ăn quan, Cờ tướng, Cờ vây, Đô-mi-nô):
  - Nút "Tạm dừng": Chơi tiếp / Âm thanh / Luật chơi / Chơi lại / Cài đặt / Rời trò chơi — có ở cả 12 game.
  - Nút "Nước trước" / "Nước sau" (xem lại lịch sử, không đổi được trạng thái ván) — dùng chung `useMoveHistory`. Lúc làm Đô-mi-nô phát hiện bug riêng: `initDomino()` chia bài ngẫu nhiên mỗi lần gọi nên hook replay-từ-đầu bị lỗi "tile not in hand" — sửa bằng cách chốt (ref) đúng bộ bài đã chia của ván hiện tại.
  - Nút "Đi lại" (undo 1 nước, sửa thật trạng thái ván) — chỉ cho chơi với máy (undo nước mình + nước đáp của máy) và 2 người chung máy (undo 1 nước cuối). Thêm `undoToTurn(player)` vào `useMoveHistory` thay vì đếm cố định số nước, vì Đô-mi-nô có lượt máy gồm 2 nước nội bộ (bốc rồi đánh) khi bí.
  - Panel chat "Trả lời nhanh": 5 chip câu gợi ý, gửi qua `net.sendChat` có sẵn. **Lưu ý:** chỉ xác minh qua code + typecheck, chưa test được bằng 2 tab trình duyệt thật trong phiên này do môi trường sandbox rớt kết nối khi mở 2 tab song song (xem mục "Vấn đề đã phát hiện" bên dưới) — nên tự bấm thử 1 lần trên máy thật.
- **Màn Home** (mục D):
  - Nút "Sắp xếp" — giản lược dùng ▲/▼ từng dòng thay vì kéo-thả thật, cùng kết quả cuối (đổi thứ tự, lưu local qua `gameOrderStore.ts`).
  - Nút "Vào bàn" ở header — vào thẳng 1 bàn online bằng mã mà không cần chọn game trước, rời bàn quay về Home đúng (không phải màn chi tiết 1 game ngẫu nhiên).
- **Màn "Tôi"** (mục E) — đầy đủ cấu trúc theo rachoi.app:
  - Hồ sơ: avatar (10 emoji con vật) + biệt danh gõ tự do, "Ván đã chơi" (đếm thật cho cả 12 game), "Chia sẻ Thư Giãn" (Web Share API / copy clipboard).
  - Cỡ chữ (Thường/Lớn) — áp dụng thật qua CSS.
  - Nhóm Âm thanh (Âm thanh trò chơi, Nhạc nền), Cảm giác (Hiệu ứng, Rung, Gợi ý khi bí), Trò chuyện (Bật trò chuyện, Hình dán, Người đã chặn), Riêng tư (Gửi số liệu ẩn danh mặc định tắt, Những gì được gửi), Trợ giúp (Gửi góp ý, Khắc phục mất kết nối, Trang web).
  - **Giản lược quan trọng:** toggle Âm thanh/Nhạc nền/Rung/Hình dán chỉ lưu lựa chọn, **chưa có hành vi thật** (app chưa phát âm thanh/nhạc/rung ở đâu — nối sau khi có asset thật). "Gửi góp ý"/"Gửi số liệu ẩn danh" không có server thật nhận — góp ý chỉ copy clipboard, số liệu ẩn danh chỉ lưu ý muốn. "Người đã chặn" luôn trống vì chưa có tính năng chặn ở đâu trong app. "Trang web" hiện "Chưa có" thay vì bịa link giả vì chưa deploy.
  - Hiệu ứng thật đã nối: Hiệu ứng tắt → tắt CSS transition/animation toàn app; Gợi ý khi bí tắt → ẩn nút Gợi ý của Sudoku; Bật trò chuyện tắt → ẩn khung chat trong màn chơi online.
- **"Tuỳ chọn chơi" mở rộng theo đúng bàn chờ thật của rachoi.app** (đáp ứng `/goal` "cấu hình trò chơi trước khi chơi", làm 2 đợt trong cùng 1 phiên):
  - **Đợt 1**: làm riêng 1 dòng "Tuỳ chọn riêng" thứ 2 bên cạnh "Tuỳ chọn chơi" cho 6 game, với mặc định đoán theo text luật chơi.
  - **Đợt 2 (sau khi xem lại đúng màn hình bàn chờ thật của rachoi qua DOM)**: phát hiện rachoi **chỉ dùng 1 modal "Tuỳ chọn chơi" duy nhất cho mỗi game**, không tách 2 dòng như mình làm — mỗi game hiện đúng những mục liên quan tới nó (không phải lúc nào cũng có đồng hồ/số ván). Đã gộp lại thành 1 modal duy nhất (`PlayOptionsModal.tsx` nhận prop `gameId`, xoá hẳn `GameOptionsModal.tsx`), đồng thời sửa các mặc định sai và bổ sung các mục còn thiếu sau khi so trực tiếp DOM thật:
    - **Bắn máy bay**: mặc định đúng là **15×15·5 máy bay** (lúc trước để nhầm mặc định 10×10 nhỏ).
    - **Ghép số**: mặc định đúng là **ẩn gợi ý cặp** (lúc trước để nhầm mặc định hiện); thêm "Giờ mỗi lượt" (Tắt/12s/30s — hết giờ tự chép số) và "Số lần chép" (3/5/**8**... thật ra mặc định đúng là **5 lần**, không phải 3 như code cũ).
    - **Sudoku**: thay hẳn "giới hạn sai cố định 1/3/5" bằng đúng 2 nhóm của rachoi — "Gợi ý" (Không có/Một/**Ba** mặc định/Năm) và "Báo lỗi" (**Tắt** mặc định — không đánh dấu lỗi gì cả/Chỉ báo — đánh dấu nhưng không thua/Sai 1/Sai 3/Sai 5 — thua khi đủ số lần).
    - **Đô-mi-nô**: thêm "Giờ mỗi lượt" (Tắt/12s/30s, tách khỏi đồng hồ cờ chung vì Đô-mi-nô không có "Đồng hồ cờ" kiểu cờ vua) và "Gợi ý" (bật/tắt — **lưu nhưng chưa có hành vi thật**, chưa làm tính năng gợi ý nước đi).
    - **Tìm số**: thêm hẳn mục mới "Tờ số" (Chung một tờ/Mỗi người một tờ — **chỉ có ý nghĩa khi chơi nhiều người, solo chưa dùng tới**) và "Cỡ tờ số" (25/50/100/200/500/1000, mặc định 25) — đã nối vào `generateNumberHunt(difficulty, sheetSizeOverride)`.
  - Go không có mục "Quân chết" trong modal (dead-stone-marking vẫn là tính năng lớn chưa làm, xem mục "Còn thiếu" bên dưới — không lộ ra 1 setting không có tác dụng thật).
  - Tất cả lưu trong `gameOptionsStore.ts`; `playOptionsStore.ts` thêm `GAMES_WITH_CLOCK`/`GAMES_WITH_MATCH_LENGTH` để modal biết game nào cần hiện đồng hồ kiểu cờ vua / số ván.
  - Đã test tay từng game trong browser sau khi gộp modal + xoá cache localStorage cũ để xác nhận đúng giá trị mặc định mới (không phải giá trị cũ còn sót trong localStorage từ lúc code cũ).

Tất cả mục trên đã test tay trong browser (không lỗi console) + `pnpm typecheck` + `pnpm -r test` (102 test engine) đều qua sau mỗi phần.

## Vấn đề đã phát hiện (tách việc riêng, chưa chắc là bug thật)

Test chơi online bằng 2 tab trình duyệt song song trong môi trường sandbox hiện tại hay bị rớt kết nối (tab tạo phòng báo "Mất kết nối", tab tham gia kẹt ở "đang chờ"). Nghi do React StrictMode gọi effect kết nối WebSocket 2 lần — đã tách thành việc riêng để điều tra kỹ hơn (xem task đã tạo trong phiên, hoặc tìm theo tiêu đề "Điều tra rớt kết nối online khi 2 tab test song song"). Chưa rõ là bug thật hay chỉ nhiễu môi trường test tự động.

## Còn thiếu — ưu tiên theo thứ tự

1. **Đồng hồ + số ván chưa áp dụng cho chế độ Online** — hiện chỉ chạy ở "chơi với máy" và "2 người chung máy". Cần đồng bộ qua server (Durable Object) nên khó hơn, chưa làm.

2. **Giản lược riêng từng game, ghi nợ lại để làm sau nếu cần**:
   - **Ghép số, Tìm số: rachoi.app thật ra CÓ "Chơi với máy"** (bot + chấm điểm cạnh tranh), không chỉ "Chơi một mình" như mình làm — đây là thiếu cả 1 chế độ chơi, không chỉ là setting. Cần thêm bot + logic chấm điểm đua, lớn hơn các việc khác trong danh sách này nên để riêng ưu tiên sau.
   - **Cờ vây**: chọn được cỡ bàn rồi, nhưng chưa có giai đoạn đánh dấu quân chết (chọn Máy đánh dấu / Tự đánh dấu rồi xác nhận trước khi chấm điểm) — phải ăn quân thật trước khi bỏ lượt 2 lần.
   - **Bắn tàu / Bắn máy bay**: chưa có tính năng "Ghi chú" (đánh dấu ô nghi ngờ trên bàn đối phương).
   - **Đô-mi-nô**: "Gợi ý" mới chỉ là setting lưu, chưa có hành vi gợi ý nước đi thật.
   - **Tìm số**: "Tờ số" (chung/riêng) chưa có tác dụng vì chưa có multiplayer; "Cỡ tờ số" lớn (500/1000) sẽ rối vì màn chơi hiện chưa phóng to/kéo được như bản gốc (họ có "chụm 2 ngón phóng to, kéo xem chỗ khác").
   - **Sudoku**: chưa có 2 chế độ nhiều người (Đua / Cùng giải) — vẫn chỉ chơi 1 mình.
   - **3 game puzzle** (Sudoku, Ghép số, Tìm số) hiện không implement interface `Game<S,M>` dùng chung → chưa chơi online được, màn chọn chế độ đã ẩn hẳn dòng đó để tránh gây hiểu lầm.

3. **Go-live thật sự**: domain + deploy Cloudflare Worker (server online) — chưa làm, cần tài khoản Cloudflare + domain của bạn nên phải có bạn tham gia.

## Gợi ý thứ tự làm tiếp

Mục 1 (đồng hồ online) và mục 2 (giản lược riêng từng game) không bắt buộc, ít ảnh hưởng tới cảm nhận "đã đủ tính năng" — làm khi rảnh hoặc khi có người chơi thật yêu cầu cụ thể. Mục 3 (deploy thật) là bước cuối cùng để golive, cần bạn tham gia (tài khoản Cloudflare + domain), không tự làm được.
