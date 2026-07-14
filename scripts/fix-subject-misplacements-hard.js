'use strict';

/**
 * Hard fix: move mis-placed folder TREES to correct subject roots.
 * - SỬ CÔ* anywhere not history → history
 * - ĐỊA* teacher packages not geography → geography  
 * - SINH THẦY under wrong subject → biology
 * - LÝ THẦY under wrong subject → physics
 * - TOÁN THẦY under wrong subject → math
 * - Mon package layers 01-06 still at depth1 → promote children, delete mon shell
 *
 * node scripts/fix-subject-misplacements-hard.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry-run');

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
    if (!res.ok) throw new Error(`${method} ${q} → ${res.status}: ${String(text).slice(0, 500)}`);
    return data;
}

async function ensureRoot(url, key, courseKey, subject) {
    const rows = await rest(
        url,
        key,
        'GET',
        `online_folders?examhub_course_key=eq.${encodeURIComponent(courseKey)}&subject=eq.${encodeURIComponent(subject)}&source_path=eq.&select=id&limit=1`
    );
    if (Array.isArray(rows) && rows[0]) return rows[0].id;
    const created = await rest(url, key, 'POST', 'online_folders', {
        name: 'COMBO XPS 2027',
        parent_id: null,
        subject,
        order_index: 1,
        teacher_id: null,
        examhub_course_key: courseKey,
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

/**
 * Classify expected subject from folder name/path.
 * Returns null if no high-confidence rule.
 */
function expectedSubject(f) {
    const name = (f.name || '').normalize('NFC');
    const sp = (f.source_path || '').normalize('NFC');
    const top = (sp.split('/')[0] || name).normalize('NFC');
    const probe = `${sp} ${name}`;

    // Genuine V-ACT package content must stay dgnl_vact (path has V-ACT/VATC package)
    const underRealVact =
        /đ[aá]nh\s*gi[aá]\s*n[aă]ng\s*l[uự]c\s*h[oồ]\s*ch[ií]\s*minh\s*v-?act/i.test(probe) ||
        /\bdgnl\s*v-?act\b|\bdgnl\s*vatc\b|\bv-?act\s*2009\b|\bvatc\s*-/i.test(probe);

    // DGNL / TSA top packages (numbered 01-04 under COMBO DGNL)
    if (/v-?act|vatc/i.test(name) && /đ[aá]nh\s*gi[aá]|n[aă]ng\s*l[uự]c|h[oồ]\s*ch[ií]\s*minh/i.test(name)) {
        return 'dgnl_vact';
    }
    if (/\bhsa\b|h[aà]\s*n[oộ]i\s*hsa/i.test(name) && /đ[aá]nh\s*gi[aá]|n[aă]ng\s*l[uự]c/i.test(name)) {
        return 'dgnl_hsa';
    }
    if (/\btsa\b|b[aá]ch\s*khoa\s*tsa|t[uư]\s*duy/i.test(name) && /đ[aá]nh\s*gi[aá]|t[uư]\s*duy/i.test(name)) {
        return 'dgnl_tsa';
    }
    if (/s[uư]\s*ph[aạ]m/i.test(name) && /đ[aá]nh\s*gi[aá]|n[aă]ng\s*l[uự]c/i.test(name)) {
        return 'dgnl_hsa'; // SP often grouped with HSA root; keep under dgnl_hsa if no dgnl_sp
    }

    // SỬ teacher package — NEVER vact even if HCM in deep lesson titles
    if (/^s[uử]\s*c[oô]/i.test(name) || /^s[uử]\s*c[oô]/i.test(top)) {
        return 'history';
    }
    // Entire tree under SỬ CÔ...
    if (/s[uử]\s*c[oô]/i.test(sp) && !underRealVact) {
        return 'history';
    }

    // Địa teacher
    if (/^đ[iị]a\s*(l[yý]|c[oô]|th[aầ]y)/i.test(name) || /^đ[iị]a\s*(l[yý]|c[oô]|th[aầ]y)/i.test(top)) {
        return 'geography';
    }
    if (/đ[iị]a\s*(l[yý]|c[oô]|th[aầ]y)/i.test(sp) && !underRealVact) {
        return 'geography';
    }

    // Teacher mon packages by name (depth1 only typically)
    if (/^sinh\s*(th[aầ]y|c[oô])/i.test(name)) return 'biology';
    if (/^l[yý]\s*th[aầ]y/i.test(name)) return 'physics';
    if (
        /^to[aá]n(\s|-)/i.test(name) ||
        /^n[eề]n\s*t[aả]ng\s*to[aá]n/i.test(name) ||
        /^to[aá]n\s*(th[aầ]y|c[oô]|anh|dpad)/i.test(name)
    ) {
        return 'math';
    }
    if (/^h[oó]a\s*(th[aầ]y|c[oô])/i.test(name)) return 'chemistry';
    if (/^ti[eế]ng\s*anh\s*c[oô]/i.test(name) || /^anh\s*c[oô]/i.test(name)) return 'english';
    if (/^v[aă]n\s*(c[oô]|th[aầ]y)/i.test(name) || /^h[oọ]c\s*v[aă]n/i.test(name)) return 'literature';

    // Mon intermediate shells (should be flattened, but if still depth1 classify by mon name)
    if (/^0?1\.\s*m[oô]n\s*to[aá]n/i.test(name)) return 'math';
    if (/^0?2\.\s*m[oô]n\s*l[yý]/i.test(name)) return 'physics';
    if (/^0?3\.\s*m[oô]n\s*h[oó]a/i.test(name)) return 'chemistry';
    if (/^0?4\.\s*m[oô]n\s*sinh/i.test(name)) return 'biology';
    if (/^0?5\.\s*m[oô]n\s*ti[eế]ng\s*anh/i.test(name)) return 'english';
    if (/^0?6\.\s*m[oô]n\s*(ng[uữ]\s*)?v[aă]n/i.test(name)) return 'literature';
    if (/^0?7\.\s*khoa\s*h[oọ]c\s*x[aã]\s*h[oộ]i/i.test(name)) return 'history';

    return null;
}

