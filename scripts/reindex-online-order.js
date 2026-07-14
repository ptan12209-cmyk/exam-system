'use strict';

/**
 * Reindex online_folders + online_lessons order_index by natural name order
 * within each parent (folder siblings / lessons in folder).
 *
 * Fixes hash-based order on unnumbered teacher packages from import.
 *
 *   node scripts/reindex-online-order.js
 *   node scripts/reindex-online-order.js --dry-run
 *   node scripts/reindex-online-order.js --folders-only
 *   node scripts/reindex-online-order.js --lessons-only
 */

const fs = require('fs');
const path = require('path');

const dryRun = process.argv.includes('--dry-run');
const foldersOnly = process.argv.includes('--folders-only');
const lessonsOnly = process.argv.includes('--lessons-only');

function loadEnv(p) {
    const env = {};
    for (const line of fs.readFileSync(p, 'utf8').split(/\n/)) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!m) continue;
        let v = m[2].trim();
        if (
            (v.startsWith('"') && v.endsWith('"')) ||
            (v.startsWith("'") && v.endsWith("'"))
        ) {
            v = v.slice(1, -1);
        }
        env[m[1]] = v;
    }
    return env;
}

/** Natural Vietnamese + numeric compare (1 < 2 < 10). */
function naturalCmp(a, b) {
    return String(a || '').localeCompare(String(b || ''), 'vi', {
        numeric: true,
        sensitivity: 'base',
    });
}

/**
 * Same spirit as ExamHub import naturalOrderIndex — numbered names sort by
 * major/minor; unnumbered fall back to alpha (no hash — hash caused messy UI).
 */
function naturalOrderIndex(name) {
    const s = String(name || '').trim();
    if (!s) return 999_999;

    let m = s.match(/^(\d{1,4})(?:[.\-_](\d{1,4}))?[.\-_)\]\s]/);
    if (m) {
        const major = parseInt(m[1], 10);
        const minor = m[2] != null ? parseInt(m[2], 10) : 0;
        return major * 1000 + minor;
    }

    m = s.match(
        /(?:chương|chuong|bài|bai|theme|phần|phan|buổi|buoi|step|chapter)\s*(\d{1,4})(?:[.\-_](\d{1,4}))?/i
    );
    if (m) {
        const major = parseInt(m[1], 10);
        const minor = m[2] != null ? parseInt(m[2], 10) : 0;
        return major * 1000 + minor;
    }

    // Soft deprioritize trailer packs
    const lower = s.toLocaleLowerCase('vi');
    if (
        /^z[\s.\-_]/i.test(s) ||
        /^ebook\b/i.test(lower) ||
        /\bbonus\b/i.test(lower)
    ) {
        return 800_000 + (s.charCodeAt(0) || 0);
    }

    // Alpha band for teacher packs / unnumbered — stable by first chars
    // Map to 100000+ range sorted later by naturalCmp among same band
    return 100_000;
}

function siblingSort(aName, bName) {
    const oa = naturalOrderIndex(aName);
    const ob = naturalOrderIndex(bName);
    if (oa !== ob) return oa - ob;
    return naturalCmp(aName, bName);
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
                    Range: `${from}-${from + page - 1}`,
                },
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

async function patchRow(url, key, table, id, body) {
    const res = await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`PATCH ${table} ${id}: HTTP ${res.status} ${t.slice(0, 200)}`);
    }
}

async function runPool(items, concurrency, worker) {
    let i = 0;
    let active = 0;
    let errors = 0;
    return new Promise((resolve) => {
        const next = () => {
            if (i >= items.length && active === 0) return resolve(errors);
            while (active < concurrency && i < items.length) {
                const item = items[i++];
                active++;
                Promise.resolve()
                    .then(() => worker(item))
                    .catch((e) => {
                        errors++;
                        console.error('  err', e.message);
                    })
                    .finally(() => {
                        active--;
                        next();
                    });
            }
        };
        next();
    });
}

