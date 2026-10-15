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
- [ ] Cờ tướng
- [x] Bot 3 mức cho mọi game đã làm (dễ/trung bình/khó — giới hạn độ sâu + ngẫu nhiên ở mức dễ)
- [ ] Đồng hồ cờ (tuỳ chọn)

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