async function moveTreeToSubject(url, key, top, toSubject, byParent, byId, report) {
    const course = top.examhub_course_key || 'combo-xps-2027';
    const subtree = collectSubtree(top.id, byParent);
    const rootId = await ensureRoot(url, key, course, toSubject);

    // Find existing sibling with same name under target root → merge lessons only then delete
    const targetSiblings = (byParent.get(rootId) || []).filter((x) => x.id !== top.id);
    // Need live query for target root children
    const liveSiblings = await rest(
        url,
        key,
        'GET',
        `online_folders?parent_id=eq.${rootId}&select=id,name,source_path,subject`
    );
    const match = (Array.isArray(liveSiblings) ? liveSiblings : []).find(
        (s) => norm(s.name) === norm(top.name) && s.id !== top.id
    );

    console.log(
        DRY ? '[dry]' : '[move]',
        top.subject,
        '→',
        toSubject,
        top.name || top.source_path,
        `tree=${subtree.length}`,
        match ? `MERGE→${match.id}` : 'REPARENT'
    );

    report.ops.push({
        from: top.subject,
        to: toSubject,
        name: top.name,
        path: top.source_path,
        tree: subtree.length,
        merge: Boolean(match)
    });

    if (DRY) return;

    if (match) {
        // Move all lessons from every node in source tree into corresponding path under match
        // Simple approach: move ALL lessons in subtree to match root folder first is wrong.
        // Better: reparent top's children under match, move lessons on top node to match, delete top
        const topLessons = await rest(
            url,
            key,
            'GET',
            `online_lessons?folder_id=eq.${top.id}&select=id`
        );
        for (const l of Array.isArray(topLessons) ? topLessons : []) {
            await rest(url, key, 'PATCH', `online_lessons?id=eq.${l.id}`, {
                folder_id: match.id
            });
            report.lessonsMoved++;
        }
        const kids = byParent.get(top.id) || [];
        for (const kid of kids) {
            // if match has child same name, recurse merge; else reparent under match
            const matchKids = await rest(
                url,
                key,
                'GET',
                `online_folders?parent_id=eq.${match.id}&select=id,name`
            );
            const mk = (Array.isArray(matchKids) ? matchKids : []).find(
                (x) => norm(x.name) === norm(kid.name)
            );
            if (mk) {
                await mergeSimple(url, key, kid.id, mk.id, byParent, report);
            } else {
                const newPath = match.source_path
                    ? `${match.source_path}/${kid.name}`
                    : kid.name;
                await rest(url, key, 'PATCH', `online_folders?id=eq.${kid.id}`, {
                    parent_id: match.id,
                    subject: toSubject,
                    source_path: newPath
                });
                // retag descendants
                for (const did of collectSubtree(kid.id, byParent).filter((id) => id !== kid.id)) {
                    const d = byId.get(did);
                    if (!d) continue;
                    let dsp = String(d.source_path || '');
                    // strip old top name prefix if present
                    if (dsp.startsWith(top.name + '/')) {
                        dsp = match.source_path
                            ? `${match.source_path}/${dsp.slice(top.name.length + 1)}`
                            : dsp.slice(top.name.length + 1);
                    }
                    await rest(url, key, 'PATCH', `online_folders?id=eq.${did}`, {
                        subject: toSubject,
                        source_path: dsp
                    });
                }
                report.foldersRetagged += collectSubtree(kid.id, byParent).length;
            }
        }
        // delete empty top
        try {
            await rest(url, key, 'DELETE', `online_folders?id=eq.${top.id}`);
            report.foldersDeleted++;
        } catch (e) {
            // retag top to target if cannot delete
            await rest(url, key, 'PATCH', `online_folders?id=eq.${top.id}`, {
                parent_id: rootId,
                subject: toSubject,
                source_path: top.name
            });
        }
    } else {
        // Reparent entire tree to new subject root
        await rest(url, key, 'PATCH', `online_folders?id=eq.${top.id}`, {
            parent_id: rootId,
            subject: toSubject,
            source_path: top.name
        });
        for (const did of subtree.filter((id) => id !== top.id)) {
            await rest(url, key, 'PATCH', `online_folders?id=eq.${did}`, {
                subject: toSubject
            });
        }
        report.foldersRetagged += subtree.length;
    }
}

