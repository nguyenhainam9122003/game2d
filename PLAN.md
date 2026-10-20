# PLAN: Game chơi cùng bạn (lấy cảm hứng từ Recess / Ra Chơi)

> File này là "bộ nhớ" của dự án. Đặt nó ở thư mục gốc của project. Mỗi lần làm việc với Claude, hãy nhắc Claude đọc `PLAN.md` trước.

## 0. Trạng thái & quyết định

- [x] **Chọn hướng build:** Bắt đầu với Web (React + Vite) để code & test không cần Mac. Engine dùng chung sẽ tái sử dụng được cho Hướng A (Tauri) hoặc Hướng B (Expo) sau này khi đóng gói app.
- Không có máy Mac → code và test trên web + Android, bản iOS build trên cloud rồi test qua TestFlight.
- Ngôn ngữ: TypeScript. Giao diện: tiếng Việt + tiếng Anh.

## 1. Tech stack

| Phần | Hướng A (Tauri) | Hướng B (Expo) |
|---|---|---|
| UI | React + TS + Vite | React Native + TS (Expo Router) |
| App native | Tauri v2 (Rust) | Expo / React Native |
| Build iOS khi không có Mac | GitHub Actions macOS runner | EAS Build |
| Luật game | TS thuần, dùng chung | TS thuần, dùng chung |
| Chơi online | Cloudflare Workers + Durable Objects (WebSocket) | như bên trái |
| Chơi gần (offline) | Plugin Tauri: MultipeerConnectivity (iOS) / Nearby Connections (Android) | Expo native module, cùng các API đó |
| Bot | Minimax / alpha-beta chạy trong Web Worker | như bên trái |
| Khác | qrcode, i18next, Zustand, Vitest | như bên trái |

## 2. Kiến trúc cốt lõi (3 lớp tách biệt)

### 2.1 Game engine (pure, dùng chung web/app/server)
```ts
interface Game<S, M> {
  id: string
  init(options): S
  legalMoves(state: S, player): M[]
  applyMove(state: S, move: M): S        // pure, không side effect
  result(state: S): 'ongoing' | { winner } | 'draw'
}
```
Thêm game mới chỉ cần viết thêm 1 file engine và 1 component bàn cờ.

### 2.2 Transport (cùng interface `send / onMessage / onDisconnect`)
- `LocalTransport`: chơi với máy, hoặc 2 người chung 1 máy
- `WebSocketTransport`: chơi online qua mã bàn
- `NearbyTransport`: Bluetooth / Wi‑Fi

### 2.3 Đồng bộ
- Chỉ gửi **nước đi**, không gửi cả bàn cờ. Hai bên đều tự chạy `applyMove` và kiểm tra hợp lệ.
- Mỗi tin nhắn có số thứ tự (seq) để kết nối lại và bù các nước bị lỡ.
- Không có tài khoản: mỗi máy tự sinh một ID ẩn danh và lưu cục bộ.

## 3. Cấu trúc thư mục dự kiến
```
/
├─ PLAN.md
├─ packages/
│  ├─ engine/        # luật game + bot (TS thuần) + test
│  └─ protocol/      # kiểu tin nhắn giữa các máy
├─ apps/
│  ├─ client/        # React (web + Tauri) hoặc Expo
│  └─ server/        # Cloudflare Worker + Durable Objects
└─ .github/workflows/ # build iOS/Android trên cloud
```

## 4. Lộ trình

### Giai đoạn 1: Nền tảng (1–2 tuần)
- [x] Khởi tạo monorepo (pnpm workspaces)
- [x] Engine Cờ XO + Cờ ca-rô, kèm unit test
- [x] Bot cho XO và ca-rô
- [x] UI: màn hình chọn game, chơi với máy, 2 người chung 1 máy
- [x] i18n vi/en, theme

### Giai đoạn 2: Chơi online (2 tuần)
- [x] Worker + Durable Object: tạo bàn, mã 5 ký tự, chuyển tiếp nước đi (server xác thực mọi nước đi bằng chính engine dùng chung)
- [x] Mở bàn / nhập mã / link mời / QR
- [x] Chat, chơi lại, kết nối lại (đồng bộ lại lịch sử nước đi khi mất mạng/tải lại trang)
- [ ] Đổi game giữa chừng ván online (chưa làm — coi là việc nhỏ của sau)
- [ ] Deploy bản web thật (cần tài khoản Cloudflare + domain của bạn)

### Giai đoạn 3: Game lớn (2–4 tuần)
- [x] Ô ăn quan — engine + bot (alpha-beta) + chơi với máy/2 người/online
- [x] Cờ vua — luật đầy đủ (chiếu/chiếu bí/hòa cờ, nhập thành, bắt tốt qua đường, phong cấp) + bot + chơi với máy/2 người/online
- [x] Cờ tướng — luật đầy đủ (tướng/sĩ/tượng/mã/xe/pháo/tốt, luật mặt tướng "lộ mặt", chiếu bí/hết nước đều thua) + bot alpha-beta + chơi với máy/2 người/online
- [x] Bot 4 mức cho mọi game đã làm (dễ/trung bình/khó/cao thủ — giới hạn độ sâu + ngẫu nhiên ở mức dễ) — khớp đúng 4 mức của rachoi.app (🐣🦊🐯🐲)
- [ ] Đồng hồ cờ (tuỳ chọn)

### Giai đoạn 3b: Clone đầy đủ rachoi.app (bắt đầu 2026-10-19)

