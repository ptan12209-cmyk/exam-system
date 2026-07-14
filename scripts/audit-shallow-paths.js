'use strict';

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

function depth(sp) {
    const s = String(sp || '')
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '');
    if (!s) return 0;
    return s.split('/').filter(Boolean).length;
}

async function fetchAll(url, key, table, select) {
    const page = 1000;
    let from = 0;
    const all = [];
    for (;;) {
        const res = await fetch(
            `${url}/rest/v1/${table}?select=${encodeURIComponent(select)}&order=id.asc`,
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
    }
    return all;
}

async function main() {
    const env = loadEnv(path.join('X:/ECODEx/exam-system/.env.local'));
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;

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
        'id,folder_id,title,source_kind,description,video_url,source_bunny_video_id'
    );
    const folderById = new Map(folders.map((f) => [f.id, f]));

    // Histogram: lessons by folder depth
    const hist = { 0: 0, 1: 0, 2: 0, 3: 0, '4+': 0 };
    const histVideo = { 0: 0, 1: 0, 2: 0, 3: 0, '4+': 0 };
    const shallowVideos = [];
    const shallowFolders = new Map(); // folder_id -> count of lessons

    for (const l of lessons) {
        const f = folderById.get(l.folder_id);
        const d = f ? depth(f.source_path) : -1;
        const bucket = d < 0 ? 'missing' : d >= 4 ? '4+' : String(d);
        hist[bucket] = (hist[bucket] || 0) + 1;
        const isVideo = l.source_kind === 'video' || !!l.video_url || !!l.source_bunny_video_id;
        if (isVideo) {
            histVideo[bucket] = (histVideo[bucket] || 0) + 1;
            if (d <= 1) {
                shallowVideos.push({
                    id: l.id,
                    title: l.title,
                    subject: f && f.subject,
                    folder: f && f.name,
                    path: f && f.source_path,
                    depth: d,
                    desc: l.description
                });
                if (f) {
                    shallowFolders.set(f.id, (shallowFolders.get(f.id) || 0) + 1);
                }
            }
        }
    }

    console.log('lesson depth histogram', hist);
    console.log('VIDEO depth histogram', histVideo);
    console.log('shallow videos (depth<=1)', shallowVideos.length);

    // Top shallow folders by video count
    const top = [...shallowFolders.entries()]
        .map(([id, n]) => {
            const f = folderById.get(id);
            return { n, id, name: f && f.name, path: f && f.source_path, subject: f && f.subject, parent: f && f.parent_id };
        })
        .sort((a, b) => b.n - a.n);

    console.log('\n=== Top folders holding shallow videos ===');
    top.slice(0, 40).forEach((t) => {
        const parent = t.parent ? folderById.get(t.parent) : null;
        console.log(
            JSON.stringify({
                n: t.n,
                subject: t.subject,
                name: t.name,
                path: t.path,
                parentName: parent && parent.name,
                parentPath: parent && parent.source_path
            })
        );
    });

    // Folders at depth 1 that look like lesson folders (Bài X) under root COMBO
    const depth1Folders = folders.filter((f) => depth(f.source_path) === 1);
    console.log('\ndepth-1 folders total', depth1Folders.length);
    const orphanish = depth1Folders.filter((f) => {
        const parent = f.parent_id ? folderById.get(f.parent_id) : null;
        return parent && (!parent.parent_id || depth(parent.source_path) === 0);
    });
    console.log('depth-1 under root', orphanish.length);
    // name patterns that should be deeper (Bài, Phần, Chương)
    const suspiciousNames = orphanish.filter((f) =>
        /bài|phan|phần|chương|chuyen de|chuyên đề|s11|t1-|live/i.test(f.name)
    );
    console.log('suspicious depth-1 names (look like nested content)', suspiciousNames.length);
    suspiciousNames.slice(0, 30).forEach((f) => {
        const nLessons = lessons.filter((l) => l.folder_id === f.id).length;
        console.log(JSON.stringify({ subject: f.subject, name: f.name, path: f.source_path, lessons: nLessons }));
    });

    // Truly on root
    const rootLessons = lessons.filter((l) => {
        const f = folderById.get(l.folder_id);
        return f && depth(f.source_path) === 0;
    });
    console.log('\n=== Truly on COMBO root ===', rootLessons.length);
    rootLessons.forEach((l) => {
        const f = folderById.get(l.folder_id);
        console.log(JSON.stringify({ subject: f.subject, title: l.title, kind: l.source_kind }));
    });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