async function mergeSimple(url, key, sourceId, targetId, byParent, report) {
    const lessons = await rest(
        url,
        key,
        'GET',
        `online_lessons?folder_id=eq.${sourceId}&select=id`
    );
    for (const l of Array.isArray(lessons) ? lessons : []) {
        await rest(url, key, 'PATCH', `online_lessons?id=eq.${l.id}`, {
            folder_id: targetId
        });
        report.lessonsMoved++;
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
            await mergeSimple(url, key, kid.id, mk.id, byParent, report);
        } else {
            await rest(url, key, 'PATCH', `online_folders?id=eq.${kid.id}`, {
                parent_id: targetId
            });
        }
    }
    try {
        await rest(url, key, 'DELETE', `online_folders?id=eq.${sourceId}`);
        report.foldersDeleted++;
    } catch (e) {
        /* keep */
    }
}

async function flattenMonLayer(url, key, mon, rootId, byParent, byId, report) {
    const kids = byParent.get(mon.id) || [];
    console.log(
        DRY ? '[dry-flat]' : '[flat]',
        mon.subject,
        mon.name,
        'kids',
        kids.length
    );
    if (DRY) {
        report.monFlattened.push({ mon: mon.name, subject: mon.subject, kids: kids.length });
        return;
    }

    for (const child of kids) {
        // target subject for KHXH mon
        let targetSubject = mon.subject;
        if (/^0?7\.\s*khoa\s*h[oọ]c\s*x[aã]\s*h[oộ]i/i.test(mon.name)) {
            if (/^s[uử]\s*c[oô]/i.test(child.name)) targetSubject = 'history';
            else if (/^đ[iị]a/i.test(child.name)) targetSubject = 'geography';
            else if (/ktpl|ph[aá]p\s*lu[aậ]t/i.test(child.name)) targetSubject = 'civic_education';
            else targetSubject = 'history';
        }

        const tRoot =
            targetSubject === mon.subject
                ? rootId
                : await ensureRoot(url, key, mon.examhub_course_key || 'combo-xps-2027', targetSubject);

        // merge if same name under target root
        const siblings = await rest(
            url,
            key,
            'GET',
            `online_folders?parent_id=eq.${tRoot}&select=id,name,source_path`
        );
        const exist = (Array.isArray(siblings) ? siblings : []).find(
            (s) => norm(s.name) === norm(child.name) && s.id !== child.id
        );

        if (exist) {
            await mergeSimple(url, key, child.id, exist.id, byParent, report);
        } else {
            await rest(url, key, 'PATCH', `online_folders?id=eq.${child.id}`, {
                parent_id: tRoot,
                subject: targetSubject,
                source_path: child.name
            });
            // retag descendants subject + strip mon from path
            const monPath = mon.source_path || mon.name;
            for (const did of collectSubtree(child.id, byParent).filter((id) => id !== child.id)) {
                const d = byId.get(did);
                if (!d) continue;
                let sp = String(d.source_path || '');
                if (sp.startsWith(monPath + '/')) sp = sp.slice(monPath.length + 1);
                await rest(url, key, 'PATCH', `online_folders?id=eq.${did}`, {
                    subject: targetSubject,
                    source_path: sp
                });
            }
            report.foldersRetagged += collectSubtree(child.id, byParent).length;
        }
    }

    // delete mon shell
    const still = await rest(
        url,
        key,
        'GET',
        `online_folders?parent_id=eq.${mon.id}&select=id&limit=3`
    );
    const stillL = await rest(
        url,
        key,
        'GET',
        `online_lessons?folder_id=eq.${mon.id}&select=id&limit=3`
    );
    if (
        (!Array.isArray(still) || still.length === 0) &&
        (!Array.isArray(stillL) || stillL.length === 0)
    ) {
        try {
            await rest(url, key, 'DELETE', `online_folders?id=eq.${mon.id}`);
            report.foldersDeleted++;
            console.log('[del mon]', mon.name);
        } catch (e) {
            console.warn('mon del fail', mon.name, e.message);
        }
    }
}