> Mục tiêu: mọi nút/tính năng trên rachoi.app đều có bản tương đương trên "Thư Giãn" (phần web; bỏ qua Bluetooth/Nearby/app Mac/iOS/Android vì đó là tính năng native, coi là việc của Giai đoạn 4-5). Checklist dưới đây lấy từ khảo sát trực tiếp rachoi.app ngày 2026-10-19.

**A. 12 game (rachoi.app có đúng 12 game ở `/play`) — ĐÃ LÀM ĐỦ 12/12 (hoàn tất 2026-10-19):**
- [x] Cờ XO (`tic-tac-toe`)
- [x] Cờ ca-rô / Gomoku (`gomoku`)
- [x] Ô ăn quan (`o-an-quan`)
- [x] Cờ vua (`chess`)
- [x] **Cờ tướng** (`xiangqi`) — xong 2026-10-19: engine `packages/engine/src/games/xiangqi.ts` (perft(1)=44, perft(2)=1920 khớp giá trị tham chiếu chuẩn của cờ tướng), bot `xiangqiBot.ts`, `XiangqiBoard.tsx` + `XiangqiGame.tsx`, nối đủ registry client/server + protocol `GameId` + locale vi/en. Test: luật mã (chân mã), tượng (mắt tượng + không qua sông), pháo (ăn qua đúng 1 ngòi), tốt (chỉ đi ngang sau khi qua sông), chiếu bí kèm luật "lộ mặt tướng". Đã test trong browser thật (chơi với máy mức Trung bình) — nước đi, bot trả lời, không lỗi console.
- [x] **Cờ vây** (`go`) — xong 2026-10-19: engine `packages/engine/src/games/go.ts` (khí/bắt quân, luật ko đơn giản so-sánh-thế-cờ-trước, tính điểm kiểu Trung Quốc quân+đất, komi trắng +7.5 nên không bao giờ hòa), bot `goBot.ts` (không tìm kiếm sâu như cờ vua/tướng vì hệ số nhánh quá lớn — heuristic ăn quân + khí + nhìn trước 1 nước ở mức khó/cao thủ), `GoBoard.tsx` + `GoGame.tsx` (có nút Bỏ lượt + hiển thị điểm Đen/Trắng trực tiếp). **Giản lược có ghi chú:** bàn cố định 9×9 (chưa có UI chọn 9/13/19 — nằm trong mục B "Tuỳ chọn chơi"), và **không có** giai đoạn "đánh dấu quân chết" tương tác như rachoi.app — quân còn trên bàn khi kết thúc luôn tính là sống, nên muốn kết thúc sạch thì phải ăn hẳn quân chết trước khi bỏ lượt 2 lần liên tiếp (không chỉ vây là đủ). 7 test (bắt quân, tự tử bị cấm, ăn quân ở điểm tưởng như tự tử, luật ko, tính điểm, kết thúc ván) đều qua, test trong browser thật (chơi với máy mức Trung bình, đặt quân + bỏ lượt) hoạt động đúng.
- [x] **Bắn máy bay** (`plane-battle`) — xong 2026-10-19: engine `packages/engine/src/games/planeBattle.ts`, tái dùng gần hết kiến trúc của Bắn tàu (đặt tàu mã hoá thành 1 nước đi, giao thức move-log dùng chung) nhưng khác 2 điểm luật quan trọng: (1) máy bay xoay được cả 4 hướng (lên/phải/xuống/trái) thay vì chỉ ngang/dọc như tàu, (2) chỉ bắn trúng ô đầu mới "rụng" cả máy bay — bắn trúng ô khác chỉ báo trúng chứ không loại máy bay, và trúng/hụt đều không được bắn thêm (khác tàu — tàu trúng thì bắn tiếp). Tái dùng nguyên `BattleshipBoard.tsx` cho hiển thị (cách hiện trúng/hụt giống hệt, không lộ hình dạng máy bay kể cả khi đã rụng — khớp đúng luật "bắn trúng đầu thì chỉ lộ ô đầu"). Hỗ trợ 2 cỡ bàn qua tham số `variant` (`small`=10×10/3 máy bay mặc định, `large`=15×15/5 máy bay — nhưng UI chưa có chỗ chọn, giống giản lược đã ghi ở Cờ vây). 9 test qua (hình dạng máy bay đúng ở cả 4 hướng, chặn chồng/tràn bàn, không có lượt thêm dù trúng, chỉ rụng khi trúng đầu, thắng khi rụng hết, bot). Đã test trong browser thật (random xếp máy bay, bắn, bot phản công đúng luật không có lượt thêm) hoạt động tốt. **Chưa làm:** tính năng "Ghi chú" (đánh dấu ô nghi ngờ/vẽ nháp hình máy bay trên bàn đối phương) — đây là tiện ích cá nhân không ảnh hưởng luật chơi, để sau nếu cần.
- [x] **Tìm số** (`number-hunt`) — xong 2026-10-19 — **game cuối cùng trong 12 game, hoàn tất mục A**: engine `packages/engine/src/games/numberHunt.ts` — rải ngẫu nhiên N số (15/25/40/60 theo độ khó) lên một "tờ" ảo, dùng rejection-sampling giữ khoảng cách tối thiểu giữa các số để đỡ chồng lên nhau. `NumberHuntGame.tsx`: chạm đúng số kế tiếp (1, rồi 2, rồi 3...) mới tính, chạm sai thì bỏ qua không phạt gì (đúng luật "chạm số khác thì không tính"), đồng hồ bấm giờ chạy tới khi xong. 3 test qua (đúng số lượng theo độ khó, đánh số 1..N đúng thứ tự trong biên tờ giấy, tốc độ sinh đủ nhanh). Đã test trong browser thật (chạm sai không tính, chạm đúng thứ tự tính tiến, xong hết thì dừng đồng hồ và báo thời gian) hoạt động tốt. **Chưa làm (ghi nợ mục B):** 2 chế độ nhiều người "Chung một tờ" (tranh số) và "Mỗi người một tờ" (đua) — cùng giản lược solo-only như Sudoku/Ghép số.
- [x] **Đô-mi-nô** (`domino`) — xong 2026-10-19: engine `packages/engine/src/games/domino.ts` (bộ 28 quân đôi-sáu chuẩn, chia 7/người, bí thì bốc đúng 1 quân rồi bắt buộc đánh nếu nối được — chưa làm 2 biến thể "bốc tới khi nối được"/"không bốc", xem mục B; bí mà hết bài úp thì tính điểm theo tổng nút bài trên tay), bot `dominoBot.ts` (ưu tiên đánh quân đôi trước vì khó đánh về sau + ưu tiên quân nặng nút + để lại đầu bài hiếm gặp hơn cho đối thủ — chỉ dùng thông tin công khai: bài đã đánh + bài trên tay mình, không đọc bài úp/bài đối thủ), `DominoBoard.tsx` (hiển thị dãy bài đã đánh + bài trên tay dạng nút bấm, tự hỏi chọn đầu nối khi 1 quân nối được cả 2 đầu khác giá trị) + `DominoGame.tsx` (nút Bốc/Qua chỉ hiện khi đó là lựa chọn duy nhất, đúng luật bắt buộc). Bài đối phương về mặt kỹ thuật nằm trong state đồng bộ giống Bắn tàu/Bắn máy bay (xem được qua devtools, UI không hiển thị) — cùng một giản lược đã chấp nhận. 12 test qua (đúng 28 quân, chỉ nối được đúng đầu, có 2 lựa chọn đầu khi quân nối được cả 2 đầu khác giá trị, gộp lại 1 lựa chọn khi 2 đầu cùng giá trị, bắt buộc bốc/qua đúng lúc, thắng khi hết bài, tính điểm khi bí, bot). Đã test trong browser thật (đánh quân, bot đáp lại đúng luật, đếm bài đối phương/bài úp cập nhật đúng) hoạt động tốt.
- [x] **Sudoku** (`sudoku`) — xong 2026-10-19: engine `packages/engine/src/games/sudoku.ts` — **khác kiến trúc mọi game trước**: Sudoku không phải game 2 người đối kháng nên KHÔNG dùng interface `Game<S,M>` chung (không có currentPlayer/legalMoves/applyMove kiểu đối kháng) — chỉ là hàm sinh đề (backtracking tạo bảng đầy đủ ngẫu nhiên rồi bớt ô theo đúng luật "đề phải có nghiệm duy nhất", test nghiệm duy nhất bằng cách đếm nghiệm dừng sớm ở 2) + hàm kiểm tra trùng số/đã giải xong. Độ khó = số ô cho sẵn (42/34/28/24 cho dễ/vừa/khó/cao thủ) — cách làm đơn giản hoá, không phải chấm độ khó theo kỹ thuật suy luận thật. `SudokuBoard.tsx` + `SudokuGame.tsx`: chọn ô, bấm số để điền (bấm lại số đó thì xóa), chế độ Ghi nháp, nút Gợi ý (giới hạn 3 lần, hiện cố định — chưa đọc từ "Tuỳ chọn chơi"), đếm số lần sai (giới hạn cố định 3 — rachoi cho chọn 1/3/5, mình chưa làm chọn được), tô màu số trùng hàng/cột/khối. 8 test qua (sinh đề hợp lệ + nghiệm duy nhất cho cả 4 mức, phát hiện trùng số, nhận biết giải xong). **Chưa làm (ghi nợ rõ trong mục B ở trên):** 2 chế độ nhiều người "Đua"/"Cùng giải" (cả local lẫn online) — vì vậy màn chọn chế độ của Sudoku đã ẩn hẳn 2 dòng "2 người chung 1 máy"/"Chơi online" (xem `SOLO_ONLY_GAMES` trong `gameMeta.ts`) thay vì hiện ra rồi không hoạt động; chưa cho chọn cỡ giới hạn sai 1/3/5. Đã test trong browser thật (điền số đúng/sai, đếm sai cập nhật, gợi ý điền đúng và trừ lượt, ghi nháp hiện đúng số) hoạt động tốt.
- [x] **Ghép số** (`number-match`) — xong 2026-10-19: engine `packages/engine/src/games/numberMatch.ts` — cũng không dùng `Game<S,M>` chung như Sudoku (lại là puzzle 1 người trong bản này). Phần khó nhất là luật "kề nhau": ngang đi theo đúng thứ tự đọc trái→phải nối vòng cuối hàng sang đầu hàng sau (dùng bước +1/-1 trên mảng phẳng — tự động nối vòng); dọc/chéo thì bước theo hàng/cột thật (không nối vòng, dừng khi ra khỏi biên cột) — cả hai đều "bỏ qua" ô đã gạch để tìm ô sống gần nhất. Mỗi độ khó chỉnh số hàng ban đầu (3/4/5/6 hàng × 9 cột), số lần chép cố định 3 lần (rachoi cho tùy chỉnh, ghi nợ ở mục B). `NumberMatchBoard.tsx` + `NumberMatchGame.tsx`: chạm 1 số để chọn, các số ghép được tự sáng lên (mặc định hiện gợi ý — đúng mặc định của rachoi, chưa làm tùy chọn ẩn gợi ý cho khó hơn), chạm số sáng để gạch cặp, nút "+ Chép số". 16 test qua (8 hướng kề nhau, bỏ qua ô đã gạch, nối vòng ngang đúng mà không lẫn sang chéo, ghép/chép/thắng/kẹt). Đã test trong browser thật (chọn số → gợi ý sáng đúng số ghép được → gạch cặp → chép số nhân đôi phần còn lại đúng) hoạt động tốt. Cùng giản lược "ẩn 2 dòng chơi nhiều người" như Sudoku (`SOLO_ONLY_GAMES`).
- [x] **Bắn tàu** (`battleship`) — xong 2026-10-19: engine `packages/engine/src/games/battleship.ts` (10×10, 5 tàu 5/4/3/3/2 ô, trúng thì bắn tiếp, hụt thì đổi lượt — đặt tàu được mã hoá thành 1 "nước đi" số nguyên để đi qua đúng hạ tầng move-log/đồng bộ dùng chung với mọi game khác thay vì cần giao thức riêng), bot `battleshipBot.ts` (dò ô ngẫu nhiên ở Dễ; chế độ "săn" quanh phát trúng ở Vừa trở lên; dò theo bàn cờ caro xen kẽ + bám theo đường thẳng 2 phát trúng liên tiếp ở Khó/Cao thủ — bot chỉ dùng thông tin từ chính các phát bắn của nó, không "ăn gian" đọc vị trí tàu chưa lộ của đối thủ), `BattleshipBoard.tsx` (hiển thị bàn mình đầy đủ + bàn địch chỉ hiện trúng/hụt, giấu vị trí tàu chưa bắn trúng) + `BattleshipPlacement.tsx` (xếp tàu bằng cách chạm ô, nút Xoay/Xếp đại/Xếp lại/Sẵn sàng) + `BattleshipGame.tsx`. Chế độ "2 người chung máy" có thêm màn chắn "chạm để xem" mỗi khi đổi lượt (đặt tàu lẫn bắn) để người kia không nhìn lén màn hình — các game cờ trước đó không cần vì là game hiển thị đầy đủ thông tin, bắn tàu thì không. **Giản lược có ghi chú:** chưa làm tùy chọn "mỗi lượt 1 phát" (luôn theo luật mặc định "trúng thì bắn tiếp"); vị trí tàu đối phương về mặt kỹ thuật nằm trong state đồng bộ (xem được qua devtools) dù UI không hiển thị — chấp nhận được vì đây là app chơi giữa bạn bè, không phải game cạnh tranh cần chống gian lận triệt để. 8 test qua (chồng tàu, tràn bàn, tàu sát nhau hợp lệ, chuyển sang giai đoạn bắn, trúng bắn tiếp/hụt đổi lượt, cấm bắn lại ô cũ, thắng khi chìm hết tàu, bot). Đã test trong browser thật (random xếp tàu, bắn, bot phản công, giấu tàu đối phương đúng) hoạt động tốt.
- **Sửa thiếu sót phát hiện khi làm bắn tàu:** `OnlineScreen.tsx` chưa từng được nối cho Cờ tướng và Cờ vây — màn hình chơi online cho 2 game đó trước đây sẽ trống trơn (không có bàn cờ) dù phòng/kết nối vẫn hoạt động, vì file này render bàn cờ theo từng game bằng tay thay vì tự động. Đã bổ sung nhánh `xiangqi`/`go` (kèm nút Bỏ lượt + điểm số cho cờ vây) và nối luôn `battleship`. **Lưu ý cho các game sau:** mỗi game mới phải nhớ thêm nhánh render vào `OnlineScreen.tsx` ngoài `GameScreen.tsx`, 2 chỗ khác nhau, dễ quên.

