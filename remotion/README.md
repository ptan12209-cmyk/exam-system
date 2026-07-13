# StudyHub Remotion — StudyHubFull

Video **9:16** giới thiệu khóa học (bao quát): nội dung · GV · ưu đãi · học thử 1 ngày · CTA QR.

## Voice = thầy (ElevenLabs)

### Cách A — **1 file duy nhất** (đơn giản)

1. Mở `docs/marketing/ELEVENLABS_SCRIPT.md` → paste **FULL** vào ElevenLabs  
2. Export 1 file: đặt tên  
   `remotion/public/voice/full.mp3`  
3. `npm run render:full`  

Remotion phát **cả track**, chia thời gian scene theo **độ dài script** (scene dài chữ → đứng lâu hơn).  
Khớp ~90–95% nếu thầy đọc đúng thứ tự s01→s12; muốn khớp tuyệt đối dùng Cách B.

### Cách B — 12 file (khớp 100% từng đoạn)

`s01.mp3` … `s12.mp3` trong `public/voice/`.

```bash
cd remotion
npm install
# đặt full.mp3 hoặc s01…s12
npm run studio
npm run render:full    # → out/studyhub-full.mp4
```

## Nội dung màn hình

Sửa `src/lib/scenes.ts` (title, giá, bullet GV…).  
Script đọc ElevenLabs: `docs/marketing/ELEVENLABS_SCRIPT.md`.

## Không hiện SĐT

Chỉ **QR Zalo** + **luyende.id.vn**.

## Optional Edge TTS preview

`npm run voice:generate` — chất lượng kém hơn ElevenLabs; chỉ để test timeline.
