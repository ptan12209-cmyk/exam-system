'use strict';

/**
 * Careful subject re-tag for mis-placed folder trees.
 *
 * High-confidence rules only:
 *  A) SỬ CÔ… under dgnl_vact (HCM false positive) → history
 *  B) Teacher packages under wrong mon (SINH THẦY under math, LÝ THẦY under math…)
 *  C) Legacy subject=toan mon packages 01–06 → correct db subjects
 *  D) Legacy subject=toan pack 07/08 → re-tag EACH folder by path (not whole pack to one subject)
 *
 * node scripts/fix-wrong-subject-trees.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry-run');

const SUBJECT_MAP = path.join(
    'X:/ECODEx/Google-Drive-Private-Video-Downloader-Extension-main/Google-Drive-Private-Video-Downloader-Extension-main/local_engine/subject-map.js'
);
const { detectSubjectFromPath } = require(SUBJECT_MAP);

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

function toDbSubject(frontend) {
    const map = {
        toan: 'math',
        ly: 'physics',
        hoa: 'chemistry',
        sinh: 'biology',
        anh: 'english',
        van: 'literature',
        su: 'history',
        dia: 'geography',
        ktpl: 'civic_education',
        dgnl_hsa: 'dgnl_hsa',
        dgnl_tsa: 'dgnl_tsa',
        dgnl_vact: 'dgnl_vact',
        dgnl: 'dgnl_hsa',
        math: 'math',
        physics: 'physics',
        chemistry: 'chemistry',
        biology: 'biology',
        english: 'english',
        literature: 'literature',
        history: 'history',
        geography: 'geography',
        civic_education: 'civic_education'
    };
    return map[String(frontend || '').toLowerCase()] || String(frontend || '');
}

const MON_NUM_TO_DB = {
    '01': 'math',
    '02': 'physics',
    '03': 'chemistry',
    '04': 'biology',
    '05': 'english',
    '06': 'literature'
};

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
            Prefer: 'return=representation'
        },
        body: body != null ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }
    if (!res.ok) throw new Error(`${method} ${q} → ${res.status}: ${String(text).slice(0, 400)}`);
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

function buildChildrenMap(folders) {
    const byParent = new Map();
    for (const f of folders) {
        const p = f.parent_id || 'ROOT';
        if (!byParent.has(p)) byParent.set(p, []);
        byParent.get(p).push(f);
    }
    return byParent;
}

function collectSubtree(folderId, byParent) {
    const out = [folderId];
    for (const k of byParent.get(folderId) || []) {
        out.push(...collectSubtree(k.id, byParent));
    }
    return out;
}

function isDepth1(f) {
    const sp = String(f.source_path || '');
    return sp && !sp.includes('/');
}

function isRootFolder(f) {
    return !f.parent_id || f.source_path === '' || f.name === 'COMBO XPS 2027';
}

async function moveTree(url, key, folderById, byParent, topId, toSubject, courseKey, report, label) {
    const top = folderById.get(topId);
    if (!top) return;
    const subtree = collectSubtree(topId, byParent);
    console.log(DRY ? '[dry]' : '[move]', label || '', top.subject, '→', toSubject, top.name, `(${subtree.length} folders)`);
    report.moves.push({
        id: topId,
        name: top.name,
        from: top.subject,
        to: toSubject,
        folderCount: subtree.length,
        label
    });
    if (DRY) return;

    const rootId = await ensureRoot(url, key, courseKey || 'combo-xps-2027', toSubject);
    for (const fid of subtree) {
        const patch = { subject: toSubject };
        if (fid === topId) patch.parent_id = rootId;
        await rest(url, key, 'PATCH', `online_folders?id=eq.${fid}`, patch);
    }
}

async function retagFolderOnly(url, key, folderId, toSubject, report, name) {
    console.log(DRY ? '[dry-tag]' : '[tag]', name, '→', toSubject);
    report.tags.push({ id: folderId, name, to: toSubject });
    if (DRY) return;
    await rest(url, key, 'PATCH', `online_folders?id=eq.${folderId}`, { subject: toSubject });
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
    let byParent = buildChildrenMap(folders);
    let folderById = new Map(folders.map((f) => [f.id, f]));
    const report = { moves: [], tags: [], errors: [] };

    // --- A) SỬ CÔ under wrong subject (esp. dgnl_vact) ---
    for (const f of folders) {
        if (!isDepth1(f)) continue;
        if (!/^s[uử]\s*c[oô]/i.test(f.name || f.source_path || '')) continue;
        if (f.subject === 'history') continue;
        await moveTree(
            url,
            key,
            folderById,
            byParent,
            f.id,
            'history',
            f.examhub_course_key,
            report,
            'SỬ package'
        );
    }

    // --- B) Teacher packages under wrong mon root ---
    const teacherRules = [
        { re: /^sinh\s*th[aầ]y/i, to: 'biology', wrong: (s) => s !== 'biology' },
        { re: /^l[yý]\s*th[aầ]y/i, to: 'physics', wrong: (s) => s !== 'physics' },
        { re: /^to[aá]n\s*th[aầ]y/i, to: 'math', wrong: (s) => s !== 'math' },
        { re: /^h[oó]a\s*th[aầ]y/i, to: 'chemistry', wrong: (s) => s !== 'chemistry' },
        { re: /^v[aă]n\s*th[aầ]y|^ng[uữ]\s*v[aă]n\s*th[aầ]y/i, to: 'literature', wrong: (s) => s !== 'literature' },
        { re: /^đ[iị]a\s*(c[oô]|th[aầ]y)/i, to: 'geography', wrong: (s) => s !== 'geography' }
    ];
    for (const f of folders) {
        if (!isDepth1(f)) continue;
        for (const rule of teacherRules) {
            if (rule.re.test(f.name || '') && rule.wrong(f.subject)) {
                await moveTree(
                    url,
                    key,
                    folderById,
                    byParent,
                    f.id,
                    rule.to,
                    f.examhub_course_key,
                    report,
                    'teacher package'
                );
                break;
            }
        }
    }

    // --- C) Legacy subject=toan mon 01–06 packages ---
    for (const f of folders) {
        if (f.subject !== 'toan') continue;
        if (!isDepth1(f)) continue;
        const m = String(f.name || f.source_path || '').match(/^0?([1-6])\.\s*m[oô]n\b/i);
        if (!m) continue;
        const to = MON_NUM_TO_DB[m[1].padStart(2, '0')] || MON_NUM_TO_DB[m[1]];
        if (!to || to === f.subject) continue;
        // skip if already correct db
        if (f.subject === to) continue;
        await moveTree(
            url,
            key,
            folderById,
            byParent,
            f.id,
            to,
            f.examhub_course_key,
            report,
            'legacy mon 01-06'
        );
    }

    // Refresh folder list after moves for pack 07/08 retag
    if (!DRY && report.moves.length) {
        folders = await fetchAll(
            url,
            key,
            'online_folders',
            'id,name,subject,parent_id,source_path,examhub_course_key'
        );
        byParent = buildChildrenMap(folders);
        folderById = new Map(folders.map((f) => [f.id, f]));
    }

    // --- D) Pack 07 / 08 under legacy toan (or wrong subject): retag each folder by path ---
    const packTops = folders.filter((f) => {
        if (!isDepth1(f)) return false;
        const n = f.name || f.source_path || '';
        return (
            /^07\.\s*khoa\s*h[oọ]c\s*x[aã]\s*h[oộ]i/i.test(n) ||
            /^08\.\s*combo\s*đ[aá]nh\s*gi[aá]/i.test(n) ||
            (/^📚/.test(n) && /combo\s*xps/i.test(n) && f.subject === 'toan')
        );
    });

    for (const top of packTops) {
        // Don't wholesale-move 📚 drive root or 08 pack — retag children only
        const subtree = collectSubtree(top.id, byParent);
        console.log('Retag pack children:', top.name, 'folders', subtree.length, 'current subject', top.subject);

        for (const fid of subtree) {
            const f = folderById.get(fid);
            if (!f) continue;
            if (fid === top.id) {
                // Pack root 07 → leave under history as container OR split; attach to history root as mon container
                // Pack 08 → should not sit under toan; we reparent pack to... no single subject.
                // For 07: move tree root to history (default mon KHXH)
                // For 08: re-tag each leaf folder individually; reparent depth1 children of 08 by detected subject
                continue;
            }
            const probe = `${f.source_path || f.name}/x.mp4`;
            const det = detectSubjectFromPath(probe);
            if (!det.subject) continue;
            const db = toDbSubject(det.subject);
            if (db === f.subject) continue;
            // Only retag if path is confident (not empty subject)
            await retagFolderOnly(url, key, f.id, db, report, f.source_path || f.name);
        }

        // Reparent pack 07 top to history
        if (/^07\./i.test(top.name) && top.subject !== 'history') {
            await moveTree(
                url,
                key,
                folderById,
                byParent,
                top.id,
                'history',
                top.examhub_course_key,
                report,
                'KHXH pack root→history'
            );
        }
        // Pack 08 under toan: reparent depth-1 children under correct subject roots, leave pack folder empty/delete later
        if (/^08\./i.test(top.name) && (top.subject === 'toan' || top.subject === 'math')) {
            const kids = byParent.get(top.id) || [];
            for (const kid of kids) {
                const det = detectSubjectFromPath(`${kid.source_path || kid.name}/x.mp4`);
                const db = det.subject ? toDbSubject(det.subject) : 'dgnl_hsa';
                await moveTree(
                    url,
                    key,
                    folderById,
                    byParent,
                    kid.id,
                    db,
                    top.examhub_course_key,
                    report,
                    '08 pack child'
                );
            }
        }
    }

    // --- E) Safety pass: any folder path containing SỬ CÔ but not history ---
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path,examhub_course_key'
    );
    let safety = 0;
    for (const f of folders) {
        const probe = `${f.source_path || ''}/${f.name || ''}`;
        if (!/s[uử]\s*c[oô]/i.test(probe)) continue;
        if (f.subject === 'history') continue;
        // skip if this is under genuine V-ACT package path with V-ACT keyword at start
        if (/^01\.\s*đ[aá]nh\s*gi[aá].*v-?act/i.test(f.source_path || '')) continue;
        if (/\bv-?act\b|\bvatc\b/i.test(f.source_path || '') && /đ[aá]nh\s*gi[aá]\s*n[aă]ng\s*l[uự]c/i.test(f.source_path || '')) {
            continue;
        }
        console.log(DRY ? '[dry-safety]' : '[safety]', f.subject, '→ history', f.source_path || f.name);
        if (!DRY) {
            await rest(url, key, 'PATCH', `online_folders?id=eq.${f.id}`, { subject: 'history' });
        }
        safety++;
    }
    report.safetyHistory = safety;

    const out = path.join('X:/ECODEx/exam-system/scripts/fix-wrong-subject-report.json');
    fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), dry: DRY, ...report }, null, 2));
    console.log('\n=== SUMMARY ===', {
        moves: report.moves.length,
        tags: report.tags.length,
        safetyHistory: safety,
        errors: report.errors.length
    });
    console.log('wrote', out);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