**B. Tùy chọn chơi (mỗi game ở màn chi tiết đều có, chưa làm trên "Thư Giãn"):**
- [x] **Phần chọn (UI + lưu)** — xong 2026-10-19: `playOptionsStore.ts` (zustand + localStorage, giống kiểu `settingsStore`/`favoritesStore`) + `PlayOptionsModal.tsx`, nối vào `GameDetailScreen.tsx` thành dòng "Tuỳ chọn chơi / Đổi / [tóm tắt] · N ván" y hệt bố cục rachoi — 3 tab Đồng hồ (Không tính giờ mặc định / Đồng hồ cờ 5 mốc 10+5·15·15+10·30+10·60+30 / Theo nước 3 mốc 30s·1p·2p) + chọn Số ván (1 mặc định/3/5/7/nhập tay 1–99) + nút Về mặc định. Ẩn hẳn dòng này cho 3 game puzzle 1 người (`SOLO_ONLY_GAMES`) vì đồng hồ thi đấu + số ván không có ý nghĩa với puzzle. Đã test trong browser: chọn mốc → tóm tắt cập nhật đúng → lưu qua reload.
- [x] **Phần áp dụng vào ván chơi** — xong 2026-10-20: `useGameClock.ts` (đồng hồ đếm ngược thật, cộng giờ sau mỗi nước ở chế độ Đồng hồ cờ, đếm riêng theo-nước, gọi `onTimeout` đúng 1 lần) + `useMatchSeries.ts` (theo dõi tỉ số nhiều ván) + `ClockDisplay.tsx` + `MatchSeriesBanner.tsx`, nối vào **cả 9 màn chơi đối kháng** (XO, Caro, Ô ăn quan, Cờ vua, Cờ tướng, Cờ vây, Bắn tàu, Bắn máy bay, Đô-mi-nô). Hết giờ ở chế độ Đồng hồ cờ = thua ngay; hết giờ ở chế độ Theo nước = máy tự đi 1 nước dễ giúp (đúng luật rachoi), không thua. Bắn tàu/Bắn máy bay: đồng hồ chỉ chạy ở giai đoạn bắn, không tính giờ lúc xếp tàu. Xong 1 ván mà số ván >1 thì hiện bảng tỉ số + nút "Ván tiếp"; xong đủ số ván thì hiện tỉ số chung kết, không có nút tiếp. **Lỗi đã gặp và sửa:** ban đầu gọi `onTimeout` (tức gọi `setState` của component cha) ngay bên trong hàm updater của `setRemainingMs` — vi phạm quy tắc "updater phải thuần" của React, khiến việc phát hiện hết giờ không ổn định; sửa bằng cách tách việc phát hiện "vừa về 0" ra một `useEffect` riêng theo dõi state đã commit thay vì làm side-effect ngay trong updater. Đã test kỹ bằng cách tạm chỉnh `localStorage` để có đồng hồ ngắn (2-3 giây) nhằm xác nhận thật nhanh: thua khi hết giờ Đồng hồ cờ ✓, tự đi nước dễ khi hết giờ Theo nước ✓, chuyển ván + tỉ số + kết thúc trận đúng ✓, không ảnh hưởng gì khi vẫn để mặc định "Không tính giờ" (không hiện đồng hồ, hành vi y hệt trước khi có tính năng này) ✓. **Chưa áp dụng cho chế độ Online** (đồng hồ/số ván chỉ hoạt động ở chơi với máy và 2 người chung máy — online cần đồng bộ qua server, để sau).

