# StudyHub Remotion — StudyHubFull

Video **9:16** giới thiệu khóa học (bao quát): nội dung · GV · ưu đãi · học thử 1 ngày · CTA QR.

## Voice = thầy (ElevenLabs)

Em **không** phụ thuộc TTS máy. Thầy:

1. Mở `docs/marketing/ELEVENLABS_SCRIPT.md`
2. Generate 12 file `s01.mp3` … `s12.mp3`
3. Copy vào `remotion/public/voice/`
4. Render

Video **tự scale thời lượng từng scene theo audio**.

```bash
cd remotion
npm install
# (đặt voice vào public/voice/)
npm run studio
npm run render:full    # → out/studyhub-full.mp4
```

Root: `npm run remotion:studio` · `npm run remotion:render:full`

## Nội dung màn hình

Sửa `src/lib/scenes.ts` (title, giá, bullet GV…).  
Script đọc ElevenLabs: `docs/marketing/ELEVENLABS_SCRIPT.md`.

## Không hiện SĐT

Chỉ **QR Zalo** + **luyende.id.vn**.

## Optional Edge TTS preview

`npm run voice:generate` — chất lượng kém hơn ElevenLabs; chỉ để test timeline.
