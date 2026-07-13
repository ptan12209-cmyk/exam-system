'use strict'

/**
 * Analyze duplicate online_lessons (same folder + same title, or same drive id).
 */
const fs = require('fs')

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

async function fetchAll(url, key, table, select, extra = '') {
  const page = 1000
  let from = 0
  const all = []
  for (;;) {
    const res = await fetch(
      `${url}/rest/v1/${table}?select=${encodeURIComponent(select)}${extra}&order=id.asc`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Range: `${from}-${from + page - 1}`,
          Prefer: 'count=exact',
        },
      }
    )
    const rows = await res.json()
    if (!Array.isArray(rows) || !rows.length) break
    all.push(...rows)
    if (rows.length < page) break
    from += page
    if (from > 100000) break
  }
  return all
}

async function main() {
  const env = loadEnv('X:/ECODEx/exam-system/.env.local')
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY

  console.log('Loading lessons…')
  const lessons = await fetchAll(
    url,
    key,
    'online_lessons',
    'id,folder_id,title,source_kind,source_drive_file_id,source_remote_path,document_url,video_url,created_at,last_synced_at'
  )
  console.log('total lessons', lessons.length)

  // Group by folder_id + normalized title
  const byFolderTitle = new Map()
  const byDrive = new Map()
  for (const l of lessons) {
    const titleKey = String(l.title || '')
      .toLowerCase()
      .replace(/\.pdf$/i, '')
      .replace(/\s+/g, ' ')
      .trim()
    const ft = `${l.folder_id}||${titleKey}`
    if (!byFolderTitle.has(ft)) byFolderTitle.set(ft, [])
    byFolderTitle.get(ft).push(l)

    if (l.source_drive_file_id) {
      const d = String(l.source_drive_file_id)
      if (!byDrive.has(d)) byDrive.set(d, [])
      byDrive.get(d).push(l)
    }
  }

  let dupeGroups = 0
  let dupeExtra = 0
  const samples = []
  for (const [k, rows] of byFolderTitle) {
    if (rows.length < 2) continue
    dupeGroups++
    dupeExtra += rows.length - 1
    if (samples.length < 15) {
      samples.push({
        folder_id: rows[0].folder_id,
        title: rows[0].title,
        count: rows.length,
        kinds: rows.map((r) => r.source_kind),
        driveIds: [...new Set(rows.map((r) => r.source_drive_file_id).filter(Boolean))],
      })
    }
  }

  let driveDupeGroups = 0
  let driveDupeExtra = 0
  for (const [, rows] of byDrive) {
    if (rows.length < 2) continue
    driveDupeGroups++
    driveDupeExtra += rows.length - 1
  }

  // empty drive id + same title+folder
  const noDrive = lessons.filter((l) => !l.source_drive_file_id)
  console.log('\n=== SUMMARY ===')
  console.log({
    totalLessons: lessons.length,
    folderTitleDupeGroups: dupeGroups,
    folderTitleExtraRows: dupeExtra, // can delete these
    driveIdDupeGroups: driveDupeGroups,
    driveIdExtraRows: driveDupeExtra,
    lessonsWithoutDriveId: noDrive.length,
  })
  console.log('\n=== sample folder+title dupes ===')
  console.log(JSON.stringify(samples, null, 2))

  // T1-A1 folder specifically
  const t1 = 'a981f0e4-4c31-4a6f-91a3-89ea99efda8d'
  const t1rows = lessons.filter((l) => l.folder_id === t1)
  const t1g = new Map()
  for (const r of t1rows) {
    const k = String(r.title || '').toLowerCase()
    if (!t1g.has(k)) t1g.set(k, [])
    t1g.get(k).push(r)
  }
  console.log('\n=== T1-A1 folder ===')
  console.log('total', t1rows.length)
  for (const [title, rows] of [...t1g.entries()].sort((a, b) => b[1].length - a[1].length)) {
    if (rows.length > 1) console.log(`  x${rows.length}  ${rows[0].title}`)
  }

  // Write plan: keep newest (last_synced_at or created_at), delete rest
  const toDelete = []
  for (const [, rows] of byFolderTitle) {
    if (rows.length < 2) continue
    const sorted = rows.slice().sort((a, b) => {
      const ta = new Date(a.last_synced_at || a.created_at || 0).getTime()
      const tb = new Date(b.last_synced_at || b.created_at || 0).getTime()
      // Prefer row with drive id, video_url, then newest
      const sa =
        (a.source_drive_file_id ? 100 : 0) +
        (a.video_url ? 50 : 0) +
        (a.document_url ? 10 : 0) +
        ta / 1e13
      const sb =
        (b.source_drive_file_id ? 100 : 0) +
        (b.video_url ? 50 : 0) +
        (b.document_url ? 10 : 0) +
        tb / 1e13
      return sb - sa
    })
    const keep = sorted[0]
    for (const r of sorted.slice(1)) {
      // Never delete the only video in a group if keep is also same - already keeping best
      toDelete.push({ id: r.id, title: r.title, folder_id: r.folder_id, keep: keep.id })
    }
  }

  const out = 'X:/ECODEx/exam-system/scripts/dupe-lessons-to-delete.json'
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalLessons: lessons.length,
        deleteCount: toDelete.length,
        keepRule: 'same folder_id + normalized title → keep best (drive id, media, newest)',
        toDelete,
      },
      null,
      2
    )
  )
  console.log('\nwrote', out, 'deleteCount=', toDelete.length)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
