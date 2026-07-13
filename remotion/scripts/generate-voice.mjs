/**
 * Generate Vietnamese male TTS for FullCombo → public/voice/part-*.mp3
 *
 *   cd remotion
 *   npm run voice:generate
 *   npm run render:full
 *
 * Provider order:
 *   1) node-edge-tts (Microsoft Edge neural, free, needs network)
 *   2) OPENAI_API_KEY → OpenAI tts-1 (voice "onyx")
 *
 * No phone number in any spoken text (TikTok).
 */
import { mkdir, writeFile, access } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { EdgeTTS } from "node-edge-tts"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, "../public/voice")

const PARTS = [
  {
    id: "part-v1",
    text: `Các em 2k9 ơi. Anh biết ôn video rải khắp Drive mệt lắm đúng không. StudyHub gom bài theo môn: Toán, Lý, Hóa, Văn, và cả Đánh giá năng lực. Một cổng học online. Các em vào luyende.id.vn xem danh sách môn và bảng giá tham khảo. Sắp mở đăng ký. Cần anh hỗ trợ thì quét mã QR Zalo cuối video, hoặc bấm link bio.`,
  },
  {
    id: "part-bridge1",
    text: `Tiếp theo, anh liệt kê các môn trên StudyHub.`,
  },
  {
    id: "part-v3",
    text: `Khối tự nhiên gồm Toán, Lý, Hóa, Sinh. Khối xã hội: Văn, Sử, Địa, Kinh tế pháp luật. Thêm Tiếng Anh. Đánh giá năng lực có HSA, V-ACT, TSA, và Sư phạm — mỗi gói có đội ngũ riêng. Vào luyende.id.vn xem đủ giáo viên theo từng môn. Cần tư vấn chọn môn, quét QR Zalo, anh trả lời các em.`,
  },
  {
    id: "part-bridge2",
    text: `Phần ba. Anh nói về quyền lợi và an toàn khi học.`,
  },
  {
    id: "part-v6",
    text: `Các em yên tâm học. Mỗi tài khoản chỉ đăng nhập một thiết bị. Đừng share lung tung kẻo bị khóa. Khi thanh toán, các em nên quay màn hình hoặc quay video. Có sự cố anh hỗ trợ nhanh hơn. Muốn nhắn anh: quét QR Zalo trên màn hình. Không cần ghi số điện thoại. Trang chính luyende.id.vn. Học tử tế, bảo vệ tài khoản. Anh đồng hành cùng các em.`,
  },
  {
    id: "part-end",
    text: `Các em nhớ quét QR để chat Zalo. Link bio cũng trỏ về StudyHub. Hẹn gặp các em trên luyende.id.vn.`,
  },
]

async function synthesizeEdge(text, filepath) {
  const tts = new EdgeTTS({
    voice: "vi-VN-NamMinhNeural",
    lang: "vi-VN",
    outputFormat: "audio-24khz-48kbitrate-mono-mp3",
    rate: "-5%",
    pitch: "-5Hz",
    timeout: 120000,
  })
  let lastErr
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await tts.ttsPromise(text, filepath)
      return
    } catch (e) {
      lastErr = e
      console.warn(`retry ${attempt}/3 (${e.message})…`)
      await new Promise((r) => setTimeout(r, 1500 * attempt))
    }
  }
  throw lastErr
}

async function synthesizeOpenAI(text, filepath) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error("OPENAI_API_KEY not set")

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "onyx",
      input: text,
      response_format: "mp3",
      speed: 0.95,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI TTS ${res.status}: ${err.slice(0, 200)}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(filepath, buf)
}

async function main() {
  await mkdir(outDir, { recursive: true })

  const provider = process.env.VOICE_PROVIDER || "edge"
  console.log(`[voice] provider=${provider} out=${outDir}`)

  const manifest = {
    provider,
    generatedAt: new Date().toISOString(),
    note: "No phone digits in speech. QR/link only.",
    parts: [],
  }

  for (const part of PARTS) {
    const file = path.join(outDir, `${part.id}.mp3`)
    process.stdout.write(`[voice] ${part.id} … `)
    try {
      if (provider === "openai") {
        await synthesizeOpenAI(part.text, file)
      } else {
        try {
          await synthesizeEdge(part.text, file)
        } catch (e) {
          if (process.env.OPENAI_API_KEY) {
            console.warn(`edge failed (${e.message}), trying OpenAI…`)
            await synthesizeOpenAI(part.text, file)
            manifest.provider = "openai-fallback"
          } else {
            throw e
          }
        }
      }
      await access(file)
      console.log("ok")
      manifest.parts.push({ id: part.id, file: `voice/${part.id}.mp3` })
    } catch (e) {
      console.error("FAILED")
      throw e
    }
  }

  await writeFile(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  )
  console.log("[voice] Done → public/voice/*.mp3")
  console.log("[voice] Next: npm run studio  OR  npm run render:full")
}

main().catch((e) => {
  console.error("\n[voice] FAILED:", e.message || e)
  console.error(`
Cách xử lý:
  1) Thử lại (Edge TTS đôi khi chặn IP): npm run voice:generate
  2) Dùng OpenAI (cần key):
       set OPENAI_API_KEY=sk-...
       set VOICE_PROVIDER=openai
       npm run voice:generate
  3) Thu mic thủ công → đặt file vào public/voice/ với tên:
       part-v1.mp3, part-bridge1.mp3, part-v3.mp3,
       part-bridge2.mp3, part-v6.mp3, part-end.mp3
     rồi npm run render:full
`)
  process.exit(1)
})
