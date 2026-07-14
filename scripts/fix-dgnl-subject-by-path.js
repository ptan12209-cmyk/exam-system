'use strict';

/**
 * Recovery: retag dgnl_* folders by REAL package segment in source_path
 * (not by mon wrapper "08. COMBO ... TƯ DUY" which falsely matches TSA).
 *
 * Rules (first matching segment wins, scan full path):
 *  - path contains V-ACT / VATC / HỒ CHÍ MINH V-ACT → dgnl_vact
 *  - path contains HSA / HÀ NỘI HSA → dgnl_hsa
 *  - path contains TSA / BÁCH KHOA TSA → dgnl_tsa
 *  - path contains SƯ PHẠM (ĐGNL SP) → dgnl_hsa (keep with HSA root tree)
 *
 * Also: SỬ CÔ* / ĐỊA* must NEVER be under dgnl_* → history/geography
 *
 * node scripts/fix-dgnl-subject-by-path.js [--dry-run]
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

/**
 * Infer dgnl subject from full source_path by scanning meaningful segments.
 * Ignores mon wrapper "08. COMBO ĐÁNH GIÁ ... TƯ DUY".
 */
function inferDgnlFromPath(sourcePath, name) {
    const full = `${sourcePath || ''} / ${name || ''}`.normalize('NFC');
    const segs = String(sourcePath || '')
        .normalize('NFC')
        .split('/')
        .filter(Boolean);

    // Teacher packages that must leave dgnl entirely
    const topSeg = segs[0] || name || '';
    if (/^s[uử]\s*c[oô]/i.test(topSeg) || /^s[uử]\s*c[oô]/i.test(name || '')) return 'history';
    if (/^đ[iị]a\s*(l[yý]|c[oô]|th[aầ]y)/i.test(topSeg) || /^đ[iị]a\s*(l[yý]|c[oô]|th[aầ]y)/i.test(name || ''))
        return 'geography';
    if (/^l[yý]\s*th[aầ]y/i.test(topSeg)) return 'physics';
    if (/^h[oó]a\s*(th[aầ]y|c[oô])/i.test(topSeg)) return 'chemistry';
    if (/^sinh\s*(th[aầ]y|c[oô])/i.test(topSeg)) return 'biology';
    if (/^to[aá]n(\s|-)/i.test(topSeg) || /^n[eề]n\s*t[aả]ng\s*to[aá]n/i.test(topSeg)) return 'math';
    if (/^ti[eế]ng\s*anh/i.test(topSeg)) return 'english';
    if (/^v[aă]n\s*(c[oô]|th[aầ]y)/i.test(topSeg) || /^h[oọ]c\s*v[aă]n/i.test(topSeg)) return 'literature';

    // Prefer deepest meaningful DGNL package segment
    // Scan from left: mon 08 is noise; real package is 01 V-ACT / 02 HSA / 03 TSA / 04 SP
    for (const seg of segs) {
        // skip mon wrappers
        if (/^0?8\.\s*combo\s*đ[aá]nh\s*gi[aá]/i.test(seg)) continue;
        if (/^📚/.test(seg)) continue;
        if (/^0?[1-7]\.\s*m[oô]n\b/i.test(seg)) continue;
        if (/^0?7\.\s*khoa\s*h[oọ]c/i.test(seg)) continue;

        if (/v-?act|vatc/i.test(seg) || /h[oồ]\s*ch[ií]\s*minh/i.test(seg)) return 'dgnl_vact';
        if (/\bhsa\b/i.test(seg) || /h[aà]\s*n[oộ]i\s*hsa/i.test(seg)) return 'dgnl_hsa';
        if (/\btsa\b/i.test(seg) || /b[aá]ch\s*khoa/i.test(seg)) return 'dgnl_tsa';
        if (/s[uư]\s*ph[aạ]m/i.test(seg) || /\bsp\b.*đgnl|đgnl.*\bsp\b|peda/i.test(seg)) return 'dgnl_hsa';
    }

    // Fallback on name alone
    if (/v-?act|vatc/i.test(full) && /h[oồ]\s*ch[ií]\s*minh|đgnl|đ[aá]nh\s*gi[aá]/i.test(full))
        return 'dgnl_vact';
    if (/\bhsa\b/i.test(full)) return 'dgnl_hsa';
    if (/\btsa\b|b[aá]ch\s*khoa/i.test(full)) return 'dgnl_tsa';
    if (/s[uư]\s*ph[aạ]m/i.test(full) && /đ[aá]nh\s*gi[aá]|đgnl/i.test(full)) return 'dgnl_hsa';

    return null;
}

