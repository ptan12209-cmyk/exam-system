'use strict';

/**
 * Structural audit of online_folders / online_lessons after apply.
 *
 *   node scripts/audit-online-tree.js
 * Exit 0 = pass, 2 = fail
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

const MON_RE =
    /^(0?[1-6]\.\s*m[oôó]n\b|0?7\.\s*khoa|0?8\.\s*combo|📚)/i;

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
    if (!url || !key) throw new Error('Missing Supabase env');

    const folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path,folder_key'
    );
    const lessons = await fetchAll(
        url,
        key,
        'online_lessons',
        'id,title,folder_id,content_key,source_kind'
    );

    const roots = folders.filter((f) => !f.parent_id || f.source_path === '' || f.source_path == null);
    const rootIds = new Set(roots.map((r) => r.id));

    const monDepth1 = [];
    const suWrong = [];
    const vactBad = [];
    const depth1 = {};

    for (const root of roots) {
        const kids = folders.filter((f) => f.parent_id === root.id);
        depth1[root.subject] = kids.map((k) => k.name).sort((a, b) => a.localeCompare(b, 'vi'));
        for (const k of kids) {
            if (MON_RE.test(k.name)) monDepth1.push({ subject: root.subject, name: k.name });
            if (root.subject === 'dgnl_vact' && /s[ửư]/i.test(k.name) && /c[oô]/i.test(k.name)) {
                vactBad.push(k.name);
            }
        }
    }

    for (const f of folders) {
        if (f.subject === 'history') continue;
        if (/^s[ửư]\s*c[oô]/i.test(String(f.name || '').normalize('NFC'))) {
            suWrong.push({ subject: f.subject, name: f.name });
        }
    }

    const lessonsAtRoot = lessons.filter((l) => rootIds.has(l.folder_id));
    const withKey = lessons.filter((l) => l.content_key).length;
    const foldersWithKey = folders.filter((f) => f.folder_key).length;
    const keyCounts = new Map();
    for (const l of lessons) {
        if (!l.content_key) continue;
        keyCounts.set(l.content_key, (keyCounts.get(l.content_key) || 0) + 1);
    }
    const dupeKeys = [...keyCounts.entries()].filter(([, n]) => n > 1);

    const report = {
        at: new Date().toISOString(),
        folders: folders.length,
        lessons: lessons.length,
        monDepth1: monDepth1.length,
        monDepth1Samples: monDepth1.slice(0, 15),
        suWrongSubject: suWrong.length,
        suWrongSamples: suWrong.slice(0, 10),
        vactHasSu: vactBad.length,
        lessonsAtRoot: lessonsAtRoot.length,
        contentKeyCoverage: lessons.length ? withKey / lessons.length : 1,
        folderKeyCoverage: folders.length ? foldersWithKey / folders.length : 1,
        duplicateContentKeys: dupeKeys.length,
        depth1
    };

    const pass =
        monDepth1.length === 0 &&
        suWrong.length === 0 &&
        vactBad.length === 0 &&
        lessonsAtRoot.length === 0 &&
        dupeKeys.length === 0 &&
        (lessons.length === 0 || withKey === lessons.length) &&
        (folders.length === 0 || foldersWithKey === folders.length);

    report.pass = pass;

    const out = path.join('X:/ECODEx/exam-system/scripts/audit-online-tree-report.json');
    fs.writeFileSync(out, JSON.stringify(report, null, 2));

    console.log(JSON.stringify(report, null, 2));
    console.log(pass ? '\nAUDIT PASS' : '\nAUDIT FAIL');
    console.log('wrote', out);
    process.exit(pass ? 0 : 2);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
