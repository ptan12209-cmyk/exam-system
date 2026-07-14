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
    if (!res.ok) throw new Error(`${method} ${q} → ${res.status}: ${text.slice(0, 300)}`);
    return data;
}

async function main() {
    const env = loadEnv(path.join('X:/ECODEx/exam-system/.env.local'));
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;

    const mons = await rest(
        url,
        key,
        'GET',
        `online_folders?subject=eq.dgnl_hsa&name=ilike.*HÀ NỘI HSA*&select=id,name,parent_id,source_path`
    );
    console.log('mons', mons);
    for (const mon of Array.isArray(mons) ? mons : []) {
        if (!/^02\.\s*ĐÁNH GIÁ NĂNG LỰC HÀ NỘI HSA/i.test(mon.name)) continue;
        const kids = await rest(
            url,
            key,
            'GET',
            `online_folders?parent_id=eq.${mon.id}&select=id`
        );
        const les = await rest(
            url,
            key,
            'GET',
            `online_lessons?folder_id=eq.${mon.id}&select=id,title`
        );
        console.log(mon.name, 'kids', kids, 'les', les);
        // Move lessons to HSA EDU package if possible
        const targets = await rest(
            url,
            key,
            'GET',
            `online_folders?subject=eq.dgnl_hsa&name=ilike.*HSA EDU*&select=id,name&limit=5`
        );
        const target = Array.isArray(targets) && targets[0] ? targets[0] : null;
        if (target && Array.isArray(les)) {
            for (const l of les) {
                await rest(url, key, 'PATCH', `online_lessons?id=eq.${l.id}`, {
                    folder_id: target.id
                });
                console.log('moved lesson', l.title, '→', target.name);
            }
        }
        const kids2 = await rest(
            url,
            key,
            'GET',
            `online_folders?parent_id=eq.${mon.id}&select=id`
        );
        const les2 = await rest(
            url,
            key,
            'GET',
            `online_lessons?folder_id=eq.${mon.id}&select=id`
        );
        if (
            (!Array.isArray(kids2) || !kids2.length) &&
            (!Array.isArray(les2) || !les2.length)
        ) {
            await rest(url, key, 'DELETE', `online_folders?id=eq.${mon.id}`);
            console.log('deleted mon shell');
        }
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
