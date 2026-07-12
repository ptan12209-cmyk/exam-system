import type { SupabaseClient } from '@supabase/supabase-js'

export type PurgePayload = {
  courseKey?: string
  driveFileIds?: string[]
  remotePaths?: string[]
  /** When true (default), remove empty online_folders that become empty under courseKey */
  deleteEmptyFolders?: boolean
}

export type PurgeResult = {
  deleted: number
  foldersDeleted: number
  notFound: number
  errors: Array<{ key: string; error: string }>
  message?: string
}

/**
 * Machine purge of online_lessons by Drive file id or Bunny remote path.
 * Used when teacher confirms Drive removals from the downloader.
 */
export async function purgeOnlineStudyItems(
  admin: SupabaseClient,
  payload: PurgePayload
): Promise<PurgeResult> {
  const driveFileIds = Array.from(
    new Set((payload.driveFileIds || []).map((x) => String(x || '').trim()).filter(Boolean))
  )
  const remotePaths = Array.from(
    new Set((payload.remotePaths || []).map((x) => String(x || '').trim()).filter(Boolean))
  )
  const courseKey = String(payload.courseKey || '').trim()
  const result: PurgeResult = {
    deleted: 0,
    foldersDeleted: 0,
    notFound: 0,
    errors: [],
  }

  if (!driveFileIds.length && !remotePaths.length) {
    result.message = 'Nothing to purge'
    return result
  }

  const folderIdsTouched = new Set<string>()

  // --- by drive file id ---
  for (const driveFileId of driveFileIds) {
    try {
      let q = admin
        .from('online_lessons')
        .select('id, folder_id')
        .eq('source_drive_file_id', driveFileId)
      // optional course scope via folder join is heavy; filter after if needed
      const { data: rows, error } = await q
      if (error) throw error
      if (!rows || rows.length === 0) {
        result.notFound++
        continue
      }
      for (const row of rows) {
        if (row.folder_id) folderIdsTouched.add(String(row.folder_id))
        const { error: delErr } = await admin
          .from('online_lessons')
          .delete()
          .eq('id', row.id)
        if (delErr) throw delErr
        result.deleted++
      }
    } catch (err) {
      result.errors.push({
        key: `drive:${driveFileId}`,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // --- by bunny remote path ---
  for (const remotePath of remotePaths) {
    try {
      const { data: rows, error } = await admin
        .from('online_lessons')
        .select('id, folder_id')
        .eq('source_remote_path', remotePath)
      if (error) throw error
      if (!rows || rows.length === 0) {
        result.notFound++
        continue
      }
      for (const row of rows) {
        if (row.folder_id) folderIdsTouched.add(String(row.folder_id))
        const { error: delErr } = await admin
          .from('online_lessons')
          .delete()
          .eq('id', row.id)
        if (delErr) throw delErr
        result.deleted++
      }
    } catch (err) {
      result.errors.push({
        key: `remote:${remotePath}`,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // --- optional: prune empty folders (leaf-up, limited depth) ---
  if (payload.deleteEmptyFolders !== false && folderIdsTouched.size) {
    const candidates = Array.from(folderIdsTouched)
    for (const folderId of candidates) {
      try {
        const { count, error: cErr } = await admin
          .from('online_lessons')
          .select('id', { count: 'exact', head: true })
          .eq('folder_id', folderId)
        if (cErr) throw cErr
        if ((count || 0) > 0) continue

        const { count: childCount, error: chErr } = await admin
          .from('online_folders')
          .select('id', { count: 'exact', head: true })
          .eq('parent_id', folderId)
        if (chErr) throw chErr
        if ((childCount || 0) > 0) continue

        // If courseKey provided, only delete folders belonging to that course
        if (courseKey) {
          const { data: folder } = await admin
            .from('online_folders')
            .select('id, examhub_course_key, source_path')
            .eq('id', folderId)
            .maybeSingle()
          if (!folder) continue
          if (folder.examhub_course_key && folder.examhub_course_key !== courseKey) continue
          // never delete subject root (empty source_path)
          if (!folder.source_path) continue
        }

        const { error: delF } = await admin
          .from('online_folders')
          .delete()
          .eq('id', folderId)
        if (delF) throw delF
        result.foldersDeleted++
      } catch (err) {
        result.errors.push({
          key: `folder:${folderId}`,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  result.message = `Deleted ${result.deleted} lesson(s), ${result.foldersDeleted} empty folder(s)`
  return result
}