async function main() {
    const env = loadEnv(path.join('X:/ECODEx/exam-system/.env.local'));
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase env');

    console.log('MODE', dryRun ? 'dry-run' : 'apply', { foldersOnly, lessonsOnly });

    const patches = [];
    const samples = [];

    if (!lessonsOnly) {
        console.log('Loading folders…');
        const folders = await fetchAll(
            url,
            key,
            'online_folders',
            'id,name,parent_id,subject,order_index'
        );
        console.log('  folders', folders.length);

        const byParent = new Map();
        for (const f of folders) {
            const p = f.parent_id || '__ROOT__';
            if (!byParent.has(p)) byParent.set(p, []);
            byParent.get(p).push(f);
        }

        for (const [, kids] of byParent) {
            // Keep roots (parent null) as-is if only course roots
            const sorted = kids.slice().sort((a, b) => siblingSort(a.name, b.name));
            sorted.forEach((f, idx) => {
                const desired = (idx + 1) * 1000;
                if (Number(f.order_index) !== desired) {
                    patches.push({ table: 'online_folders', id: f.id, order_index: desired });
                    if (samples.length < 25) {
                        samples.push({
                            type: 'folder',
                            name: f.name,
                            subject: f.subject,
                            from: f.order_index,
                            to: desired,
                        });
                    }
                }
            });
        }
    }

    if (!foldersOnly) {
        console.log('Loading lessons…');
        const lessons = await fetchAll(
            url,
            key,
            'online_lessons',
            'id,title,folder_id,order_index,source_kind'
        );
        console.log('  lessons', lessons.length);

        const byFolder = new Map();
        for (const l of lessons) {
            const p = l.folder_id || '__NONE__';
            if (!byFolder.has(p)) byFolder.set(p, []);
            byFolder.get(p).push(l);
        }

        for (const [, kids] of byFolder) {
            const sorted = kids.slice().sort((a, b) => {
                // Prefer videos before docs when same name-ish; else natural title
                const ka = a.source_kind === 'video' ? 0 : 1;
                const kb = b.source_kind === 'video' ? 0 : 1;
                if (ka !== kb) {
                    // only separate if titles collide loosely — actually keep pure natural by title
                }
                return siblingSort(a.title, b.title);
            });
            sorted.forEach((l, idx) => {
                const desired = (idx + 1) * 1000;
                if (Number(l.order_index) !== desired) {
                    patches.push({ table: 'online_lessons', id: l.id, order_index: desired });
                    if (samples.length < 40) {
                        samples.push({
                            type: 'lesson',
                            name: l.title,
                            kind: l.source_kind,
                            from: l.order_index,
                            to: desired,
                        });
                    }
                }
            });
        }
    }

    console.log('\nPatches needed:', patches.length);
    console.log('Samples:');
    samples.slice(0, 20).forEach((s) =>
        console.log(
            ' ',
            s.type,
            s.from,
            '→',
            s.to,
            (s.name || '').slice(0, 55),
            s.subject || s.kind || ''
        )
    );

    if (dryRun) {
        console.log('\nDRY-RUN — no writes');
        process.exit(0);
    }

    if (!patches.length) {
        console.log('Nothing to update');
        process.exit(0);
    }

    console.log('\nApplying patches (concurrency 12)…');
    let done = 0;
    const total = patches.length;
    const errors = await runPool(patches, 12, async (p) => {
        await patchRow(url, key, p.table, p.id, { order_index: p.order_index });
        done++;
        if (done % 200 === 0 || done === total) {
            console.log(`  ${done}/${total}`);
        }
    });

    console.log('\nDONE patches', total, 'errors', errors);

    // Spot-check depth1 for a few subjects
    console.log('\n=== Spot-check depth1 after ===');
    const folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,parent_id,subject,order_index'
    );
    const roots = folders.filter((f) => !f.parent_id);
    for (const root of roots.slice(0, 4)) {
        const kids = folders
            .filter((f) => f.parent_id === root.id)
            .sort((a, b) => a.order_index - b.order_index);
        console.log('\n', root.subject);
        kids.forEach((k) => console.log(' ', k.order_index, k.name));
    }

    process.exit(errors ? 3 : 0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
