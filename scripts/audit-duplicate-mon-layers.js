'use strict';

/**
 * Detect mon-package intermediate layers that duplicate teacher courses
 * already present under COMBO root.
 *
 * Example bad:
 *   COMBO XPS 2027 / 01. MÔN TOÁN 2009 / TOÁN THẦY X / ...
 * while also:
 *   COMBO XPS 2027 / TOÁN THẦY X / ...
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

function isMonPackageName(name) {
    const n = String(name || '');
    return (
        /^0?[1-8]\.\s*m[oô]n\b/i.test(n) ||
        /^0?7\.\s*khoa\s*h[oọ]c\s*x[aã]\s*h[oộ]i/i.test(n) ||
        /^0?8\.\s*combo\s*đ[aá]nh\s*gi[aá]/i.test(n) ||
        /^📚/.test(n)
    );
}

function norm(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFC')
        .replace(/\s+/g, ' ')
        .trim();
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
    const lessons = await fetchAll(url, key, 'online_lessons', 'id,folder_id,title');
    const folderById = new Map(folders.map((f) => [f.id, f]));
    const byParent = new Map();
    for (const f of folders) {
        const p = f.parent_id || 'ROOT';
        if (!byParent.has(p)) byParent.set(p, []);
        byParent.get(p).push(f);
    }
    const lessonCount = new Map();
    for (const l of lessons) {
        lessonCount.set(l.folder_id, (lessonCount.get(l.folder_id) || 0) + 1);
    }

    // Roots per subject
    const roots = folders.filter((f) => !f.parent_id || f.source_path === '');
    console.log('roots', roots.map((r) => `${r.subject}:${r.name}`).join(' | '));

    // Depth-1 children of each root
    for (const root of roots) {
        const kids = byParent.get(root.id) || [];
        const monKids = kids.filter((k) => isMonPackageName(k.name));
        const teacherKids = kids.filter((k) => !isMonPackageName(k.name));
        if (!monKids.length && !teacherKids.length) continue;
        console.log(
            `\n== ${root.subject} root kids: mon=${monKids.length} other=${teacherKids.length}`
        );
        if (monKids.length) {
            console.log('  mon layers:', monKids.map((m) => m.name).join(' ;; '));
        }
        // For each mon layer, list its children teacher names
        for (const mon of monKids) {
            const monChildren = byParent.get(mon.id) || [];
            const dups = [];
            for (const child of monChildren) {
                // Is same name also under root?
                const alsoAtRoot = teacherKids.find(
                    (t) => norm(t.name) === norm(child.name)
                );
                if (alsoAtRoot) {
                    dups.push({
                        name: child.name,
                        underMon: child.id,
                        atRoot: alsoAtRoot.id,
                        monPath: mon.source_path,
                        monLessons: lessonCount.get(child.id) || 0,
                        rootLessons: lessonCount.get(alsoAtRoot.id) || 0
                    });
                }
            }
            console.log(
                `  under mon "${mon.name}": ${monChildren.length} children, ${dups.length} also at subject root`
            );
            dups.slice(0, 15).forEach((d) =>
                console.log(
                    '   DUP',
                    d.name,
                    `lessons mon-child=${d.monLessons} root-copy=${d.rootLessons}`
                )
            );
        }
        // Sample non-mon depth1
        console.log(
            '  sample root courses:',
            teacherKids
                .slice(0, 12)
                .map((t) => t.name)
                .join(' ;; ')
        );
    }

    // Global: mon package folders (depth1)
    const monDepth1 = folders.filter(
        (f) => isMonPackageName(f.name) && f.source_path && !String(f.source_path).includes('/')
    );
    console.log('\n=== All mon-layer depth1 folders ===', monDepth1.length);
    monDepth1.forEach((m) => {
        const kids = byParent.get(m.id) || [];
        console.log(
            JSON.stringify({
                subject: m.subject,
                name: m.name,
                kids: kids.length,
                kidNames: kids.slice(0, 8).map((k) => k.name)
            })
        );
    });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
