'use strict';

/**
 * Final cleanup:
 * 1) Move any SỬ CÔ* tree off dgnl_vact / wrong subjects → history
 * 2) Fix dgnl subject tags by path segment (not mon wrapper)
 * 3) Dedupe depth1 same-name under each subject
 * 4) Report depth1 trees
 *
 * node scripts/fix-su-vact-and-dgnl.js
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
    return nfc(s)
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

/** Unicode-safe: SỬ / Su / su with or without diacritics variants */
function isSuTeacher(name) {
    const n = norm(name);
    // sử cô / su co / lich su co
    return (
        /^s[uưửùúũụ]\s*c[oôòóõọ]/i.test(n) ||
        /^sử\s*cô/.test(n) ||
        n.startsWith('su co') ||
        n.startsWith('sử cô') ||
        n.startsWith('sử cô') // combining
    );
}

function isDiaTeacher(name) {
    const n = norm(name);
    return /^đ[iị]\s*a\s*(l[yý]|c[oô]|th[aầ]y)/.test(n) || /^dia\s*(ly|co|thay)/.test(n);
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

async function ensureRoot(url, key, subject) {
    const rows = await rest(
        url,
        key,
        'GET',
        `online_folders?examhub_course_key=eq.combo-xps-2027&subject=eq.${encodeURIComponent(subject)}&source_path=eq.&select=id&limit=1`
    );
    if (Array.isArray(rows) && rows[0]) return rows[0].id;
    // fallback any root for subject
    const rows2 = await rest(
        url,
        key,
        'GET',
        `online_folders?subject=eq.${encodeURIComponent(subject)}&source_path=eq.&select=id&limit=1`
    );
    if (Array.isArray(rows2) && rows2[0]) return rows2[0].id;
    const created = await rest(url, key, 'POST', 'online_folders', {
        name: 'COMBO XPS 2027',
        parent_id: null,
        subject,
        order_index: 1,
        examhub_course_key: 'combo-xps-2027',
        source_path: ''
    });
    return Array.isArray(created) ? created[0].id : created.id;
}

function buildIndex(folders) {
    const byId = new Map(folders.map((f) => [f.id, f]));
    const byParent = new Map();
    for (const f of folders) {
        const p = f.parent_id || 'ROOT';
        if (!byParent.has(p)) byParent.set(p, []);
        byParent.get(p).push(f);
    }
    return { byId, byParent };
}

function collectSubtree(id, byParent) {
    const out = [id];
    for (const k of byParent.get(id) || []) out.push(...collectSubtree(k.id, byParent));
    return out;
}

async function mergeSimple(url, key, sourceId, targetId, byParent, stats) {
    const lessons = await rest(url, key, 'GET', `online_lessons?folder_id=eq.${sourceId}&select=id`);
    for (const l of Array.isArray(lessons) ? lessons : []) {
        await rest(url, key, 'PATCH', `online_lessons?id=eq.${l.id}`, { folder_id: targetId });
        stats.lessonsMoved++;
    }
    const kids = byParent.get(sourceId) || [];
    for (const kid of kids) {
        const tKids = await rest(
            url,
            key,
            'GET',
            `online_folders?parent_id=eq.${targetId}&select=id,name`
        );
        const mk = (Array.isArray(tKids) ? tKids : []).find((x) => norm(x.name) === norm(kid.name));
        if (mk) {
            await mergeSimple(url, key, kid.id, mk.id, byParent, stats);
        } else {
            await rest(url, key, 'PATCH', `online_folders?id=eq.${kid.id}`, {
                parent_id: targetId
            });
        }
    }
    try {
        await rest(url, key, 'DELETE', `online_folders?id=eq.${sourceId}`);
        stats.deleted++;
    } catch {
        /* keep */
    }
}

function inferDgnlSubject(sourcePath, name) {
    const segs = nfc(sourcePath || '')
        .split('/')
        .filter(Boolean);
    const nm = nfc(name || '');

    if (isSuTeacher(nm) || isSuTeacher(segs[0] || '')) return 'history';
    if (isDiaTeacher(nm) || isDiaTeacher(segs[0] || '')) return 'geography';

    for (const seg of segs) {
        if (/^0?8\.\s*combo/i.test(seg)) continue;
        if (/^📚/.test(seg)) continue;
        if (/^0?[1-7]\.\s*m[oô]n/i.test(seg)) continue;
        if (/^0?7\.\s*khoa/i.test(seg)) continue;

        if (/v-?act|vatc/i.test(seg) || (/h[oồ]\s*ch[ií]\s*minh/i.test(seg) && /đ[aá]nh|n[aă]ng/i.test(seg)))
            return 'dgnl_vact';
        if (/\bhsa\b/i.test(seg) || /h[aà]\s*n[oộ]i.*hsa|hsa.*h[aà]\s*n[oộ]i/i.test(seg))
            return 'dgnl_hsa';
        if (/\btsa\b/i.test(seg) || /b[aá]ch\s*khoa/i.test(seg)) return 'dgnl_tsa';
        if (/s[uư]\s*ph[aạ]m|peda\s*edu|đgnl\s*sp|sp\s*k9/i.test(seg)) return 'dgnl_hsa';
    }

    // name-based for package tops
    if (/v-?act|vatc/i.test(nm) || (/h[oồ]\s*ch[ií]\s*minh/i.test(nm) && /đ[aá]nh|n[aă]ng/i.test(nm)))
        return 'dgnl_vact';
    if (/\bhsa\b/i.test(nm) || /h[aà]\s*n[oộ]i.*hsa/i.test(nm)) return 'dgnl_hsa';
    if (/\btsa\b|b[aá]ch\s*khoa/i.test(nm)) return 'dgnl_tsa';
    if (/s[uư]\s*ph[aạ]m/i.test(nm) && /đ[aá]nh|n[aă]ng|đgnl/i.test(nm)) return 'dgnl_hsa';

    return null;
}

async function main() {
    const env = loadEnv(path.join('X:/ECODEx/exam-system/.env.local'));
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    const stats = { moved: 0, retagged: 0, lessonsMoved: 0, deleted: 0, deduped: 0, errors: [] };

    let folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path,examhub_course_key'
    );
    let { byId, byParent } = buildIndex(folders);
    console.log('total folders', folders.length);

    // --- A) Find ALL SỬ teacher packages (any subject ≠ history) ---
    const suTops = [];
    for (const f of folders) {
        if (!isSuTeacher(f.name)) continue;
        if (f.subject === 'history') {
            // still list if under non-history parent? check parent subject
            const parent = f.parent_id ? byId.get(f.parent_id) : null;
            if (parent && parent.subject !== 'history') {
                suTops.push(f);
            }
            continue;
        }
        suTops.push(f);
    }
    // Also: any folder under dgnl_vact whose name looks like SỬ (dump bytes)
    for (const f of folders) {
        if (f.subject !== 'dgnl_vact') continue;
        const n = nfc(f.name);
        if (/s[ửư]/i.test(n) && /c[oô]/i.test(n) && !suTops.some((x) => x.id === f.id)) {
            // only depth-1-ish tops
            const parent = f.parent_id ? byId.get(f.parent_id) : null;
            if (!parent || !parent.source_path || parent.source_path === '') {
                suTops.push(f);
            }
        }
    }

    console.log('SỬ tops to fix:', suTops.length);
    for (const f of suTops) {
        console.log(' ', f.subject, '|', f.name, '|', f.source_path, '| id=', f.id.slice(0, 8));
    }

    const histRoot = await ensureRoot(url, key, 'history');

    for (const f of suTops) {
        try {
            const siblings = await rest(
                url,
                key,
                'GET',
                `online_folders?parent_id=eq.${histRoot}&select=id,name,source_path`
            );
            const match = (Array.isArray(siblings) ? siblings : []).find(
                (s) => norm(s.name) === norm(f.name) && s.id !== f.id
            );
            console.log(
                match ? '[merge→history]' : '[move→history]',
                f.subject,
                f.name,
                'tree',
                collectSubtree(f.id, byParent).length
            );
            if (match) {
                await mergeSimple(url, key, f.id, match.id, byParent, stats);
            } else {
                const subtree = collectSubtree(f.id, byParent);
                await rest(url, key, 'PATCH', `online_folders?id=eq.${f.id}`, {
                    parent_id: histRoot,
                    subject: 'history',
                    source_path: f.name
                });
                for (const did of subtree.filter((id) => id !== f.id)) {
                    await rest(url, key, 'PATCH', `online_folders?id=eq.${did}`, {
                        subject: 'history'
                    });
                }
            }
            stats.moved++;
        } catch (e) {
            console.error('SU move err', f.name, e.message);
            stats.errors.push({ name: f.name, error: e.message });
        }
    }

    // Force any remaining folder whose top path is SỬ CÔ to history
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path'
    );
    ({ byId, byParent } = buildIndex(folders));
    for (const f of folders) {
        const top = nfc(f.source_path || '').split('/')[0] || nfc(f.name);
        if (!isSuTeacher(top) && !isSuTeacher(f.name)) continue;
        if (f.subject === 'history') continue;
        console.log('[force hist]', f.subject, f.source_path || f.name);
        await rest(url, key, 'PATCH', `online_folders?id=eq.${f.id}`, { subject: 'history' });
        stats.retagged++;
    }

    // --- B) Fix dgnl subjects by path ---
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path'
    );
    let dgnlFix = 0;
    for (const f of folders) {
        const exp = inferDgnlSubject(f.source_path, f.name);
        if (!exp) continue;
        if (exp === f.subject) continue;
        // Only auto-fix among dgnl_* ↔ dgnl_* or off dgnl for history/geo
        const isDgnl = /^dgnl_/.test(f.subject);
        const expDgnl = /^dgnl_/.test(exp);
        if (!isDgnl && !expDgnl && exp !== 'history' && exp !== 'geography') continue;
        // Don't yank random math content
        if (!isDgnl && expDgnl) continue;

        console.log('[dgnl]', f.subject, '→', exp, (f.source_path || f.name).slice(0, 100));
        await rest(url, key, 'PATCH', `online_folders?id=eq.${f.id}`, { subject: exp });
        dgnlFix++;
    }
    stats.dgnlFix = dgnlFix;
    console.log('dgnl retags:', dgnlFix);

    // --- C) Move depth-1 dgnl package folders that are under wrong subject root ---
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path'
    );
    ({ byId, byParent } = buildIndex(folders));
    for (const f of folders) {
        const sp = String(f.source_path || '');
        if (!sp || sp.includes('/')) continue;
        const exp = inferDgnlSubject(sp, f.name);
        if (!exp || exp === f.subject) continue;
        if (!/^dgnl_/.test(exp) && exp !== 'history' && exp !== 'geography') continue;

        const rootId = await ensureRoot(url, key, exp);
        const siblings = await rest(
            url,
            key,
            'GET',
            `online_folders?parent_id=eq.${rootId}&select=id,name`
        );
        const match = (Array.isArray(siblings) ? siblings : []).find(
            (s) => norm(s.name) === norm(f.name) && s.id !== f.id
        );
        console.log(
            match ? '[pkg merge]' : '[pkg move]',
            f.subject,
            '→',
            exp,
            f.name
        );
        try {
            if (match) {
                await mergeSimple(url, key, f.id, match.id, byParent, stats);
            } else {
                const subtree = collectSubtree(f.id, byParent);
                await rest(url, key, 'PATCH', `online_folders?id=eq.${f.id}`, {
                    parent_id: rootId,
                    subject: exp,
                    source_path: f.name
                });
                for (const did of subtree.filter((id) => id !== f.id)) {
                    await rest(url, key, 'PATCH', `online_folders?id=eq.${did}`, {
                        subject: exp
                    });
                }
            }
            stats.moved++;
        } catch (e) {
            stats.errors.push({ pkg: f.name, error: e.message });
        }
    }

    // --- D) Dedupe all subject roots depth1 ---
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path'
    );
    ({ byId, byParent } = buildIndex(folders));
    const roots = folders.filter((f) => !f.parent_id || f.source_path === '' || f.source_path == null);
    for (const root of roots) {
        const kids = folders.filter((f) => f.parent_id === root.id);
        const byName = new Map();
        for (const k of kids) {
            const n = norm(k.name);
            if (!byName.has(n)) byName.set(n, []);
            byName.get(n).push(k);
        }
        for (const [, list] of byName) {
            if (list.length < 2) continue;
            list.sort(
                (a, b) =>
                    collectSubtree(b.id, byParent).length - collectSubtree(a.id, byParent).length
            );
            const keep = list[0];
            console.log('[dedupe]', root.subject, keep.name, 'x', list.length);
            for (const extra of list.slice(1)) {
                try {
                    await mergeSimple(url, key, extra.id, keep.id, byParent, stats);
                    stats.deduped++;
                } catch (e) {
                    stats.errors.push({ dedupe: extra.name, error: e.message });
                }
            }
        }
    }

    // --- E) Verify ---
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path'
    );

    const vactDepth1 = [];
    const histDepth1 = [];
    const mathDepth1 = [];
    const suElsewhere = [];

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
            console.log(`\n${subj}: NO ROOT`);
            continue;
        }
        const kids = folders
            .filter((f) => f.parent_id === root.id)
            .map((k) => k.name)
            .sort((a, b) => a.localeCompare(b, 'vi'));
        console.log(`\n${subj} depth1 (${kids.length}):`);
        kids.forEach((n) => console.log('  -', n));
        if (subj === 'dgnl_vact') vactDepth1.push(...kids);
        if (subj === 'history') histDepth1.push(...kids);
        if (subj === 'math') mathDepth1.push(...kids);
    }

    for (const f of folders) {
        if (f.subject === 'history') continue;
        if (isSuTeacher(f.name) || isSuTeacher(String(f.source_path || '').split('/')[0])) {
            suElsewhere.push({ subject: f.subject, name: f.name, path: f.source_path });
        }
    }

    // Also dump any dgnl_vact name containing "SỬ" or "Sư" or "su "
    console.log('\n=== VACT folders with S/Sử in name ===');
    for (const f of folders.filter((x) => x.subject === 'dgnl_vact')) {
        const n = nfc(f.name);
        if (/s[ửưu]/i.test(n) && /c[oô]/i.test(n)) {
            console.log(' ', JSON.stringify(f.name), 'path=', f.source_path);
        }
    }

    console.log('\nSỬ not in history:', suElsewhere.length);
    suElsewhere.slice(0, 30).forEach((x) => console.log(' ', x.subject, x.name));

    const out = {
        at: new Date().toISOString(),
        stats,
        vactDepth1,
        histDepth1,
        mathDepth1,
        suElsewhereCount: suElsewhere.length,
        suElsewhere: suElsewhere.slice(0, 50)
    };
    fs.writeFileSync(
        path.join('X:/ECODEx/exam-system/scripts/fix-su-vact-report.json'),
        JSON.stringify(out, null, 2)
    );
    console.log('\nSTATS', stats);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
