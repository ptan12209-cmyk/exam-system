'use strict';

/**
 * Wipe online study folders + lessons (ExamHub LMS tree only).
 * Does NOT touch Bunny, Drive, or Local Engine queue.
 *
 *   node scripts/wipe-online-study.js --dry-run
 *   node scripts/wipe-online-study.js --all --confirm
 *   node scripts/wipe-online-study.js --course=combo-xps-2027 --confirm
 */

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry-run');
const CONFIRM = process.argv.includes('--confirm');
const ALL = process.argv.includes('--all');
const courseArg = process.argv.find((a) => a.startsWith('--course='));
const COURSE = courseArg ? courseArg.slice('--course='.length).trim() : '';

function loadEnv(p) {
    const env = {};
    for (const line of fs.readFileSync(p, 'utf8').split(/\n/)) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!m) continue;
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
        }
        env[m[1]] = v;
    }
    return env;
}

async function rest(url, key, method, q, body) {
    const res = await fetch(`${url}/rest/v1/${q}`, {
        method,
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: method === 'DELETE' || method === 'GET' ? 'return=representation' : 'return=representation',
            ...(method === 'GET' ? { Range: '0-9999' } : {})
        },
        body: body != null ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }
    if (!res.ok) throw new Error(`${method} ${q} → ${res.status}: ${String(text).slice(0, 400)}`);
    return data;
}

async function fetchAll(url, key, table, select, filter = '') {
    const page = 1000;
    let from = 0;
    const all = [];
    for (;;) {
        const q = filter
            ? `${table}?${filter}&select=${encodeURIComponent(select)}&order=id.asc`
            : `${table}?select=${encodeURIComponent(select)}&order=id.asc`;
        const res = await fetch(`${url}/rest/v1/${q}`, {
            headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
                Range: `${from}-${from + page - 1}`
            }
        });
        const rows = await res.json();
        if (!Array.isArray(rows) || !rows.length) break;
        all.push(...rows);
        if (rows.length < page) break;
        from += page;
    }
    return all;
}

async function deleteInChunks(url, key, table, ids, label) {
    const chunk = 80;
    let n = 0;
    for (let i = 0; i < ids.length; i += chunk) {
        const part = ids.slice(i, i + chunk);
        const inList = part.map((id) => `"${id}"`).join(',');
        if (DRY) {
            n += part.length;
            continue;
        }
        await rest(url, key, 'DELETE', `${table}?id=in.(${inList})`);
        n += part.length;
        if (i % 400 === 0) console.log(`  ${label}`, n, '/', ids.length);
    }
    return n;
}

async function main() {
    if (!ALL && !COURSE) {
        console.error('Use --all or --course=combo-xps-2027');
        process.exit(1);
    }
    if (!DRY && !CONFIRM) {
        console.error('Refusing wipe without --confirm (or use --dry-run)');
        process.exit(1);
    }

    const env = loadEnv(path.join('X:/ECODEx/exam-system/.env.local'));
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase env');

    console.log(DRY ? 'MODE: dry-run' : 'MODE: WIPE');
    console.log('scope', ALL ? 'ALL online study' : `course=${COURSE}`);

    const folderFilter = ALL ? '' : `examhub_course_key=eq.${encodeURIComponent(COURSE)}`;
    const folders = await fetchAll(url, key, 'online_folders', 'id,name,subject,source_path,examhub_course_key', folderFilter);
    const folderIds = folders.map((f) => f.id);
    console.log('folders', folders.length);

    // Lessons: by folder_id in set, or all if --all
    let lessons = [];
    if (ALL) {
        lessons = await fetchAll(url, key, 'online_lessons', 'id,title,folder_id');
    } else {
        // Fetch all lessons and filter (folder set can be large)
        const allLessons = await fetchAll(url, key, 'online_lessons', 'id,title,folder_id');
        const set = new Set(folderIds);
        lessons = allLessons.filter((l) => set.has(l.folder_id));
    }
    console.log('lessons', lessons.length);

    const lessonIds = lessons.map((l) => l.id);

    // Progress + access logs
    let progressIds = [];
    if (lessonIds.length) {
        // page by lesson ids chunks
        for (let i = 0; i < lessonIds.length; i += 50) {
            const part = lessonIds.slice(i, i + 50);
            const inList = part.map((id) => `"${id}"`).join(',');
            try {
                const rows = await rest(
                    url,
                    key,
                    'GET',
                    `student_lesson_progress?lesson_id=in.(${inList})&select=id`
                );
                if (Array.isArray(rows)) progressIds.push(...rows.map((r) => r.id));
            } catch {
                /* table may not exist / empty */
            }
        }
    }
    console.log('student_lesson_progress rows (matched)', progressIds.length);

    // by subject depth1 sample
    const roots = folders.filter((f) => !f.source_path);
    console.log('roots', roots.length);
    for (const r of roots.slice(0, 20)) {
        const kids = folders.filter((f) => f.source_path && !f.source_path.includes('/') && f.subject === r.subject);
        console.log(`  ${r.subject} depth1≈${kids.length}`, kids.slice(0, 3).map((k) => k.name));
    }

    if (DRY) {
        console.log('DRY-RUN complete — no deletes');
        return;
    }

    // 1 progress
    if (progressIds.length) {
        console.log('deleting progress…');
        await deleteInChunks(url, key, 'student_lesson_progress', progressIds, 'progress');
    }

    // 2 access logs (best effort)
    try {
        for (let i = 0; i < lessonIds.length; i += 50) {
            const part = lessonIds.slice(i, i + 50);
            const inList = part.map((id) => `"${id}"`).join(',');
            await rest(url, key, 'DELETE', `content_access_logs?lesson_id=in.(${inList})`);
        }
    } catch (e) {
        console.warn('content_access_logs skip', e.message);
    }

    // 3 lessons
    console.log('deleting lessons…');
    await deleteInChunks(url, key, 'online_lessons', lessonIds, 'lessons');

    // 4 folders (children first by path depth desc)
    folders.sort((a, b) => {
        const da = String(a.source_path || '').split('/').length;
        const db = String(b.source_path || '').split('/').length;
        return db - da;
    });
    console.log('deleting folders…');
    await deleteInChunks(
        url,
        key,
        'online_folders',
        folders.map((f) => f.id),
        'folders'
    );

    // verify
    const leftF = await fetchAll(
        url,
        key,
        'online_folders',
        'id',
        folderFilter
    );
    const leftL = ALL
        ? await fetchAll(url, key, 'online_lessons', 'id')
        : [];
    console.log('VERIFY folders left', leftF.length, 'lessons left (all)', leftL.length);

    try {
        await rest(url, key, 'POST', 'online_import_logs', {
            course_key: ALL ? '*' : COURSE,
            payload_summary: {
                action: 'wipe',
                all: ALL,
                course: COURSE,
                folders: folders.length,
                lessons: lessons.length,
                progress: progressIds.length
            },
            created_count: 0,
            updated_count: 0,
            skipped_count: 0,
            error_count: 0,
            errors: []
        });
    } catch {
        /* optional */
    }

    console.log('WIPE DONE');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
