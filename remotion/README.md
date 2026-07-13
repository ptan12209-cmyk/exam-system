# StudyHub Remotion reels

Video marketing **9:16 (1080×1920)** — V1 Hook · V3 Tour môn · V6 Trust.

Giọng/script (đọc khi render hoặc lồng sau): xem `../docs/marketing/REELS_V1_V3_V6.md`  
Brand: **luyende.id.vn** · Zalo **0946741031** · xưng **anh / các em**

## Chạy Studio (preview animation)

```bash
cd remotion
npm install   # nếu chưa
npm run studio
```

Mở browser Remotion Studio → chọn composition **V1Hook** / **V3Tour** / **V6Trust**.

## Render MP4

Cần [Chrome/Chromium](https://www.remotion.dev/docs/miscellaneous/chrome-headless-shell). Lần đầu Remotion tự tải nếu cần.

```bash
cd remotion
npm run render:v1    # → out/v1-hook.mp4
npm run render:v3    # → out/v3-tour.mp4
npm run render:v6    # → out/v6-trust.mp4
npm run render:all
```

File nằm trong `remotion/out/`.

## Từ root monorepo

```bash
npm run remotion:studio
npm run remotion:render:v1
```

## Lưu ý license

Remotion free cho cá nhân / company nhỏ theo [Remotion License](https://www.remotion.dev/docs/license). Dùng commercial lớn → kiểm tra gói Remotion Company.
