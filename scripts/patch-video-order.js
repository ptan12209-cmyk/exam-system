'use strict'
const fs = require('fs')
const env = {}
for (const line of fs.readFileSync('X:/ECODEx/exam-system/.env.local', 'utf8').split(/\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (!m) continue
  let v = m[2].trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  env[m[1]] = v
}
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
const PDF_FOLDER = 'a981f0e4-4c31-4a6f-91a3-89ea99efda8d'
const LESSON = 'ecd8d5cf-812f-48bc-b55a-0141e47756ff'
;(async () => {
  const patch = await fetch(`${url}/rest/v1/online_lessons?id=eq.${LESSON}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      folder_id: PDF_FOLDER,
      order_index: 4,
      last_synced_at: new Date().toISOString(),
    }),
  })
  console.log('patch', patch.status, (await patch.text()).slice(0, 400))
  const list = await fetch(
    `${url}/rest/v1/online_lessons?folder_id=eq.${PDF_FOLDER}&select=title,source_kind,order_index,video_url&order=order_index.asc`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  const rows = await list.json()
  console.log('count', rows.length)
  for (const r of rows) {
    if (r.source_kind === 'video' || r.video_url) console.log('VIDEO', r.order_index, r.title)
  }
})()
