# Thư Giãn — game chơi cùng bạn

Xem [PLAN.md](./PLAN.md) để biết toàn bộ lộ trình và quyết định kiến trúc.

## Cấu trúc

```
packages/engine    # luật game thuần TS (XO, Caro) + bot — dùng chung mọi nền tảng
packages/protocol  # kiểu tin nhắn client<->server + sinh mã phòng
apps/client        # web app (Vite + React): chơi với máy, 2 người chung máy, chơi online
apps/server        # Cloudflare Worker + Durable Object: phòng chơi online
```

## Chạy thử (chơi với máy / 2 người chung máy)

```bash
pnpm install
pnpm --filter @game/client dev
```

Mở http://localhost:5173.

## Chạy thử chơi online (cần 2 terminal)

`wrangler` (Cloudflare CLI) yêu cầu Node ≥22. Nếu máy mặc định dùng Node 20 (qua nvm), nhớ `nvm use 22` ở terminal chạy server.

```bash
# Terminal 1 — server
nvm use 22
pnpm --filter @game/server dev     # chạy ở http://localhost:8787

# Terminal 2 — client
pnpm --filter @game/client dev     # chạy ở http://localhost:5173
```

Mở http://localhost:5173, chọn "Chơi online" → "Tạo phòng mới", rồi mở một tab/trình duyệt khác và nhập mã phòng (hoặc dùng link mời) để tham gia.

Để trỏ client sang một server đã deploy, copy `apps/client/.env.example` thành `.env.local` và sửa `VITE_SERVER_URL`.

## Test

```bash
pnpm -r test        # chạy test tất cả package
pnpm -r typecheck   # kiểm tra kiểu TypeScript
```

## Trạng thái

Đã xong Giai đoạn 1 (nền tảng): engine XO + Caro, bot minimax/alpha-beta, UI chọn game
và chơi với máy / 2 người chung máy, đa ngôn ngữ vi/en. Xem mục 4 và 7 trong PLAN.md.