function collectSubtree(id, byParent) {
    const out = [id];
    for (const k of byParent.get(id) || []) out.push(...collectSubtree(k.id, byParent));
    return out;
}

async function mergeSimple(url, key, sourceId, targetId, byParent, report) {
    const lessons = await rest(url, key, 'GET', `online_lessons?folder_id=eq.${sourceId}&select=id`);
    for (const l of Array.isArray(lessons) ? lessons : []) {
        await rest(url, key, 'PATCH', `online_lessons?id=eq.${l.id}`, { folder_id: targetId });
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
    } catch {
        /* keep */
    }
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
    console.log('folders', folders.length);

    const report = {
        retagged: 0,
        reparented: 0,
        lessonsMoved: 0,
        foldersDeleted: 0,
        errors: [],
        byTarget: {}
    };

    // 1) Retag every folder whose path implies a subject different from current
    const batch = [];
    for (const f of folders) {
        const exp = inferDgnlFromPath(f.source_path, f.name);
        if (!exp || exp === f.subject) continue;
        batch.push({ f, exp });
    }
    console.log('to retag/reclassify:', batch.length);

    // Group by expected for logging
    const counts = {};
    for (const { f, exp } of batch) {
        const k = `${f.subject}→${exp}`;
        counts[k] = (counts[k] || 0) + 1;
    }
    console.log('breakdown', counts);

    // Prefer: just subject retag in place for folders already under correct parent tree.
    // For depth-1 tops with wrong subject, reparent under correct root.
    const byId = new Map(folders.map((f) => [f.id, f]));
    const byParent = new Map();
    for (const f of folders) {
        const p = f.parent_id || 'ROOT';
        if (!byParent.has(p)) byParent.set(p, []);
        byParent.get(p).push(f);
    }

    // Depth-1 teacher/package moves first
    const depth1Moves = batch.filter(({ f }) => {
        const sp = String(f.source_path || '');
        return sp && !sp.includes('/');
    });
    console.log('depth1 moves:', depth1Moves.length);

    for (const { f, exp } of depth1Moves) {
        try {
            const rootId = await ensureRoot(url, key, exp);
            const siblings = await rest(
                url,
                key,
                'GET',
                `online_folders?parent_id=eq.${rootId}&select=id,name,source_path`
            );
            const match = (Array.isArray(siblings) ? siblings : []).find(
                (s) => norm(s.name) === norm(f.name) && s.id !== f.id
            );
            console.log(
                DRY ? '[dry-move]' : '[move]',
                f.subject,
                '→',
                exp,
                f.name,
                match ? 'MERGE' : 'REPARENT'
            );
            if (DRY) continue;
            if (match) {
                await mergeSimple(url, key, f.id, match.id, byParent, report);
            } else {
                await rest(url, key, 'PATCH', `online_folders?id=eq.${f.id}`, {
                    parent_id: rootId,
                    subject: exp,
                    source_path: f.name
                });
                for (const did of collectSubtree(f.id, byParent).filter((id) => id !== f.id)) {
                    await rest(url, key, 'PATCH', `online_folders?id=eq.${did}`, { subject: exp });
                }
            }
            report.reparented++;
            report.byTarget[exp] = (report.byTarget[exp] || 0) + 1;
        } catch (e) {
            console.error('move err', f.name, e.message);
            report.errors.push({ name: f.name, error: e.message });
        }
    }

    // Reload then bulk retag remaining by path
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path'
    );
    let retagN = 0;
    for (const f of folders) {
        const exp = inferDgnlFromPath(f.source_path, f.name);
        if (!exp || exp === f.subject) continue;
        if (DRY) {
            retagN++;
            continue;
        }
        try {
            await rest(url, key, 'PATCH', `online_folders?id=eq.${f.id}`, { subject: exp });
            retagN++;
        } catch (e) {
            report.errors.push({ id: f.id, error: e.message });
        }
    }
    report.retagged = retagN;
    console.log('retagged in place:', retagN);

    // 2) Rewrite source_path for dgnl trees: strip mon wrappers 08. COMBO / 📚 from paths
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path'
    );
    let pathFixed = 0;
    for (const f of folders) {
        const sp = String(f.source_path || '');
        if (!sp.includes('/')) continue;
        const segs = sp.split('/');
        const cleaned = segs.filter((seg) => {
            if (/^📚/.test(seg)) return false;
            if (/^0?8\.\s*combo\s*đ[aá]nh\s*gi[aá]/i.test(seg)) return false;
            if (/^0?[1-7]\.\s*m[oô]n\b/i.test(seg)) return false;
            if (/^0?7\.\s*khoa\s*h[oọ]c/i.test(seg)) return false;
            return true;
        });
        if (cleaned.length === segs.length) continue;
        if (cleaned.length === 0) continue;
        const newSp = cleaned.join('/');
        if (newSp === sp) continue;
        if (!DRY) {
            try {
                await rest(url, key, 'PATCH', `online_folders?id=eq.${f.id}`, {
                    source_path: newSp
                });
            } catch {
                continue;
            }
        }
        pathFixed++;
    }
    report.pathFixed = pathFixed;
    console.log('paths cleaned:', pathFixed);

    // 3) Ensure depth1 packages under correct roots + dedupe
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path'
    );
    const byParent2 = new Map();
    for (const f of folders) {
        const p = f.parent_id || 'ROOT';
        if (!byParent2.has(p)) byParent2.set(p, []);
        byParent2.get(p).push(f);
    }

    // Promote package tops that still sit under wrong mon path
    // Depth1 = parent is subject root
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
                    collectSubtree(b.id, byParent2).length - collectSubtree(a.id, byParent2).length
            );
            const keep = list[0];
            console.log('[dedupe]', root.subject, keep.name, 'x', list.length);
            if (DRY) continue;
            for (const extra of list.slice(1)) {
                try {
                    await mergeSimple(url, key, extra.id, keep.id, byParent2, report);
                } catch (e) {
                    report.errors.push({ dedupe: extra.name, error: e.message });
                }
            }
        }
    }

    // 4) Verify
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path'
    );

    const suNotHist = folders.filter(
        (f) =>
            (/^s[uử]\s*c[oô]/i.test(f.name || '') ||
                /^s[uử]\s*c[oô]/i.test(String(f.source_path || '').split('/')[0] || '')) &&
            f.subject !== 'history'
    );
    const vactSu = folders.filter(
        (f) =>
            f.subject === 'dgnl_vact' &&
            (/s[uử]\s*c[oô]/i.test(f.name || '') || /s[uử]\s*c[oô]/i.test(f.source_path || ''))
    );

    console.log('\n=== DEPTH1 ===');
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
        const root = folders.find(
            (f) => f.subject === subj && (!f.parent_id || f.source_path === '' || f.source_path == null)
        );
        if (!root) {
            console.log(subj + ': no root');
            continue;
        }
        const kids = folders
            .filter((f) => f.parent_id === root.id)
            .map((k) => k.name)
            .sort((a, b) => a.localeCompare(b, 'vi'));
        console.log(`\n${subj} (${kids.length}):`);
        kids.forEach((n) => console.log('  -', n));
    }

    // Count by subject
    const bySub = {};
    for (const f of folders) bySub[f.subject] = (bySub[f.subject] || 0) + 1;
    console.log('\ncounts', bySub);
    console.log('SỬ not in history:', suNotHist.length);
    suNotHist.forEach((f) => console.log(' ', f.subject, f.name, f.source_path));
    console.log('SỬ under vact:', vactSu.length);
    vactSu.forEach((f) => console.log(' ', f.name, f.source_path));

    // Wrong: dgnl folders whose path says another dgnl type
    let stillWrong = 0;
    for (const f of folders) {
        if (!/^dgnl_/.test(f.subject)) continue;
        const exp = inferDgnlFromPath(f.source_path, f.name);
        if (exp && exp !== f.subject && /^dgnl_/.test(exp)) {
            stillWrong++;
            if (stillWrong <= 15) console.log(' still wrong', f.subject, '→', exp, f.source_path);
        }
    }
    console.log('dgnl still-wrong count:', stillWrong);

    const out = path.join('X:/ECODEx/exam-system/scripts/fix-dgnl-path-report.json');
    fs.writeFileSync(
        out,
        JSON.stringify(
            {
                at: new Date().toISOString(),
                dry: DRY,
                ...report,
                verify: {
                    suNotHist: suNotHist.length,
                    vactSu: vactSu.length,
                    stillWrong,
                    bySub
                }
            },
            null,
            2
        )
    );
    console.log('wrote', out);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
