/**
 * OPTIONAL — local Edge TTS preview only.
 * Production voice: ElevenLabs by teacher → drop s01.mp3…s12.mp3 into public/voice/
 *
 * Parses SCENE_VOICE from scenes.ts if present; else SCENES order with embedded voices.
 */
import { mkdir, writeFile, access, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { EdgeTTS } from "node-edge-tts"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const outDir = path.join(root, "public/voice")
const scenesFile = path.join(root, "src/lib/scenes.ts")

function parseSceneVoice(ts) {
  const map = {}
  const block = ts.match(/export const SCENE_VOICE[^=]*=\s*\{([\s\S]*?)\n\};/)
  if (!block) return null
  const re = /s(\d{2}):\s*"([^"]*)"/g
  let m
  while ((m = re.exec(block[1]))) {
    map[`s${m[1]}`] = m[2]
  }
  return Object.keys(map).length ? map : null
}

function parseSceneIds(ts) {
  const ids = []
  const re = /id:\s*"(s\d+)"/g
  let m
  while ((m = re.exec(ts))) ids.push(m[1])
  return ids
}

async function synthesizeEdge(text, filepath) {
  const tts = new EdgeTTS({
    voice: "vi-VN-NamMinhNeural",
    lang: "vi-VN",
    outputFormat: "audio-24khz-96kbitrate-mono-mp3",
    rate: "+0%",
    timeout: 120000,
  })
  for (let i = 1; i <= 4; i++) {
    try {
      await tts.ttsPromise(text, filepath)
      return
    } catch (e) {
      console.warn(`  retry ${i}`, e?.message || e)
      await new Promise((r) => setTimeout(r, 1000 * i))
    }
  }
  throw new Error("edge tts failed")
}

async function main() {
  const ts = await readFile(scenesFile, "utf8")
  const ids = parseSceneIds(ts)
  const voices = parseSceneVoice(ts)
  if (!voices) {
    console.error("SCENE_VOICE not found in scenes.ts — use ELEVENLABS_SCRIPT.md instead")
    process.exit(1)
  }

  await mkdir(outDir, { recursive: true })
  console.log("[voice] OPTIONAL Edge preview · prefer ElevenLabs for quality")
  console.log("[voice] scenes:", ids.join(", "))

  for (const id of ids) {
    const text = voices[id]
    if (!text) {
      console.warn("[voice] skip missing voice", id)
      continue
    }
    const file = path.join(outDir, `${id}.mp3`)
    process.stdout.write(`[voice] ${id} … `)
    await synthesizeEdge(text, file)
    await access(file)
    console.log("ok")
  }
  console.log("[voice] Done. Better: ElevenLabs → replace these files.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