**C. Trong ván chơi (so với `GameScreen` hiện tại còn thiếu):**
- [x] Nút "Nước trước"/"Nước sau" để xem lại lịch sử nước đi (không đổi được trạng thái ván, chỉ xem) — xong 2026-10-20, cả 7/7 game có khái niệm nước đi (Cờ vua, XO, Caro, Ô ăn quan, Cờ tướng, Cờ vây, Đô-mi-nô).
- [x] Nút "Đi lại" — xong 2026-10-20: xin đi lại 1 nước, áp dụng cho cùng 7 game trên. **Giản lược:** chỉ làm cho chơi với máy (undo tức thì nước của mình + nước đáp của máy) và 2 người chung máy (undo tức thì nước cuối) — "chơi với bạn qua online thì gửi yêu cầu" chưa làm vì cần đồng bộ qua server (Durable Object), xem mục còn thiếu bên dưới. Dùng `useMoveHistory.undoToTurn(player)` thay vì đếm cố định số nước lùi, vì lượt máy ở Đô-mi-nô có thể gồm 2 nước nội bộ (bốc rồi đánh) khi bí.
- [x] Nút "Tạm dừng" mở menu: Chơi tiếp / Âm thanh / Luật chơi / Chơi lại / Cài đặt / Rời trò chơi — đã có ở cả 12 game (xong trước đó, xem nhật ký 2026-10-20 bên dưới).
- [ ] Panel chat có "Trả lời nhanh" (5 câu gợi ý bấm nhanh) + ô nhập + nút emoji, tiêu đề đổi theo đối thủ ("Nhắn với máy"/"Nhắn với [tên bạn]")
- [ ] Trang "Luật chơi" xem lại luật ngay trong ván (hiện chỉ có trên trang rules riêng, chưa có trong app)

