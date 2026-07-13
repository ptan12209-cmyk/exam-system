# StudyHubFull — voice + video (synced)

**Composition:** `StudyHubFull`  
**Nguồn sự thật:** `remotion/src/lib/scenes.ts` — chữ trên màn = câu TTS.

## Pipeline

```bash
cd remotion
npm install
npm run voice:generate      # TTS từng scene → public/voice/s01.mp3 …
npm run studio              # nghe + xem khớp chưa
npm run render:full         # → out/studyhub-full.mp4
# hoặc
npm run render:full:with-voice
```

Root: `npm run remotion:render:full:voice`

## Vì sao “voice dỏm / lệch” trước đây?

- TTS một đoạn dài gán vào slot cố định 15/30/25s → **audio ≠ visual**.  
- Script nói khác chữ trên màn.  

**Cách mới (skill Remotion voiceover):**
1. Mỗi scene: `title` + `line` + `voice`  
2. Generate 1 file MP3 / scene  
3. `calculateMetadata` đo độ dài audio → **kéo dài scene theo giọng**  
4. Fade transition giữa scene  

## Script (đọc / TTS)

| ID | Màn hình | Voice |
|----|----------|--------|
| s01 | 2k9 ơi | Các em 2k9 ơi. Anh nói chuyện với các em một chút. |
| s02 | Drive loạn quá | Ôn video rải khắp Drive, loạn quá, mệt đúng không các em? |
| s03 | StudyHub | StudyHub. Một cổng học online. Video theo từng môn. |
| s04 | Tự nhiên | Khối tự nhiên: Toán, Lý, Hóa, Sinh. |
| s05 | Xã hội + Anh | Xã hội và Anh: Văn, Sử, Địa, Kinh tế pháp luật, Tiếng Anh. |
| s06 | ĐGNL | Đánh giá năng lực: HSA, V-ACT, TSA, và Sư phạm. |
| s07 | 1 tài khoản · 1 máy | Mỗi tài khoản chỉ một thiết bị. Đừng share, tránh bị khóa. |
| s08 | Quay màn hình khi TT | Khi thanh toán, các em nên quay màn hình. Có sự cố anh hỗ trợ nhanh hơn. |
| s09 | luyende.id.vn + QR | Vào luyende.id.vn. Quét QR Zalo để nhắn anh. Link bio cũng được. StudyHub sắp mở. Hẹn gặp các em. |

**Không đọc số điện thoại.**

## TTS hay vẫn “robot”?

Edge `NamMinh` miễn phí nhưng chất lượng vừa. Muốn đẹp hơn:

```bash
# Windows
set OPENAI_API_KEY=sk-...
set VOICE_PROVIDER=openai
npm run voice:generate
```

Hoặc thu mic thầy → thay `public/voice/s0X.mp3` (giữ tên file).

## Skills

Repo skill: `.agents/skills/remotion-skills` (clone từ remotion-dev/skills).
