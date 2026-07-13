# StudyHub Remotion — StudyHubFull

**9:16 · 1080×1920** · 1 video dài · scene + voice **đồng bộ**.

Skills: `.agents/skills/remotion-skills` (remotion-dev/skills).

## Workflow

```bash
cd remotion
npm install
npm run voice:generate          # TTS từng scene (s01…s09) khớp chữ màn hình
npm run studio                  # composition StudyHubFull
npm run render:full             # → out/studyhub-full.mp4
# hoặc
npm run render:full:with-voice
```

Root: `npm run remotion:studio` · `npm run remotion:render:full:voice`

## Cấu trúc

| File | Vai trò |
|------|---------|
| `src/lib/scenes.ts` | **SSOT** title / line / voice / visual |
| `src/compositions/StudyHubFull.tsx` | TransitionSeries + calculateMetadata (độ dài = audio) |
| `src/components/SceneVisual.tsx` | UI từng scene (Be Vietnam Pro, grid, QR) |
| `scripts/generate-voice.mjs` | TTS NamMinh / OpenAI fallback |

**Không vẽ số điện thoại** — QR Zalo + domain.

Script: `../docs/marketing/VOICE_FULL_COMBO.md`

## License

[Remotion License](https://www.remotion.dev/docs/license) — free cho cá nhân / team nhỏ.