**D. Màn hình chọn game (`HomeScreen`):**
- [ ] Nút "Sắp xếp" (kéo-thả đổi thứ tự game hiển thị, lưu local)
- [ ] Nút "Vào bàn" trên header (vào thẳng 1 bàn online bằng mã, không cần chọn game trước — app tự chuyển đúng game của bàn đó)

**E. Màn "Tôi" (so với `SettingsScreen` hiện tại còn thiếu rất nhiều):**
- [ ] Avatar + biệt danh đổi được (rachoi dùng emoji con vật kiểu "T-Rex Pro" ngẫu nhiên — mình nên đặt tên/emoji riêng, không copy "T-Rex")
- [ ] "Ván đã chơi" (thống kê) + "Chia sẻ Recess" (chia sẻ app — đổi thành chia sẻ link Thư Giãn)
- [ ] Cỡ chữ (Thường/Lớn) — accessibility
- [ ] Nhóm Âm thanh: bật/tắt âm thanh trò chơi, chọn nhạc nền
- [ ] Nhóm Cảm giác: Hiệu ứng (animation), Rung (vibration — chỉ có nghĩa trên mobile/PWA), Gợi ý khi bí (hint cho puzzle game)
- [ ] Nhóm Trò chuyện: bật/tắt chat, bật/tắt hình dán (sticker), danh sách người đã chặn
- [ ] Nhóm Riêng tư: gửi số liệu sử dụng ẩn danh (toggle, mặc định tắt/rõ ràng), trang "Những gì được gửi"
- [ ] Nhóm Trợ giúp: Gửi góp ý, Khắc phục mất kết nối, link trang web

**F. Không clone (tính năng native app, ngoài phạm vi bản web):**
- Chơi gần không cần mạng qua Bluetooth/Wi-Fi (Giai đoạn 5 trong lộ trình, không phải phạm vi web)
- Link tải App Store/Google Play/file .dmg Mac

**Thứ tự ưu tiên thực hiện (để không bị ngợp bởi khối lượng lớn):**
1. 8 game còn thiếu (mục A) — ưu tiên game tái dùng được kiến trúc cờ có sẵn trước (Cờ tướng, Cờ vây), rồi đến game kiểu lưới bắn tọa độ (Bắn tàu, Bắn máy bay dùng chung 1 engine đặt-tàu/bắn), rồi puzzle 1 người trước (Sudoku, Ghép số, Tìm số), cuối cùng Đô-mi-nô.
2. Tuỳ chọn chơi (mục B) — áp dụng chung cho mọi game nên làm 1 lần, dùng được ngay cho cả 12 game.
3. Chrome trong ván (mục C) — nước trước/sau, đi lại, tạm dừng, chat trả lời nhanh.
4. Màn "Tôi" đầy đủ hơn (mục E) + "Sắp xếp"/"Vào bàn" ở Home (mục D).
5. Go-live: domain + deploy Cloudflare (đã ghi nợ từ Giai đoạn 2) khi mục A-D xong.

