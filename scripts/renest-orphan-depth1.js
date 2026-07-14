'use strict';

/**
 * Re-nest orphan depth-1 folders that are NOT teacher packages.
 * Uses source_path prefix matching against sibling teacher packages.
 *
 * node scripts/renest-orphan-depth1.js
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

function nfc(s) {
    return String(s || '').normalize('NFC');
}
function norm(s) {
    return nfc(s).toLowerCase().replace(/\s+/g, ' ').trim();
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

async function rest(url, key, method, q, body) {
    const res = await fetch(`${url}/rest/v1/${q}`, {
        method,
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: method === 'DELETE' ? 'return=minimal' : 'return=representation'
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

/** Teacher / package tops that should stay at depth1 */
function isPackageTop(name) {
    const n = nfc(name);
    return (
        /^(TOÁN|NỀN TẢNG TOÁN|LÝ THẦY|HÓA |SINH |TIẾNG ANH|VĂN |HỌC VĂN|SỬ CÔ|ĐỊA LÝ)/i.test(n) ||
        /^0[1-4]\.\s*ĐÁNH GIÁ/i.test(n) ||
        /^0[1-4]\.\s*ĐGNL/i.test(n) ||
        /V-?ACT|HSA|TSA|SƯ PHẠM/i.test(n)
    );
}

