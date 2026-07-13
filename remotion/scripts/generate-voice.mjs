/**
 * TTS per scene from src/lib/scenes.ts (voice field === on-screen meaning).
 * Output: public/voice/s01.mp3 … s09.mp3
 *
 *   npm run voice:generate
 *   npm run render:full
 */
import { mkdir, writeFile, access, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { EdgeTTS } from "node-edge-tts"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const outDir = path.join(root, "public/voice")
const scenesFile = path.join(root, "src/lib/scenes.ts")

/** Parse SCENES array voice+id from TypeScript source (no TS runtime needed). */
function parseScenes(ts) {
  const scenes = []
  const re =
    /\{\s*id:\s*"([^"]+)"[\s\S]*?voice:\s*"([^"]*(?:\\.[^"]*)*)"[\s\S]*?minSeconds:\s*([\d.]+)/g
  let m
  while ((m = re.exec(ts))) {
    scenes.push({
      id: m[1],
      voice: m[2].replace(/\\"/g, '"'),
      minSeconds: Number(m[3]),
    })
  }
  if (scenes.length === 0) {
    throw new Error("Could not parse SCENES from scenes.ts")
  }
  return scenes
}

async function synthesizeEdge(text, filepath) {
  const tts = new EdgeTTS({
    voice: "vi-VN-NamMinhNeural",
    lang: "vi-VN",
    outputFormat: "audio-24khz-96kbitrate-mono-mp3",
    rate: "+2%",
    pitch: "default",
    timeout: 120000,
  })
  let lastErr
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await tts.ttsPromise(text, filepath)
      return
    } catch (e) {
      lastErr = e
      console.warn(`  retry ${attempt}/4 (${e?.message || e})`)
      await new Promise((r) => setTimeout(r, 1200 * attempt))
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
      model: "tts-1-hd",
      voice: "onyx",
      input: text,
      response_format: "mp3",
      speed: 0.98,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 180)}`)
  await writeFile(filepath, Buffer.from(await res.arrayBuffer()))
}

async function main() {
  const ts = await readFile(scenesFile, "utf8")
  const scenes = parseScenes(ts)
  await mkdir(outDir, { recursive: true })

  const provider = process.env.VOICE_PROVIDER || "edge"
  console.log(`[voice] ${scenes.length} scenes · provider=${provider}`)
  console.log(`[voice] out=${outDir}`)

  const manifest = {
    provider,
    generatedAt: new Date().toISOString(),
    note: "Voice text synced from scenes.ts — no phone digits",
    parts: [],
  }

  for (const scene of scenes) {
    const file = path.join(outDir, `${scene.id}.mp3`)
    process.stdout.write(`[voice] ${scene.id} “${scene.voice.slice(0, 42)}…” `)
    try {
      if (provider === "openai") {
        await synthesizeOpenAI(scene.voice, file)
      } else {
        try {
          await synthesizeEdge(scene.voice, file)
        } catch (e) {
          if (process.env.OPENAI_API_KEY) {
            console.warn("edge fail → OpenAI")
            await synthesizeOpenAI(scene.voice, file)
            manifest.provider = "openai-fallback"
          } else throw e
        }
      }
      await access(file)
      console.log("ok")
      manifest.parts.push({ id: scene.id, file: `voice/${scene.id}.mp3`, voice: scene.voice })
    } catch (e) {
      console.log("FAIL")
      throw e
    }
  }

  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2))
  console.log("[voice] Done. npm run studio → StudyHubFull · npm run render:full")
}

main().catch((e) => {
  console.error("\n[voice] FAILED:", e.message || e)
  process.exit(1)
})
