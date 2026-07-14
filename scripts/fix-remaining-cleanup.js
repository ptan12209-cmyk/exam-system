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

function norm(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFC')
        .replace(/\s+/g, ' ')
        .trim();
}

async function fetchAll(url, key) {
    const page = 1000;
    let from = 0;
    const all = [];
    for (;;) {
        const res = await fetch(
            `${url}/rest/v1/online_folders?select=id,name,subject,parent_id,source_path&order=id.asc`,
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
    if (!res.ok) throw new Error(`${method} ${q} → ${res.status}: ${String(text).slice(0, 300)}`);
    return data;
}

async function main() {
    const env = loadEnv(path.join('X:/ECODEx/exam-system/.env.local'));
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;

    let all = await fetchAll(url, key);
    const roots = {};
    for (const f of all) {
        if (!f.parent_id || f.source_path === '' || f.source_path == null) roots[f.subject] = f;
    }

    // 1) SINH under math → biology
    const mathRoot = roots.math;
    const bioRoot = roots.biology;
    if (mathRoot && bioRoot) {
        const kids = all.filter((f) => f.parent_id === mathRoot.id && /^SINH /i.test(f.name));
        for (const k of kids) {
            const exist = all.find(
                (f) => f.parent_id === bioRoot.id && norm(f.name) === norm(k.name) && f.id !== k.id
            );
            console.log(exist ? 'merge' : 'move', k.name, 'math→bio');
            if (exist) {
                const les = await rest(
                    url,
                    key,
                    'GET',
                    `online_lessons?folder_id=eq.${k.id}&select=id`
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
                    `online_folders?parent_id=eq.${k.id}&select=id`
                );
                for (const c of Array.isArray(ck) ? ck : []) {
                    await rest(url, key, 'PATCH', `online_folders?id=eq.${c.id}`, {
                        parent_id: exist.id,
                        subject: 'biology'
                    });
                }
                try {
                    await rest(url, key, 'DELETE', `online_folders?id=eq.${k.id}`);
                } catch {
                    /* */
                }
            } else {
                await rest(url, key, 'PATCH', `online_folders?id=eq.${k.id}`, {
                    parent_id: bioRoot.id,
                    subject: 'biology',
                    source_path: k.name
                });
            }
        }
    }

    // 2) Empty HSA mon shell
    all = await fetchAll(url, key);
    const hsaRoot = all.find(
        (f) =>
            f.subject === 'dgnl_hsa' && (!f.parent_id || f.source_path === '' || f.source_path == null)
    );
    if (hsaRoot) {
        const mons = all.filter(
            (f) =>
                f.parent_id === hsaRoot.id &&
                /^02\.\s*ĐÁNH GIÁ NĂNG LỰC HÀ NỘI HSA/i.test(f.name)
        );
        for (const mon of mons) {
            const kids = await rest(
                url,
                key,
                'GET',
                `online_folders?parent_id=eq.${mon.id}&select=id,name`
            );
            const les = await rest(
                url,
                key,
                'GET',
                `online_lessons?folder_id=eq.${mon.id}&select=id`
            );
            console.log(
                'HSA mon',
                mon.name,
                'kids',
                Array.isArray(kids) ? kids.length : 0,
                'les',
                Array.isArray(les) ? les.length : 0
            );
            if (
                (!Array.isArray(kids) || !kids.length) &&
                (!Array.isArray(les) || !les.length)
            ) {
                await rest(url, key, 'DELETE', `online_folders?id=eq.${mon.id}`);
                console.log('  deleted empty mon');
            }
        }
    }

    // 3) toan junk
    all = await fetchAll(url, key);
    for (const f of all.filter((x) => x.subject === 'toan')) {
        const kids = all.filter((k) => k.parent_id === f.id);
        const les = await rest(
            url,
            key,
            'GET',
            `online_lessons?folder_id=eq.${f.id}&select=id&limit=1`
        );
        if (!kids.length && (!Array.isArray(les) || !les.length)) {
            console.log('del toan', f.name);
            try {
                await rest(url, key, 'DELETE', `online_folders?id=eq.${f.id}`);
            } catch {
                /* */
            }
        }
    }

    // 4) Final verify all subjects depth1 + SỬ check
    all = await fetchAll(url, key);
    console.log('\n=== FINAL ===');
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
        'dgnl_tsa'
    ]) {
        const root = all.find(
            (f) => f.subject === subj && (!f.parent_id || f.source_path === '' || f.source_path == null)
        );
        if (!root) {
            console.log(`\n${subj}: none`);
            continue;
        }
        const kids = all
            .filter((f) => f.parent_id === root.id)
            .map((k) => k.name)
            .sort((a, b) => a.localeCompare(b, 'vi'));
        console.log(`\n${subj} (${kids.length}):`);
        kids.forEach((n) => console.log('  -', n));
    }

    const suWrong = all.filter((f) => {
        if (f.subject === 'history') return false;
        const n = String(f.name || '').normalize('NFC');
        return /s[ửư]/i.test(n) && /c[oô]/i.test(n) && /^s/i.test(n);
    });
    console.log('\nSỬ not history:', suWrong.length);
    suWrong.forEach((f) => console.log(' ', f.subject, f.name));

    const vactRoot = all.find(
        (f) =>
            f.subject === 'dgnl_vact' && (!f.parent_id || f.source_path === '' || f.source_path == null)
    );
    const vactKids = vactRoot
        ? all.filter((f) => f.parent_id === vactRoot.id).map((f) => f.name)
        : [];
    console.log('\nVACT depth1:', vactKids);
    console.log(
        'VACT has SỬ?',
        vactKids.some((n) => /s[ửư]/i.test(n) && /c[oô]/i.test(n))
    );
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