async function main() {
    const env = loadEnv(path.join('X:/ECODEx/exam-system/.env.local'));
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;

    let folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path'
    );
    const stats = { renested: 0, deletedEmpty: 0, errors: [] };

    const roots = folders.filter((f) => !f.parent_id || f.source_path === '' || f.source_path == null);

    for (const root of roots) {
        const kids = folders.filter((f) => f.parent_id === root.id);
        const packages = kids.filter((k) => isPackageTop(k.name));
        const orphans = kids.filter((k) => !isPackageTop(k.name));
        if (!orphans.length) continue;

        console.log(`\n${root.subject}: ${packages.length} packages, ${orphans.length} orphans`);

        for (const orphan of orphans) {
            const osp = nfc(orphan.source_path || orphan.name);
            // Try match: source_path starts with package name
            let target = packages.find((p) => {
                const pn = nfc(p.name);
                return (
                    osp.startsWith(pn + '/') ||
                    osp.startsWith(pn) ||
                    nfc(orphan.source_path || '').includes('/' + pn + '/') ||
                    nfc(orphan.source_path || '').startsWith(pn + '/')
                );
            });

            // Fallback: only one package under subject → put under it
            if (!target && packages.length === 1) target = packages[0];

            // For physics multi-package, try keyword match from source_path middle segments
            if (!target && orphan.source_path) {
                const segs = nfc(orphan.source_path).split('/');
                for (const seg of segs) {
                    target = packages.find((p) => norm(p.name) === norm(seg));
                    if (target) break;
                }
            }

            if (!target) {
                console.log('  ? orphan no target:', orphan.name, '| path=', orphan.source_path);
                continue;
            }

            // merge if target already has same-name child
            const tKids = await rest(
                url,
                key,
                'GET',
                `online_folders?parent_id=eq.${target.id}&select=id,name`
            );
            const exist = (Array.isArray(tKids) ? tKids : []).find(
                (x) => norm(x.name) === norm(orphan.name)
            );

            if (exist) {
                console.log('  merge', orphan.name, '→', target.name);
                // move lessons
                const les = await rest(
                    url,
                    key,
                    'GET',
                    `online_lessons?folder_id=eq.${orphan.id}&select=id`
                );
                for (const l of Array.isArray(les) ? les : []) {
                    await rest(url, key, 'PATCH', `online_lessons?id=eq.${l.id}`, {
                        folder_id: exist.id
                    });
                }
                // reparent kids of orphan under exist
                const okids = await rest(
                    url,
                    key,
                    'GET',
                    `online_folders?parent_id=eq.${orphan.id}&select=id,name`
                );
                for (const c of Array.isArray(okids) ? okids : []) {
                    await rest(url, key, 'PATCH', `online_folders?id=eq.${c.id}`, {
                        parent_id: exist.id
                    });
                }
                try {
                    await rest(url, key, 'DELETE', `online_folders?id=eq.${orphan.id}`);
                    stats.deletedEmpty++;
                } catch {
                    /* */
                }
            } else {
                const newPath = target.source_path
                    ? `${target.source_path}/${orphan.name}`
                    : `${target.name}/${orphan.name}`;
                console.log('  nest', orphan.name, '→ under', target.name);
                await rest(url, key, 'PATCH', `online_folders?id=eq.${orphan.id}`, {
                    parent_id: target.id,
                    source_path: newPath,
                    subject: root.subject
                });
            }
            stats.renested++;
        }
    }

    // Flatten HSA mon: if depth1 is "02. ĐÁNH GIÁ NĂNG LỰC HÀ NỘI HSA" with children that are also packages
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path'
    );
    const hsaRoot = folders.find(
        (f) =>
            f.subject === 'dgnl_hsa' && (!f.parent_id || f.source_path === '' || f.source_path == null)
    );
    if (hsaRoot) {
        const hsaKids = folders.filter((f) => f.parent_id === hsaRoot.id);
        for (const mon of hsaKids) {
            if (!/^0?2\.\s*ĐÁNH GIÁ NĂNG LỰC HÀ NỘI HSA/i.test(mon.name)) continue;
            const monKids = folders.filter((f) => f.parent_id === mon.id);
            if (!monKids.length) continue;
            console.log('\nFlatten HSA mon', mon.name, 'kids', monKids.length);
            for (const child of monKids) {
                // if same name exists at root, merge
                const exist = hsaKids.find(
                    (k) => k.id !== mon.id && norm(k.name) === norm(child.name)
                );
                if (exist) {
                    console.log('  merge child', child.name);
                    const les = await rest(
                        url,
                        key,
                        'GET',
                        `online_lessons?folder_id=eq.${child.id}&select=id`
                    );
                    for (const l of Array.isArray(les) ? les : []) {
                        await rest(url, key, 'PATCH', `online_lessons?id=eq.${l.id}`, {
                            folder_id: exist.id
                        });
                    }
                    const ck = await rest(
                        url,
                        key,
                        'GET',
                        `online_folders?parent_id=eq.${child.id}&select=id`
                    );
                    for (const c of Array.isArray(ck) ? ck : []) {
                        await rest(url, key, 'PATCH', `online_folders?id=eq.${c.id}`, {
                            parent_id: exist.id
                        });
                    }
                    try {
                        await rest(url, key, 'DELETE', `online_folders?id=eq.${child.id}`);
                    } catch {
                        /* */
                    }
                } else {
                    console.log('  promote', child.name);
                    await rest(url, key, 'PATCH', `online_folders?id=eq.${child.id}`, {
                        parent_id: hsaRoot.id,
                        source_path: child.name,
                        subject: 'dgnl_hsa'
                    });
                }
            }
            const still = await rest(
                url,
                key,
                'GET',
                `online_folders?parent_id=eq.${mon.id}&select=id&limit=1`
            );
            const stillL = await rest(
                url,
                key,
                'GET',
                `online_lessons?folder_id=eq.${mon.id}&select=id&limit=1`
            );
            if (
                (!Array.isArray(still) || !still.length) &&
                (!Array.isArray(stillL) || !stillL.length)
            ) {
                try {
                    await rest(url, key, 'DELETE', `online_folders?id=eq.${mon.id}`);
                    console.log('  del mon shell');
                } catch {
                    /* */
                }
            }
        }
    }

    // Delete toan subject junk if only PROBE
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path'
    );
    const toanFolders = folders.filter((f) => f.subject === 'toan');
    for (const f of toanFolders) {
        const kids = folders.filter((k) => k.parent_id === f.id);
        const les = await rest(
            url,
            key,
            'GET',
            `online_lessons?folder_id=eq.${f.id}&select=id&limit=1`
        );
        if (!kids.length && (!Array.isArray(les) || !les.length)) {
            console.log('del toan junk', f.name);
            try {
                await rest(url, key, 'DELETE', `online_folders?id=eq.${f.id}`);
                stats.deletedEmpty++;
            } catch {
                /* */
            }
        }
    }

    // Final report
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path'
    );
    console.log('\n=== FINAL DEPTH1 ===');
    for (const subj of [
        'math',
        'physics',
        'chemistry',
        'biology',
        'english',
        'literature',
        'history',
        'geography',
        'dgnl_vact',
        'dgnl_hsa',
        'dgnl_tsa',
        'toan'
    ]) {
        const root = folders.find(
            (f) => f.subject === subj && (!f.parent_id || f.source_path === '' || f.source_path == null)
        );
        if (!root) {
            console.log(`\n${subj}: (none)`);
            continue;
        }
        const kids = folders
            .filter((f) => f.parent_id === root.id)
            .map((k) => k.name)
            .sort((a, b) => a.localeCompare(b, 'vi'));
        console.log(`\n${subj} (${kids.length}):`);
        kids.forEach((n) => console.log('  -', n));
    }

    // Safety: SỬ under vact
    const badSu = folders.filter(
        (f) =>
            f.subject === 'dgnl_vact' &&
            (/s[ửư]/i.test(f.name) && /c[oô]/i.test(f.name))
    );
    console.log('\nSỬ under VACT:', badSu.length);
    badSu.forEach((f) => console.log(' ', f.name));

    fs.writeFileSync(
        path.join('X:/ECODEx/exam-system/scripts/renest-orphan-report.json'),
        JSON.stringify({ at: new Date().toISOString(), stats, badSu: badSu.length }, null, 2)
    );
    console.log('STATS', stats);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
