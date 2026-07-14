'use strict';
const fs = require('fs');
const path = require('path');

function loadEnv(p) {
    const e = {};
    for (const l of fs.readFileSync(p, 'utf8').split(/\n/)) {
        const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!m) continue;
        let v = m[2].trim();
        if (
            (v.startsWith('"') && v.endsWith('"')) ||
            (v.startsWith("'") && v.endsWith("'"))
        )
            v = v.slice(1, -1);
        e[m[1]] = v;
    }
    return e;
}

async function main() {
    const env = loadEnv(path.join('X:/ECODEx/exam-system/.env.local'));
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    const H = {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
    };

    async function get(q) {
        const r = await fetch(`${url}/rest/v1/${q}`, { headers: H });
        return r.json();
    }
    async function del(q) {
        const r = await fetch(`${url}/rest/v1/${q}`, {
            method: 'DELETE',
            headers: { ...H, Prefer: 'return=minimal' }
        });
        return r.status;
    }

    let from = 0;
    const folders = [];
    for (;;) {
        const r = await fetch(
            `${url}/rest/v1/online_folders?select=id,name,subject,source_path,parent_id&order=id.asc`,
            {
                headers: {
                    ...H,
                    Range: `${from}-${from + 999}`
                }
            }
        );
        const rows = await r.json();
        if (!Array.isArray(rows) || !rows.length) break;
        folders.push(...rows);
        if (rows.length < 1000) break;
        from += 1000;
    }

    const mons = folders.filter((f) => {
        const sp = String(f.source_path || '');
        if (!sp || sp.includes('/')) return false;
        return (
            /^0?[1-8]\.\s*m[oô]n\b/i.test(f.name) ||
            /^0?7\.\s*khoa\s*h[oọ]c\s*x[aã]\s*h[oộ]i/i.test(f.name) ||
            /^0?8\.\s*combo/i.test(f.name) ||
            /^📚/.test(f.name)
        );
    });

    console.log('mon-like depth1', mons.length);
    for (const mon of mons) {
        const kids = await get(`online_folders?parent_id=eq.${mon.id}&select=id,name`);
        const lessons = await get(
            `online_lessons?folder_id=eq.${mon.id}&select=id,title,source_kind`
        );
        console.log(
            mon.subject,
            mon.name,
            'kids',
            kids.length,
            'lessons',
            lessons.length
        );
        if (lessons.length) {
            for (const l of lessons) {
                console.log('  lesson', l.title);
                if (/zalo|0333|h[oỗ]?\s*tr[oợ]|probe/i.test(l.title)) {
                    console.log('  del junk', await del(`online_lessons?id=eq.${l.id}`));
                }
            }
        }
        const kids2 = await get(`online_folders?parent_id=eq.${mon.id}&select=id`);
        const lessons2 = await get(`online_lessons?folder_id=eq.${mon.id}&select=id`);
        if (kids2.length === 0 && lessons2.length === 0) {
            console.log('  del mon', mon.name, await del(`online_folders?id=eq.${mon.id}`));
        }
    }

    const vact = await get(
        `online_folders?subject=eq.dgnl_vact&select=id,name,source_path`
    );
    const d1 = (Array.isArray(vact) ? vact : []).filter(
        (f) => f.source_path && !f.source_path.includes('/')
    );
    console.log('\nVACT depth1:', d1.map((f) => f.name));
    const su = (Array.isArray(vact) ? vact : []).filter(
        (f) =>
            /^SỬ CÔ/i.test(f.name || '') ||
            /^SỬ CÔ/i.test(String(f.source_path || '').split('/')[0] || '')
    );
    console.log('VACT SỬ CÔ trees:', su.length);

    // math depth1
    const mathRoot = folders.find(
        (f) => f.subject === 'math' && (!f.parent_id || f.source_path === '')
    );
    if (mathRoot) {
        const kids = await get(
            `online_folders?parent_id=eq.${mathRoot.id}&select=name&order=name.asc`
        );
        console.log('\nmath depth1:');
        (kids || []).forEach((k) => console.log(' ', k.name));
    }

    // history depth1
    const histRoot = folders.find(
        (f) => f.subject === 'history' && (!f.parent_id || f.source_path === '')
    );
    if (histRoot) {
        const kids = await get(
            `online_folders?parent_id=eq.${histRoot.id}&select=name&order=name.asc`
        );
        console.log('\nhistory depth1:');
        (kids || []).forEach((k) => console.log(' ', k.name));
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