### Giai đoạn 4: Đóng gói app (1–2 tuần)
- [ ] Tauri iOS/Android hoặc Expo
- [ ] Notification, haptics, clipboard
- [ ] Deep link / universal link cho link mời
- [ ] CI: build iOS → TestFlight, build Android → Internal testing

### Giai đoạn 5: Chơi gần không cần mạng (2–3 tuần, khó nhất)
- [ ] Native module: advertise / browse / connect / send
- [ ] Gắn vào `NearbyTransport`, test trên 2 máy thật

### Giai đoạn 6: Phát hành (1 tuần)
- [ ] Icon, ảnh chụp màn hình, privacy policy, mô tả trên store
- [ ] TestFlight / Google Play Internal → phát hành chính thức

## 5. Chuẩn bị & chi phí
- Tài khoản Apple Developer 99 USD/năm, Google Play 25 USD (trả 1 lần)
- Cloudflare Workers: gói miễn phí hoặc 5 USD/tháng
- Domain khoảng 10–15 USD/năm
- Một iPhone thật (hoặc nhờ bạn có iPhone) để test qua TestFlight

## 6. Lưu ý
- Stockfish và Pikafish dùng giấy phép GPL, nhúng vào app thì app cũng phải mở mã nguồn. Ưu tiên tự viết alpha-beta.
- Làm nhỏ trước: 2 game + chơi online + bản web, rồi mới làm app native và Bluetooth.
- Tìm điểm khác biệt: game dân gian Việt (cá ngựa, đánh chắt…), hoặc nhắm một nhóm người dùng cụ thể.

## 7. Nhật ký tiến độ

