'use strict';

/**
 * Move "04. ĐÁNH GIÁ NĂNG LỰC SƯ PHẠM 2009" subtree from dgnl_hsa → dgnl_sp.
 * Creates dgnl_sp root (COMBO XPS 2027) if missing; rewrites subject + folder_key.
 *
 *   node scripts/fix-move-sp-out-of-hsa.js --dry-run
 *   node scripts/fix-move-sp-out-of-hsa.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dryRun = process.argv.includes('--dry-run');
const COURSE = 'combo-xps-2027';
const FROM = 'dgnl_hsa';
const TO = 'dgnl_sp';
const ROOT_NAME = 'COMBO XPS 2027';

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

function nfc(s) {
    return String(s || '')
        .normalize('NFC')
        .replace(/\\/g, '/')
        .replace(/\/+/g, '/')
        .replace(/^\/+|\/+$/g, '');
}

function buildRootFolderKey(courseKey, subject) {
    return `f:${nfc(courseKey)}:${nfc(subject)}:root`;
}

function buildFolderKey(courseKey, subject, relativePath) {
    const rel = nfc(relativePath);
    if (!rel) return buildRootFolderKey(courseKey, subject);
    const h = crypto.createHash('sha1').update(rel, 'utf8').digest('hex');
    return `f:${nfc(courseKey)}:${nfc(subject)}:${h}`;
}

async function fetchAll(url, key, table, select, extra = '') {
    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    const all = [];
    let from = 0;
    for (;;) {
        const res = await fetch(
            `${url}/rest/v1/${table}?select=${encodeURIComponent(select)}${extra}&order=id.asc`,
            { headers: { ...headers, Range: `${from}-${from + 999}` } }
        );
        const rows = await res.json();
        if (!Array.isArray(rows) || !rows.length) break;
        all.push(...rows);
        if (rows.length < 1000) break;
        from += 1000;
    }
    return all;
}

async function patch(url, key, table, id, body) {
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
        throw new Error(`PATCH ${table} ${id}: ${res.status} ${t.slice(0, 200)}`);
    }
}

async function insert(url, key, table, body) {
    const res = await fetch(`${url}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
        },
        body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`INSERT ${table}: ${res.status} ${text.slice(0, 300)}`);
    const rows = JSON.parse(text);
    return Array.isArray(rows) ? rows[0] : rows;
}

async function main() {
    const env = loadEnv(path.join('X:/ECODEx/exam-system/.env.local'));
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase env');

    console.log('MODE', dryRun ? 'dry-run' : 'apply', `${FROM} → ${TO}`);

    const folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path,folder_key,examhub_course_key,order_index'
    );

    const hsaRoot = folders.find(
        (f) => f.subject === FROM && !f.parent_id && f.examhub_course_key === COURSE
    );
    if (!hsaRoot) {
        // try any null parent hsa
        const alt = folders.find((f) => f.subject === FROM && !f.parent_id);
        if (!alt) throw new Error('No dgnl_hsa root found');
        console.log('using hsa root', alt.id, alt.name);
    }
    const hsaRootId = (hsaRoot || folders.find((f) => f.subject === FROM && !f.parent_id)).id;

    const spPack = folders.find(
        (f) =>
            f.subject === FROM &&
            f.parent_id === hsaRootId &&
            /s[ưư]\s*ph[ạa]m/i.test(f.name)
    );
    if (!spPack) {
        console.log('No SP package under HSA — already fixed?');
        const already = folders.filter((f) => f.subject === TO);
        console.log('dgnl_sp folders now', already.length);
        process.exit(0);
    }
    console.log('SP pack', spPack.id, spPack.name, 'path', spPack.source_path);

    // collect subtree
    const byParent = new Map();
    for (const f of folders) {
        const p = f.parent_id || '__ROOT__';
        if (!byParent.has(p)) byParent.set(p, []);
        byParent.get(p).push(f);
    }
    const subtree = [];
    const walk = (id) => {
        subtree.push(folders.find((f) => f.id === id));
        for (const k of byParent.get(id) || []) walk(k.id);
    };
    walk(spPack.id);
    console.log('subtree folders', subtree.length);

    // ensure SP root
    let spRoot = folders.find(
        (f) => f.subject === TO && !f.parent_id && (f.examhub_course_key === COURSE || !f.examhub_course_key)
    );
    if (!spRoot) {
        spRoot = folders.find((f) => f.subject === TO && !f.parent_id);
    }
    const spRootKey = buildRootFolderKey(COURSE, TO);
    if (!spRoot) {
        console.log('create dgnl_sp root');
        if (!dryRun) {
            spRoot = await insert(url, key, 'online_folders', {
                name: ROOT_NAME,
                parent_id: null,
                subject: TO,
                order_index: 1,
                examhub_course_key: COURSE,
                source_path: '',
                folder_key: spRootKey,
            });
        } else {
            spRoot = { id: 'DRY_SP_ROOT', name: ROOT_NAME };
        }
    } else {
        console.log('reuse dgnl_sp root', spRoot.id);
        if (!dryRun && spRoot.folder_key !== spRootKey) {
            await patch(url, key, 'online_folders', spRoot.id, {
                folder_key: spRootKey,
                examhub_course_key: COURSE,
            });
        }
    }

    // Move pack under SP root + update all subjects/keys
    let patched = 0;
    for (const f of subtree) {
        if (!f) continue;
        const rel = nfc(f.source_path || '');
        const newKey = rel
            ? buildFolderKey(COURSE, TO, rel)
            : buildRootFolderKey(COURSE, TO);
        const body = {
            subject: TO,
            folder_key: newKey,
            examhub_course_key: COURSE,
        };
        if (f.id === spPack.id) {
            body.parent_id = spRoot.id;
        }
        console.log(
            ' ',
            f.id === spPack.id ? 'MOVE' : 'subj',
            (f.name || '').slice(0, 50),
            '→',
            TO
        );
        if (!dryRun) {
            await patch(url, key, 'online_folders', f.id, body);
        }
        patched++;
    }

    // verify
    console.log('\nDONE folders patched', patched, dryRun ? '(dry)' : '');
    if (!dryRun) {
        const after = await fetchAll(
            url,
            key,
            'online_folders',
            'id,name,subject,parent_id',
            '&or=(subject.eq.dgnl_hsa,subject.eq.dgnl_sp)'
        );
        const hsaRoot2 = after.find((f) => f.subject === FROM && !f.parent_id);
        const spRoot2 = after.find((f) => f.subject === TO && !f.parent_id);
        if (hsaRoot2) {
            const kids = after
                .filter((f) => f.parent_id === hsaRoot2.id)
                .map((f) => f.name);
            console.log('HSA depth1 now:', kids);
        }
        if (spRoot2) {
            const kids = after
                .filter((f) => f.parent_id === spRoot2.id)
                .map((f) => f.name);
            console.log('SP depth1 now:', kids);
        }
        // any SP name still under hsa?
        const leak = after.filter(
            (f) => f.subject === FROM && /s[ưư]\s*ph[ạa]m/i.test(f.name)
        );
        console.log('SP-named still subject=hsa:', leak.length);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
