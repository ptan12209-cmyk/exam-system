'use strict';

/**
 * Find online_lessons parked on root (or near-root) folders instead of deep Drive paths.
 */
const fs = require('fs');
const path = require('path');

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

async function fetchAll(url, key, table, select, extra = '') {
    const page = 1000;
    let from = 0;
    const all = [];
    for (;;) {
        const res = await fetch(
            `${url}/rest/v1/${table}?select=${encodeURIComponent(select)}${extra}&order=id.asc`,
            {
                headers: {
                    apikey: key,
                    Authorization: `Bearer ${key}`,
                    Range: `${from}-${from + page - 1}`
                }
            }
        );
        const rows = await res.json();
        if (!Array.isArray(rows) || !rows.length) break;
        all.push(...rows);
        if (rows.length < page) break;
        from += page;
        if (from > 200000) break;
    }
    return all;
}

function depthOfSourcePath(sp) {
    const s = String(sp || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!s) return 0;
    return s.split('/').filter(Boolean).length;
}

async function main() {
    const env = loadEnv(path.join('X:/ECODEx/exam-system/.env.local'));
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('missing supabase env');

    console.log('Loading folders + lessons…');
    const folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path,examhub_course_key'
    );
    const lessons = await fetchAll(
        url,
        key,
        'online_lessons',
        'id,folder_id,title,source_kind,source_drive_file_id,source_remote_path,video_url,document_url,description,created_at'
    );

    const folderById = new Map(folders.map((f) => [f.id, f]));
    console.log({ folders: folders.length, lessons: lessons.length });

    // Roots: parent_id null OR source_path empty
    const roots = folders.filter((f) => !f.parent_id || String(f.source_path || '') === '');
    console.log('root folders:', roots.length);
    for (const r of roots.slice(0, 30)) {
        console.log(
            `  [${r.subject}] ${r.name} | path="${r.source_path || ''}" | course=${r.examhub_course_key}`
        );
    }

    // Lessons whose folder is root (depth 0)
    const onRoot = [];
    const nearRoot = []; // depth 1 only (directly under root = mon or teacher sometimes)
    const bySubjectRoot = {};

    for (const l of lessons) {
        const f = folderById.get(l.folder_id);
        if (!f) {
            onRoot.push({ ...l, _issue: 'missing_folder', folder: null });
            continue;
        }
        const depth = depthOfSourcePath(f.source_path);
        const isRoot = !f.parent_id || depth === 0;
        if (isRoot) {
            onRoot.push({
                lesson_id: l.id,
                title: l.title,
                kind: l.source_kind,
                subject: f.subject,
                folder_id: f.id,
                folder_name: f.name,
                source_path: f.source_path,
                description: l.description,
                remote: l.source_remote_path,
                has_video: !!(l.video_url || l.source_kind === 'video'),
                course: f.examhub_course_key
            });
            bySubjectRoot[f.subject] = (bySubjectRoot[f.subject] || 0) + 1;
        } else if (depth === 1) {
            // only count videos at depth 1 as suspicious (PDFs can be ok under mon folder)
            if (l.source_kind === 'video' || l.video_url) {
                nearRoot.push({
                    lesson_id: l.id,
                    title: l.title,
                    kind: l.source_kind,
                    subject: f.subject,
                    folder_name: f.name,
                    source_path: f.source_path,
                    description: l.description
                });
            }
        }
    }

    console.log('\n=== LESSONS ON ROOT FOLDER ===');
    console.log('count', onRoot.length);
    console.log('by subject', bySubjectRoot);
    const rootVideos = onRoot.filter((x) => x.has_video || x.kind === 'video');
    const rootDocs = onRoot.filter((x) => !x.has_video && x.kind !== 'video');
    console.log({ rootVideos: rootVideos.length, rootDocs: rootDocs.length });

    console.log('\n--- sample root videos (30) ---');
    rootVideos.slice(0, 30).forEach((x) => {
        console.log(
            JSON.stringify({
                subject: x.subject,
                folder: x.folder_name,
                title: x.title,
                desc: String(x.description || '').slice(0, 120),
                remote: String(x.remote || '').slice(0, 80)
            })
        );
    });

    console.log('\n--- sample root docs (15) ---');
    rootDocs.slice(0, 15).forEach((x) => {
        console.log(
            JSON.stringify({
                subject: x.subject,
                folder: x.folder_name,
                title: x.title,
                desc: String(x.description || '').slice(0, 100)
            })
        );
    });

    console.log('\n=== VIDEOS AT DEPTH=1 (directly under mon/root child) ===');
    console.log('count', nearRoot.length);
    nearRoot.slice(0, 25).forEach((x) => {
        console.log(
            JSON.stringify({
                subject: x.subject,
                folder: x.folder_name,
                path: x.source_path,
                title: x.title,
                desc: String(x.description || '').slice(0, 120)
            })
        );
    });

    // Also: lessons whose description has deep path but folder is shallow
    const mismatched = [];
    for (const l of lessons) {
        if (!(l.source_kind === 'video' || l.video_url)) continue;
        const f = folderById.get(l.folder_id);
        if (!f) continue;
        const folderDepth = depthOfSourcePath(f.source_path);
        const descDepth = depthOfSourcePath(l.description);
        if (descDepth >= 3 && folderDepth <= 1) {
            mismatched.push({
                title: l.title,
                folder: f.name,
                folderPath: f.source_path,
                folderDepth,
                desc: l.description,
                descDepth,
                subject: f.subject,
                id: l.id
            });
        }
    }
    console.log('\n=== VIDEO: description deep but folder shallow (path mismatch) ===');
    console.log('count', mismatched.length);
    mismatched.slice(0, 40).forEach((x) => console.log(JSON.stringify(x)));

    const out = {
        generatedAt: new Date().toISOString(),
        totals: {
            folders: folders.length,
            lessons: lessons.length,
            onRoot: onRoot.length,
            rootVideos: rootVideos.length,
            rootDocs: rootDocs.length,
            videosDepth1: nearRoot.length,
            pathMismatch: mismatched.length
        },
        bySubjectRoot,
        onRoot: onRoot.slice(0, 500),
        pathMismatch: mismatched.slice(0, 500),
        videosDepth1: nearRoot.slice(0, 300)
    };
    const outPath = path.join('X:/ECODEx/exam-system/scripts/audit-root-lessons-report.json');
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log('\nwrote', outPath);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