- **2026-10-15**: Dựng xong khung Giai đoạn 1 — monorepo pnpm, `packages/engine` (XO + Caro + bot minimax/heuristic), `apps/client` (Vite + React + i18next, chơi với máy / 2 người chung máy). Xem chi tiết chạy thử ở README từng package.
- **2026-10-15**: Dựng xong Giai đoạn 2 (chơi online) — `packages/protocol` (kiểu tin nhắn + sinh mã phòng), `apps/server` (Cloudflare Worker + Durable Object `GameRoom`: giữ trạng thái ván đấu bằng chính `@game/engine` nên server tự xác thực từng nước đi, hỗ trợ tham gia lại và đồng bộ lại lịch sử nước đi), màn hình online trên client (tạo/tham gia phòng, mã + QR + link mời, chat, chơi lại). Đã test hai tab trình duyệt thật chơi với nhau qua `wrangler dev` cục bộ — nước đi, chat, chơi lại đều đồng bộ đúng. **Lưu ý:** `wrangler` yêu cầu Node ≥22 (máy đang có Node 20 qua nvm mặc định — dùng `nvm use 22` trước khi chạy `pnpm --filter @game/server dev`). Chưa deploy lên Cloudflare thật — cần bạn có tài khoản Cloudflare để làm bước đó.
- **2026-10-15**: Thêm game **Ô ăn quan** vào `packages/engine` (12 ô, rải quân, ăn/ăn liên hoàn, kết thúc khi một bên hết dân — có ghi chú rõ đây là luật rút gọn, không có "vay quan") + bot alpha-beta, unit test khớp với tính tay từng bước rải/ăn quân. Nối vào cả 3 chế độ chơi (máy, 2 người, online) và test trong browser thật — số quân luôn bảo toàn (70), điểm ăn quân hiển thị đúng.
- **2026-10-15**: Thêm thanh điều hướng nổi dưới cùng (Chơi/Nhắn/Tôi), tự ẩn khi đang trong ván chơi. "Tôi" dẫn vào màn Cài đặt giao diện đã có (bỏ nút ⚙️ ở header, gộp vào đây); "Nhắn" là màn placeholder (chưa có hệ thống tin nhắn thật, chỉ hiện "sẽ có ở bản sau").
- **2026-10-15**: Thêm màn **Cài đặt giao diện** (nút ⚙️ trên header) — Sáng/Tối/Tự động (theo `prefers-color-scheme`), chọn 1 trong 5 màu nhấn (áp dụng qua CSS `color-mix` nên tông chữ/bóng tự tính lại đúng cho cả 2 chế độ sáng/tối), họa tiết nền (trơn/chấm bi/sọc chéo/ô lưới), kiểu mặt ô bàn XO (trơn/giấy/ô vở), và nút đặt lại mặc định. Lưu vào localStorage, load lại vẫn giữ. Đặt tên theme/màu theo ý riêng, không copy tên gọi "Recess/Glass/Dev Dark..." của rachoi.app. Bỏ qua "vị trí bàn cờ" và "đặt ngay/xem trước" vì không hợp với layout web một cột hiện tại.
- **2026-10-15**: Đổi luồng điều hướng theo đúng rachoi.app — tách màn chọn game (chỉ còn lưới icon) ra khỏi màn chọn chế độ chơi: bấm game → màn chi tiết (icon lớn, mô tả luật 1 dòng, danh sách Dễ/Vừa/Khó (icon con vật) + Chơi với bạn + Chơi online dạng hàng có mũi tên) → vào ván. Nút "Quay lại" trong ván trả về đúng màn chi tiết của game đó (không về thẳng lưới) để đổi độ khó nhanh. Chưa làm phần "Tuỳ chọn chơi" nâng cao (giờ mỗi lượt, cỡ bàn tuỳ chỉnh...) vì đó là tính năng mới lớn hơn, để sau nếu cần.
- **2026-10-15**: Chỉnh giao diện web theo đúng phong cách của rachoi.app — lấy trực tiếp token màu/font/kiểu nút từ trang gốc (nền kem `#fff3e2`, chữ nâu đậm `#2b1a10`, cam chủ đạo `#ff7a18`, font "Baloo 2" cho tiêu đề và "IBM Plex Mono" cho nhãn nhỏ, nút bo tròn kiểu "nút bấm 3D" đổ bóng lệch xuống dưới), áp vào `styles.css` + thêm icon cho từng game ở màn chọn game. Không copy nội dung/chữ quảng cáo của họ, chỉ lấy phong cách thị giác.
- **2026-10-15**: Thêm game **Cờ vua** đầy đủ luật vào `packages/engine` — sinh nước đi cho từng loại quân, phát hiện chiếu/chiếu bí/hết nước (stalemate), nhập thành (cả hai bên, chặn đúng khi vua đi qua ô bị chiếu), bắt tốt qua đường, phong cấp (4 lựa chọn quân), luật 50 nước, hòa do thiếu quân (bản rút gọn). Test bằng **perft chuẩn** (perft(1)=20, perft(2)=400, perft(3)=8902 — khớp chính xác với giá trị tham chiếu nổi tiếng của cờ vua) cộng với test chiếu bí (fool's mate), hết nước, bắt tốt qua đường, phong cấp, nhập thành. Bot alpha-beta (vật liệu + thiên vị trung tâm, sắp xếp nước ăn quân trước để tỉa nhánh hiệu quả hơn) — chạy nhanh (<1s) kể cả mức khó (độ sâu 3). Đã test nhập thành thực tế trong browser (2 người chung máy). Chưa deploy, chưa làm cờ tướng.
- **2026-10-15**: Màn chọn game đổi sang kiểu rachoi.app — bỏ khung thẻ bao quanh lưới, tách 2 nhóm "Yêu thích"/"Trò chơi khác" (chỉ hiện khi có game được đánh dấu), thêm nút sao (☆/★) thật trên mỗi ô để đánh dấu yêu thích, lưu `localStorage`. Chưa làm nút "Sắp xếp" (kéo-thả đổi thứ tự).
- **2026-10-15**: Đổi tên hiển thị của app từ "Ra Chơi" (trùng tên với rachoi.app — nguồn tham khảo) thành **"Thư Giãn"** (EN: "Relax") — sửa `app.title` trong cả 2 ngôn ngữ, `<title>` trang web, và tiêu đề README. Không đổi các định danh kỹ thuật nội bộ (tên gói npm, tên Worker trong `wrangler.toml`, khoá `localStorage`) vì chưa deploy nên chưa gấp, và đổi khoá `localStorage` sẽ làm người dùng mất cài đặt/ngôn ngữ/yêu thích đã lưu.
- **2026-10-19**: Bắt đầu Giai đoạn 3b (clone đầy đủ rachoi.app, xem mục chi tiết ở trên) — khảo sát trực tiếp rachoi.app (12 game, 4 mức độ khó, modal "Tuỳ chọn chơi", chrome trong ván, màn "Tôi" đầy đủ) và ghi thành checklist ưu tiên. Trong phiên này: (1) thêm mức khó thứ 4 **Cao thủ** (🐲) cho cả 4 game cũ, khớp đúng 4 mức dễ/vừa/khó/cao thủ của rachoi; (2) thêm game **Cờ tướng** đầy đủ luật (mã/tượng/pháo đặc thù, luật "lộ mặt tướng", chiếu bí/hết nước đều thua) — perft(1)=44, perft(2)=1920 khớp giá trị tham chiếu chuẩn; tối ưu `isSquareAttacked` thành kiểm tra trực tiếp theo từng loại quân (thay vì sinh toàn bộ nước đi đối phương) vì cách cũ làm bot mức Cao thủ mất 25 giây/nước — sau khi sửa còn dưới 5 giây; (3) thêm game **Cờ vây** 9×9 (khí/bắt quân/ko, tính điểm kiểu Trung Quốc + komi 7.5, bot heuristic vì cờ vây không thể tìm kiếm sâu như cờ tướng/cờ vua) — có ghi chú rõ 2 giản lược: chưa chọn được cỡ bàn 13×13/19×19, chưa có giai đoạn đánh dấu quân chết (phải ăn quân thật trước khi bỏ lượt 2 lần); (4) sửa lỗi `<button>` lồng trong `<button>` ở `HomeScreen` (nút yêu thích ★ lồng trong ô chọn game) — đổi ô chọn game thành `<div role="button">` để hợp lệ HTML. Tổng 5/12 game đã xong (XO, Ca-rô, Ô ăn quan, Cờ vua, Cờ tướng, Cờ vây — thật ra là 6/12, đã cập nhật). Còn lại: Bắn máy bay, Tìm số, Đô-mi-nô, Sudoku, Ghép số, Bắn tàu.
- **2026-10-19 (tiếp, cùng ngày)**: Hoàn tất toàn bộ mục A — làm nốt 6 game còn lại trong 1 phiên dài: **Bắn tàu** (10×10 chuẩn, đặt tàu mã hoá thành 1 nước đi để dùng chung hạ tầng move-log, màn chắn "chạm để xem" cho chế độ 2 người chung máy), **Bắn máy bay** (tái dùng ~90% kiến trúc Bắn tàu, khác luật xoay 4 hướng + chỉ trúng đầu mới rụng + không có lượt bắn thêm), **Đô-mi-nô** (bộ 28 quân chuẩn, bốc 1 khi bí), **Sudoku**, **Ghép số**, **Tìm số** (3 game cuối là puzzle 1 người nên **không dùng** interface `Game<S,M>` chung — xem ghi chú ở từng mục, và đều ẩn 2 dòng "2 người"/"Online" trong màn chọn chế độ qua `SOLO_ONLY_GAMES`). Tổng **100 test** qua hết, typecheck sạch cho cả 4 package. Hai lỗi đáng chú ý tìm thấy và sửa ngay trong phiên: (a) `OnlineScreen.tsx` thiếu nhánh render cho Cờ tướng/Cờ vây khiến chơi online 2 game đó trước đây bị trống màn hình dù kết nối vẫn chạy — đã thêm, và từ đó luôn nhớ thêm Battleship/PlaneBattle/Domino vào cả `OnlineScreen.tsx` lẫn `GameScreen.tsx` ngay khi viết; (b) hai module `sudoku.ts` và `numberMatch.ts` cùng export tên `isSolved` gây lỗi build — đổi thành `isSudokuSolved`/`isNumberMatchSolved`. **Mục A coi như xong — đã clone đủ 12/12 game của rachoi.app.** Việc tiếp theo chuyển sang mục B (modal "Tuỳ chọn chơi": đồng hồ + số ván), mục C (chrome trong ván: nước trước/sau, đi lại, tạm dừng, chat trả lời nhanh), mục D-E (Sắp xếp/Vào bàn ở Home, màn "Tôi" đầy đủ hơn) — đúng thứ tự ưu tiên đã ghi ở trên.
- **2026-10-19 (tiếp)**: Bắt đầu mục B — làm xong **phần chọn** của "Tuỳ chọn chơi" (modal + lưu localStorage + dòng tóm tắt ở màn chi tiết game, ẩn cho 3 game puzzle 1 người), đã test kỹ trong browser. **Chưa làm phần áp dụng vào ván chơi thật** (đồng hồ đếm ngược, tự thua khi hết giờ, tự đi nước dễ khi hết giờ theo-nước, vòng lặp nhiều ván) — đây là phần việc lớn còn lại, cần nối vào 9 màn `*Game.tsx` của các game đối kháng, để làm ở phiên sau.
- **2026-10-20**: Làm nốt phần áp dụng "Tuỳ chọn chơi" vào ván chơi thật — xem chi tiết ở mục B phía trên. Tóm tắt: đồng hồ đếm ngược + vòng lặp nhiều ván hoạt động đầy đủ cho cả 9 game đối kháng (chơi với máy + 2 người chung máy), đã test bằng đồng hồ rút ngắn giả lập để xác nhận nhanh thay vì chờ thật 10-15 phút. Phát hiện và sửa 1 lỗi React thật (gọi `setState` bên trong updater của `setState` khác — vi phạm "updater phải thuần"), không phải lỗi HMR/cache giả như nhiều lần trước trong phiên — bài học: khi nghi ngờ lỗi console là "stale", vẫn phải tái lập ở tab mới + đọc kỹ code trước khi kết luận, lần này đúng là bug thật. Việc tiếp theo: mục C (chrome trong ván — nước trước/sau, đi lại, tạm dừng, chat trả lời nhanh) hoặc làm đồng hồ/số ván hoạt động cho cả chế độ Online (hiện chỉ chơi với máy/2 người chung máy).
- **2026-10-20 (tiếp)**: Thêm nút "Tạm dừng" (menu Chơi tiếp/Âm thanh/Luật chơi/Chơi lại/Cài đặt/Rời trò chơi) cho cả 12 game, và nút "Nước trước"/"Nước sau" lúc đầu mới chỉ làm cho Cờ vua.
- **2026-10-20 (tiếp, phiên sau)**: Làm nốt "Nước trước"/"Nước sau" cho 6 game còn lại (XO, Caro, Ô ăn quan, Cờ tướng, Cờ vây, Đô-mi-nô) dùng chung `useMoveHistory`/`HistoryNav` đã có sẵn từ Cờ vua. Phát hiện và sửa 1 bug thật riêng của Đô-mi-nô: `initDomino()` chia bài bằng `Math.random()` nên gọi lại để "replay từ đầu" ra bộ bài khác, ném lỗi "tile not in hand" — sửa bằng cách chốt bộ bài đã chia của ván hiện tại vào 1 `ref` thay vì gọi lại hàm khởi tạo. Tiếp theo làm luôn nút "Đi lại" (mục C) cho cùng 7 game đó: mở rộng `useMoveHistory` thêm `undo()` (lùi đúng 1 nước, cho 2 người chung máy) và `undoToTurn(player)` (lùi tới đúng lượt của 1 người chơi cụ thể, cho chơi với máy — cần thiết vì đếm cố định "lùi 2 nước" sẽ sai với Đô-mi-nô khi máy phải bốc-rồi-đánh trong cùng 1 lượt, tức 2 nước nội bộ thay vì 1). Đã test tay trong browser (XO 2 người, Đô-mi-nô với máy) + `pnpm typecheck` + `pnpm -r test` (100 test) đều qua. **Chưa làm undo cho chơi online** (cần gửi yêu cầu cho đối thủ đồng ý qua server, để sau). Việc tiếp theo: phần còn lại của mục C (panel chat "Trả lời nhanh"), rồi mục D (Sắp xếp/Vào bàn ở Home) và mục E (màn "Tôi" đầy đủ hơn).