function collectSubtree(id, byParent) {
    const out = [id];
    for (const k of byParent.get(id) || []) out.push(...collectSubtree(k.id, byParent));
    return out;
}

async function main() {
    const env = loadEnv(path.join('X:/ECODEx/exam-system/.env.local'));
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    console.log(DRY ? 'MODE: dry-run' : 'MODE: APPLY');

    let folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path,examhub_course_key'
    );
    let { byId, byParent } = buildIndex(folders);

    const report = {
        ops: [],
        lessonsMoved: 0,
        foldersDeleted: 0,
        foldersRetagged: 0,
        monFlattened: [],
        errors: []
    };

    // --- 1) Fix SỬ / ĐỊA / teacher packages with wrong subject (depth-1 tops only) ---
    // Find tops: folders where source_path has no slash AND expected subject differs
    const tops = [];
    for (const f of folders) {
        const sp = String(f.source_path || '');
        if (!sp || sp.includes('/')) continue; // depth-1 only
        if (f.name === 'COMBO XPS 2027') continue;
        const exp = expectedSubject(f);
        if (!exp || exp === f.subject) continue;
        tops.push({ f, exp });
    }

    // Also: any folder named exactly SỬ CÔ... with wrong subject even if path odd
    for (const f of folders) {
        if (!/^s[uử]\s*c[oô]/i.test(f.name || '')) continue;
        if (f.subject === 'history') continue;
        // use as top if parent is subject root
        const parent = f.parent_id ? byId.get(f.parent_id) : null;
        const parentIsRoot = parent && (!parent.source_path || parent.source_path === '');
        if (parentIsRoot || !f.source_path || !f.source_path.includes('/')) {
            if (!tops.some((t) => t.f.id === f.id)) tops.push({ f, exp: 'history' });
        }
    }

    console.log('Tops to move:', tops.length);
    tops.forEach((t) =>
        console.log(`  ${t.f.subject} → ${t.exp} | ${t.f.name} | path=${t.f.source_path}`)
    );

    for (const { f, exp } of tops) {
        try {
            if (DRY) {
                const n = collectSubtree(f.id, byParent).length;
                console.log('[dry]', f.subject, '→', exp, f.name, 'tree', n);
                report.ops.push({ from: f.subject, to: exp, name: f.name, tree: n });
                continue;
            }
            await moveTreeToSubject(url, key, f, exp, byParent, byId, report);
        } catch (e) {
            console.error('ERR move', f.name, e.message);
            report.errors.push({ name: f.name, error: e.message });
        }
    }

    // Reload after moves
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path,examhub_course_key'
    );
    ({ byId, byParent } = buildIndex(folders));

    // --- 2) Brute force: any folder under path starting with SỬ CÔ must be history ---
    let forceSu = 0;
    for (const f of folders) {
        const top = String(f.source_path || f.name || '').split('/')[0];
        if (!/^s[uử]\s*c[oô]/i.test(top) && !/^s[uử]\s*c[oô]/i.test(f.name || '')) continue;
        if (f.subject === 'history') continue;
        console.log(DRY ? '[dry-force]' : '[force]', f.subject, '→ history', f.source_path || f.name);
        if (!DRY) {
            await rest(url, key, 'PATCH', `online_folders?id=eq.${f.id}`, {
                subject: 'history'
            });
        }
        forceSu++;
    }
    report.forceHistory = forceSu;

    // --- 3) Flatten mon layers 01-07 at depth1 ---
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path,examhub_course_key'
    );
    ({ byId, byParent } = buildIndex(folders));

    const monLayers = folders.filter((f) => {
        const sp = String(f.source_path || '');
        if (!sp || sp.includes('/')) return false;
        return (
            /^0?[1-6]\.\s*m[oô]n\b/i.test(f.name) ||
            /^0?7\.\s*khoa\s*h[oọ]c\s*x[aã]\s*h[oộ]i/i.test(f.name)
        );
    });

    for (const mon of monLayers) {
        const parent = mon.parent_id ? byId.get(mon.parent_id) : null;
        const rootId =
            parent && (!parent.source_path || parent.source_path === '')
                ? parent.id
                : await ensureRoot(url, key, mon.examhub_course_key || 'combo-xps-2027', mon.subject);
        try {
            await flattenMonLayer(url, key, mon, rootId, byParent, byId, report);
        } catch (e) {
            console.error('flatten err', mon.name, e.message);
            report.errors.push({ mon: mon.name, error: e.message });
        }
    }

    // --- 4) Second pass: any depth-1 still wrong after first moves ---
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path,examhub_course_key'
    );
    ({ byId, byParent } = buildIndex(folders));
    const tops2 = [];
    for (const f of folders) {
        const sp = String(f.source_path || '');
        if (!sp || sp.includes('/')) continue;
        if (/^combo\s*xps/i.test(f.name || '')) continue;
        const exp = expectedSubject(f);
        if (!exp || exp === f.subject) continue;
        tops2.push({ f, exp });
    }
    console.log('Second pass tops:', tops2.length);
    for (const { f, exp } of tops2) {
        try {
            await moveTreeToSubject(url, key, f, exp, byParent, byId, report);
        } catch (e) {
            console.error('ERR move2', f.name, e.message);
            report.errors.push({ name: f.name, error: e.message });
        }
    }

    // --- 5) Force-retag ONLY teacher packages (SỬ/ĐỊA/LÝ/...) by TOP name.
    // NEVER use mon wrappers like "08. COMBO ... TƯ DUY" — they false-match TSA.
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path,examhub_course_key'
    );
    let forceRetag = 0;
    for (const f of folders) {
        const topName = String(f.source_path || f.name || '').split('/')[0];
        // Skip mon / package / dgnl combo wrappers
        if (/^0?[1-8]\.\s/i.test(topName) || /^📚/.test(topName)) continue;
        if (/combo\s*đ[aá]nh\s*gi[aá]/i.test(topName)) continue;
        // Only teacher-style tops
        if (
            !/^(s[uử]\s*c[oô]|đ[iị]a\s|l[yý]\s*th[aầ]y|h[oó]a\s|sinh\s|to[aá]n|ti[eế]ng\s*anh|v[aă]n\s|h[oọ]c\s*v[aă]n|n[eề]n\s*t[aả]ng\s*to[aá]n)/i.test(
                topName
            )
        ) {
            continue;
        }
        const fake = { name: topName, source_path: topName };
        const exp = expectedSubject(fake);
        if (!exp || exp === f.subject) continue;
        console.log(DRY ? '[dry-force]' : '[force]', f.subject, '→', exp, f.source_path || f.name);
        if (!DRY) {
            await rest(url, key, 'PATCH', `online_folders?id=eq.${f.id}`, { subject: exp });
        }
        forceRetag++;
    }
    report.forceRetag = forceRetag;

    // --- 6) Dedupe same-name depth1 under each subject root ---
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path,examhub_course_key'
    );
    ({ byId, byParent } = buildIndex(folders));
    const roots = folders.filter((f) => !f.parent_id || f.source_path === '' || f.source_path == null);
    let deduped = 0;
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
            // keep the one with most descendants / non-empty path preference
            list.sort((a, b) => {
                const da = collectSubtree(a.id, byParent).length;
                const db = collectSubtree(b.id, byParent).length;
                return db - da;
            });
            const keep = list[0];
            console.log('[dedupe]', root.subject, keep.name, 'x', list.length);
            for (const extra of list.slice(1)) {
                if (DRY) continue;
                try {
                    await mergeSimple(url, key, extra.id, keep.id, byParent, report);
                    deduped++;
                } catch (e) {
                    console.warn('dedupe fail', extra.name, e.message);
                    report.errors.push({ dedupe: extra.name, error: e.message });
                }
            }
        }
    }
    report.deduped = deduped;

    // --- 7) Delete empty mon/package shells + orphan drive package folders ---
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path'
    );
    ({ byId, byParent } = buildIndex(folders));
    // Only mon/package intermediate shells — NOT numbered lesson folders (01. Theme...)
    const shells = folders.filter((f) => {
        const n = f.name || '';
        return (
            /^0?[1-8]\.\s*m[oô]n\b/i.test(n) ||
            /^0?7\.\s*khoa\s*h[oọ]c\s*x[aã]\s*h[oộ]i/i.test(n) ||
            /^0?8\.\s*combo\s*đ[aá]nh\s*gi[aá]/i.test(n) ||
            /^📚\s*combo/i.test(n)
        );
    });
    for (const sh of shells) {
        const kids = byParent.get(sh.id) || [];
        if (kids.length) continue;
        const les = await rest(
            url,
            key,
            'GET',
            `online_lessons?folder_id=eq.${sh.id}&select=id&limit=1`
        );
        if (Array.isArray(les) && les.length) continue;
        console.log(DRY ? '[dry-del-shell]' : '[del-shell]', sh.subject, sh.name);
        if (!DRY) {
            try {
                await rest(url, key, 'DELETE', `online_folders?id=eq.${sh.id}`);
                report.foldersDeleted++;
            } catch (e) {
                /* ignore */
            }
        }
    }

    // --- 8) Verify ---
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path'
    );
    const vactSu = folders.filter(
        (f) =>
            f.subject === 'dgnl_vact' &&
            (/^s[uử]\s*c[oô]/i.test(f.name || '') ||
                /^s[uử]\s*c[oô]/i.test(String(f.source_path || '').split('/')[0] || '') ||
                /s[uử]\s*c[oô]/i.test(f.name || ''))
    );
    const monLeft = folders.filter(
        (f) =>
            f.source_path &&
            !String(f.source_path).includes('/') &&
            (/^0?[1-8]\.\s*m[oô]n\b|^0?7\.\s*khoa|^📚/i.test(f.name || ''))
    );
    const wrongDepth1 = [];
    for (const f of folders) {
        const sp = String(f.source_path || '');
        if (!sp || sp.includes('/')) continue;
        const exp = expectedSubject(f);
        if (exp && exp !== f.subject) wrongDepth1.push({ name: f.name, subject: f.subject, exp });
    }

    // Print depth1 per key subject
    const subjects = [...new Set(folders.map((f) => f.subject))].sort();
    console.log('\n=== DEPTH1 BY SUBJECT ===');
    for (const subj of subjects) {
        const root = folders.find(
            (f) => f.subject === subj && (!f.parent_id || f.source_path === '' || f.source_path == null)
        );
        if (!root) {
            console.log(subj + ': (no root)');
            continue;
        }
        const kids = folders
            .filter((f) => f.parent_id === root.id)
            .map((k) => k.name)
            .sort((a, b) => a.localeCompare(b, 'vi'));
        console.log(`\n${subj} (${kids.length}):`);
        kids.forEach((n) => console.log('  -', n));
    }

    console.log('\n=== VERIFY ===');
    console.log('SỬ under dgnl_vact:', vactSu.length);
    vactSu.forEach((f) => console.log(' ', f.subject, f.name, f.source_path));
    console.log('mon layers left:', monLeft.length);
    monLeft.forEach((f) => console.log(' ', f.subject, f.name));
    console.log('wrong depth1 left:', wrongDepth1.length);
    wrongDepth1.forEach((w) => console.log(' ', w.subject, '→ should', w.exp, '|', w.name));

    const out = path.join('X:/ECODEx/exam-system/scripts/fix-subject-hard-report.json');
    fs.writeFileSync(
        out,
        JSON.stringify(
            {
                at: new Date().toISOString(),
                dry: DRY,
                ...report,
                verify: {
                    vactSu: vactSu.length,
                    monLeft: monLeft.length,
                    wrongDepth1: wrongDepth1.length,
                    wrongDepth1List: wrongDepth1
                }
            },
            null,
            2
        )
    );
    console.log('wrote', out);
    console.log('SUMMARY', {
        ops: report.ops.length,
        forceHistory: report.forceHistory,
        forceRetag: report.forceRetag,
        deduped: report.deduped,
        lessonsMoved: report.lessonsMoved,
        foldersDeleted: report.foldersDeleted,
        foldersRetagged: report.foldersRetagged,
        errors: report.errors.length,
        vactSuLeft: vactSu.length,
        monLeft: monLeft.length,
        wrongDepth1: wrongDepth1.length
    });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
