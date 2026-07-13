'use strict'

/**
 * Delete duplicate online_lessons: same folder_id + normalized title → keep 1 best row.
 * Usage: node scripts/dedupe-lessons.js [--apply]
 * Default is dry-run.
 */
const fs = require('fs')
const path = require('path')

const APPLY = process.argv.includes('--apply')

function loadEnv(p) {
  const env = {}
  for (const line of fs.readFileSync(p, 'utf8').split(/\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    env[m[1]] = v
  }
  return env
}

function score(row) {
  const t = new Date(row.last_synced_at || row.created_at || 0).getTime()
  return (
    (row.source_drive_file_id ? 1e12 : 0) +
    (row.video_url || (Array.isArray(row.videos) && row.videos.length) ? 1e11 : 0) +
    (row.document_url || (Array.isArray(row.documents) && row.documents.length) ? 1e10 : 0) +
    (row.source_remote_path ? 1e9 : 0) +
    t
  )
}

function normTitle(t) {
  return String(t || '')
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchAll(url, key) {
  const page = 1000
  let from = 0
  const all = []
  for (;;) {
    const res = await fetch(
      `${url}/rest/v1/online_lessons?select=id,folder_id,title,source_kind,source_drive_file_id,source_remote_path,document_url,video_url,videos,documents,created_at,last_synced_at&order=id.asc`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Range: `${from}-${from + page - 1}`,
        },
      }
    )
    const rows = await res.json()
    if (!Array.isArray(rows) || !rows.length) break
    all.push(...rows)
    if (rows.length < page) break
    from += page
  }
  return all
}

async function deleteBatch(url, key, ids) {
  // PostgREST: DELETE ...?id=in.(uuid1,uuid2)
  const chunk = ids.map((id) => `"${id}"`).join(',')
  const res = await fetch(`${url}/rest/v1/online_lessons?id=in.(${chunk})`, {
    method: 'DELETE',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=minimal',
    },
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`DELETE ${res.status}: ${t.slice(0, 300)}`)
  }
  return ids.length
}

async function main() {
  const env = loadEnv(path.join('X:/ECODEx/exam-system/.env.local'))
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('missing supabase env')

  console.log(APPLY ? 'MODE: APPLY (will delete)' : 'MODE: dry-run')
  const lessons = await fetchAll(url, key)
  console.log('loaded', lessons.length)

  const groups = new Map()
  for (const l of lessons) {
    const k = `${l.folder_id}||${normTitle(l.title)}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(l)
  }

  const toDelete = []
  let keepCount = 0
  for (const [, rows] of groups) {
    if (rows.length < 2) {
      keepCount++
      continue
    }
    const sorted = rows.slice().sort((a, b) => score(b) - score(a))
    keepCount++
    for (const r of sorted.slice(1)) toDelete.push(r.id)
  }

  console.log({
    groups: groups.size,
    keep: keepCount,
    delete: toDelete.length,
    after: lessons.length - toDelete.length,
  })

  const planPath = path.join('X:/ECODEx/exam-system/scripts/dupe-lessons-to-delete.json')
  fs.writeFileSync(
    planPath,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), apply: APPLY, deleteCount: toDelete.length, ids: toDelete },
      null,
      2
    )
  )

  if (!APPLY) {
    console.log('Dry-run only. Re-run with --apply to delete', toDelete.length, 'rows')
    return
  }

  let deleted = 0
  const batchSize = 80
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize)
    deleted += await deleteBatch(url, key, batch)
    if (i % 800 === 0) console.log(`deleted ${deleted}/${toDelete.length}`)
  }
  console.log('DONE deleted', deleted)

  // verify
  const after = await fetchAll(url, key)
  console.log('remaining lessons', after.length)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
