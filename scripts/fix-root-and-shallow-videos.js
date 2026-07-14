'use strict';

/**
 * 1) Delete junk PDFs on COMBO root
 * 2) Relocate shallow physics videos (depth<=1) into correct Drive tree from checkpoints
 *
 * Usage: node scripts/fix-root-and-shallow-videos.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

function depth(sp) {
    const s = String(sp || '')
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '');
    if (!s) return 0;
    return s.split('/').filter(Boolean).length;
}

function norm(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFC')
        .replace(/\.mp4$/i, '')
        .replace(/[_\s]+/g, ' ')
        .replace(/[()]/g, '')
        .trim();
}

function stripQuality(name) {
    return String(name || '')
        .replace(/\s*\(\d{3,4}p(?:\s*\([^)]*\))?(?:\s*\(Video Only\))?\)\s*(?=\.mp4$|$)/i, '')
        .replace(/\.mp4$/i, '')
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

async function rest(url, key, method, pathAndQuery, body) {
    const res = await fetch(`${url}/rest/v1/${pathAndQuery}`, {
        method,
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: method === 'GET' ? '' : 'return=representation'
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
    if (!res.ok) throw new Error(`${method} ${pathAndQuery} → ${res.status}: ${String(text).slice(0, 400)}`);
    return data;
}

// --- Folder chain (mirrors importOnlineStudyItems essentials) ---
function naturalOrderIndex(name) {
    const m = String(name || '').match(/^(\d+)/);
    return m ? parseInt(m[1], 10) : 9999;
}

async function ensureFolderChain(url, key, { courseKey, subject, rootName, segments }) {
    // Find/create root
    let parentId = null;
    let pathSoFar = '';

    const roots = await rest(
        url,
        key,
        'GET',
        `online_folders?examhub_course_key=eq.${encodeURIComponent(courseKey)}&subject=eq.${encodeURIComponent(subject)}&source_path=eq.&select=id,name&limit=1`
    );
    if (Array.isArray(roots) && roots[0]) {
        parentId = roots[0].id;
    } else {
        const created = await rest(url, key, 'POST', 'online_folders', {
            name: rootName,
            parent_id: null,
            subject,
            order_index: 1,
            teacher_id: null,
            examhub_course_key: courseKey,
            source_path: ''
        });
        parentId = Array.isArray(created) ? created[0].id : created.id;
    }

    for (const seg of segments) {
        pathSoFar = pathSoFar ? `${pathSoFar}/${seg}` : seg;
        const existing = await rest(
            url,
            key,
            'GET',
            `online_folders?examhub_course_key=eq.${encodeURIComponent(courseKey)}&subject=eq.${encodeURIComponent(subject)}&source_path=eq.${encodeURIComponent(pathSoFar)}&select=id&limit=1`
        );
        if (Array.isArray(existing) && existing[0]) {
            parentId = existing[0].id;
            continue;
        }
        const created = await rest(url, key, 'POST', 'online_folders', {
            name: seg,
            parent_id: parentId,
            subject,
            order_index: naturalOrderIndex(seg),
            teacher_id: null,
            examhub_course_key: courseKey,
            source_path: pathSoFar
        });
        parentId = Array.isArray(created) ? created[0].id : created.id;
    }
    return parentId;
}

/**
 * Build ExamHub relative path segments from Drive checkpoint relativePath.
 * Mirrors online-study-import strip rules.
 */
function detectSubjectFromPath(segs) {
    const joined = segs.join('/');
    if (/m[oô]n\s*l[yý]|\/l[yý]\s*th[aầ]y|v[aậ]t\s*l[ií]/i.test(joined) && !/đgnl|dgnl|hsa|tsa|vact/i.test(segs[0] || '')) {
        // still could be dgnl physics content under mon 08
    }
    if (/08\.\s*combo|đánh giá năng lực|dgnl|đgnl|hsa|tsa|v-?act/i.test(joined)) {
        if (/hsa/i.test(joined)) return 'dgnl_hsa';
        if (/tsa/i.test(joined)) return 'dgnl_tsa';
        if (/vact|v-?act/i.test(joined)) return 'dgnl_vact';
        return 'dgnl_hsa';
    }
    if (/m[oô]n\s*to[aá]n|to[aá]n\s*th[aầ]y/i.test(joined)) return 'math';
    if (/m[oô]n\s*l[yý]|l[yý]\s*th[aầ]y/i.test(joined)) return 'physics';
    if (/m[oô]n\s*h[oó]a|h[oó]a\s*th[aầ]y/i.test(joined)) return 'chemistry';
    if (/m[oô]n\s*sinh|sinh\s*th[aầ]y/i.test(joined)) return 'biology';
    if (/ti[eế]ng\s*anh|m[oô]n\s*anh/i.test(joined)) return 'english';
    if (/ng[uữ]\s*v[aă]n|m[oô]n\s*v[aă]n/i.test(joined)) return 'literature';
    return null;
}

function pathSegmentsFromDrive(file, monName) {
    let rel = String(file.relativePath || '')
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '');
    // If relativePath is only parent and name is separate, keep as-is
    let segs = rel.split('/').filter(Boolean);

    // Drop mega Drive package root
    if (segs.length) {
        const head = segs[0];
        if (
            head.length >= 40 &&
            (/combo\s*xps/i.test(head) || /zalo/i.test(head) || /📚/.test(head))
        ) {
            segs = segs.slice(1);
        }
    }
    // Drop top mon folders (01. MÔN …, 08. COMBO ĐGNL …)
    while (segs.length >= 2) {
        const head = segs[0];
        if (
            /^0?\d{1,2}\.\s*m[oô]n\b/i.test(head) ||
            /^0?8\.\s*combo/i.test(head) ||
            /^m[oô]n\s+/i.test(head) ||
            /đánh giá năng lực|danh gia nang luc/i.test(head) ||
            (monName && head.toLowerCase().includes(String(monName).toLowerCase().slice(0, 10)))
        ) {
            segs = segs.slice(1);
            continue;
        }
        break;
    }
    // Drop secondary combo package under dgnl if still present
    if (segs.length >= 2 && /đánh giá năng lực|dgnl|hsa/i.test(segs[0])) {
        // keep structure under HSA — don't strip further blindly
    }
    return segs;
}

function loadPhysicsCheckpointVideos() {
    const cpDir = path.join(
        process.env.LOCALAPPDATA,
        'GDriveVideoDownloader/local-service/folder-checkpoints'
    );
    // Lý mon id
    const monId = '1rJeUQbtjC9t1C4G-Ch_oN7uAGrepjdzH';
    const p = path.join(cpDir, `folder_${monId}.json`);
    if (!fs.existsSync(p)) throw new Error('Physics checkpoint missing: ' + p);
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const VIDEO_EXT = /\.(mp4|mkv|webm|mov|m4v)$/i;
    const files = (j.files || []).filter(
        (f) => VIDEO_EXT.test(f.name || '') || /^video\//i.test(f.mimeType || '')
    );
    return { monName: '02. MÔN LÝ 2009', files };
}

function buildDriveIndex(files, monName) {
    const byNormName = new Map(); // norm title -> [file]
    const byId = new Map();
    for (const f of files) {
        byId.set(String(f.id), f);
        const base = stripQuality(f.name || '');
        const n = norm(base);
        if (!byNormName.has(n)) byNormName.set(n, []);
        byNormName.get(n).push(f);
        // also index without leading numbers "4. Phần 4"
        const n2 = norm(base.replace(/^\d+[\.\)]\s*/, ''));
        if (n2 && n2 !== n) {
            if (!byNormName.has(n2)) byNormName.set(n2, []);
            byNormName.get(n2).push(f);
        }
    }
    return { byNormName, byId, monName };
}

function extractPartNum(title) {
    const m = String(title || '').match(/ph[aầ]n\s*(\d+)/i) || String(title || '').match(/^(\d+)\.\s*ph/i);
    return m ? m[1] : '';
}

function folderKeywords(folderName) {
    // "2. Bài 2 - Khí lí tưởng" → ["bài 2", "khí", "lý tưởng", "li tuong"]
    const s = norm(folderName);
    const keys = [];
    const bai = s.match(/b[aà]i\s*(\d+)/);
    if (bai) keys.push(`bài ${bai[1]}`, `bai ${bai[1]}`);
    // significant words length>=3
    for (const w of s.split(/[\s\-_./]+/)) {
        if (w.length >= 3 && !/^\d+$/.test(w) && !['bài', 'bai', 'phan', 'phần'].includes(w)) {
            keys.push(w);
        }
    }
    return keys;
}

function scorePathMatch(file, folderName, title) {
    const rel = norm(file.relativePath || '');
    const name = norm(stripQuality(file.name || ''));
    const titleN = norm(stripQuality(title || ''));
    let score = 0;
    const keys = folderKeywords(folderName);
    let keyHits = 0;
    for (const k of keys) {
        if (rel.includes(k)) keyHits++;
    }
    score += keyHits * 10;
    const part = extractPartNum(title);
    if (part && (name.includes(`phần ${part}`) || name.includes(`phan ${part}`) || name.includes(`phần ${part}`))) {
        score += 20;
    }
    if (name === titleN) score += 50;
    if (name.includes(titleN) || titleN.includes(name)) score += 15;
    // "Bài giảng - Phần 4" style
    if (part && /bài giảng|bai giang|website/i.test(file.name || '') && name.includes(part)) {
        score += 8;
    }
    score += Math.min(5, String(file.relativePath || '').split(/[/\\]/).length); // prefer deeper
    return score;
}

function matchDriveFile(lesson, index, taskByBunny = new Map()) {
    if (lesson.source_drive_file_id && index.byId.has(String(lesson.source_drive_file_id))) {
        return index.byId.get(String(lesson.source_drive_file_id));
    }
    // Match via local engine task (full path) using bunny stream id — most reliable
    if (lesson.source_bunny_video_id && taskByBunny.has(String(lesson.source_bunny_video_id))) {
        const task = taskByBunny.get(String(lesson.source_bunny_video_id));
        if (task.fileId && index.byId.has(String(task.fileId))) {
            return index.byId.get(String(task.fileId));
        }
        if (task.relativePath || task.filename) {
            let full = String(task.originalFilename || task.filename || '').replace(/\\/g, '/');
            const segs = full.split('/').filter(Boolean);
            const name = segs.pop() || task.basename || lesson.title;
            let relFromFile = segs.join('/');
            if (!relFromFile) {
                relFromFile = String(task.relativePath || '')
                    .replace(/\\/g, '/')
                    .replace(/^\/+|\/+$/g, '');
            }
            return {
                id: task.fileId || '',
                name,
                relativePath: relFromFile,
                synthetic: true,
                fromTask: true
            };
        }
    }

    // Prefer files under Lý mon tree when lesson is on physics tab
    const preferLy = lesson.subject === 'physics' || lesson.subject === 'ly';
    const base = stripQuality(lesson.title || '');
    const n = norm(base);
    let candidates = index.byNormName.get(n) || [];

    const scored = [];
    const seen = new Set();
    const consider = (f) => {
        if (!f || !f.id || seen.has(f.id)) return;
        // For physics UI mistakes, strongly prefer paths under MÔN LÝ / LÝ THẦY
        const rel = String(f.relativePath || '');
        if (preferLy && !/m[oô]n\s*l[yý]|l[yý]\s*th[aầ]y/i.test(rel)) {
            // still allow if folder keywords match strongly under other trees later with lower score
        }
        seen.add(f.id);
        let sc = scorePathMatch(f, lesson.folder_name || lesson.description || '', lesson.title);
        if (preferLy && /m[oô]n\s*l[yý]|l[yý]\s*th[aầ]y/i.test(rel)) sc += 40;
        if (preferLy && /đánh giá năng lực|dgnl|hsa_qda/i.test(rel)) sc -= 25;
        if (sc >= 30) scored.push({ f, sc });
    };

    for (const f of candidates) consider(f);
    for (const f of index.byId.values()) consider(f);

    scored.sort((a, b) => b.sc - a.sc);
    if (scored.length && scored[0].sc >= 40) {
        if (scored.length === 1 || scored[0].sc >= scored[1].sc + 8) {
            return scored[0].f;
        }
        // take best if clearly Lý-path
        if (/m[oô]n\s*l[yý]|l[yý]\s*th[aầ]y/i.test(scored[0].f.relativePath || '')) {
            return scored[0].f;
        }
    }
    if (candidates.length === 1 && /m[oô]n\s*l[yý]|l[yý]\s*th[aầ]y/i.test(candidates[0].relativePath || '')) {
        return candidates[0];
    }
    return null;
}

async function loadTaskByBunnyMap() {
    const tokenPath = path.join(
        process.env.LOCALAPPDATA,
        'GDriveVideoDownloader/local-service/service-token.txt'
    );
    if (!fs.existsSync(tokenPath)) return new Map();
    const token = fs.readFileSync(tokenPath, 'utf8').trim();
    const map = new Map();
    for (let p = 1; p <= 40; p++) {
        const res = await fetch(`http://127.0.0.1:19898/api/tasks?pageSize=250&page=${p}`, {
            headers: { 'X-Local-Token': token }
        });
        if (!res.ok) break;
        const j = await res.json();
        const chunk = j.tasks || [];
        if (!chunk.length) break;
        for (const t of chunk) {
            if (t.bunnyStreamVideoId) map.set(String(t.bunnyStreamVideoId), t);
            if (t.fileId) {
                // also index by fileId for later
            }
        }
        if (chunk.length < 250) break;
    }
    return map;
}

async function main() {
    const env = loadEnv(path.join('X:/ECODEx/exam-system/.env.local'));
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('missing supabase');

    console.log(DRY ? 'MODE: dry-run' : 'MODE: APPLY');

    const folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path,examhub_course_key'
    );
    const lessons = await fetchAll(
        url,
        key,
        'online_lessons',
        'id,folder_id,title,source_kind,description,video_url,source_bunny_video_id,source_drive_file_id,document_url,source_remote_path'
    );
    const folderById = new Map(folders.map((f) => [f.id, f]));

    // --- 1) Delete root junk PDFs ---
    const rootJunk = lessons.filter((l) => {
        const f = folderById.get(l.folder_id);
        if (!f || depth(f.source_path) !== 0) return false;
        const t = String(l.title || '');
        return (
            /zalo|0333800642|0333800642|hỗ trợ|ho tro/i.test(t) ||
            /t_i_li_u/i.test(t) ||
            l.source_kind === 'pdf'
        );
    });
    console.log('\n=== Root junk to delete ===', rootJunk.length);
    rootJunk.forEach((l) => {
        const f = folderById.get(l.folder_id);
        console.log(JSON.stringify({ id: l.id, subject: f && f.subject, title: l.title }));
    });

    if (!DRY && rootJunk.length) {
        for (const l of rootJunk) {
            await rest(url, key, 'DELETE', `online_lessons?id=eq.${l.id}`);
            console.log('deleted', l.title);
        }
    }

    // --- 2) Relocate shallow videos ---
    const { monName, files } = loadPhysicsCheckpointVideos();
    const index = buildDriveIndex(files, monName);
    console.log('\nPhysics checkpoint videos:', files.length);
    const taskByBunny = await loadTaskByBunnyMap();
    console.log('Local tasks with stream id:', taskByBunny.size);

    const shallow = [];
    for (const l of lessons) {
        const f = folderById.get(l.folder_id);
        if (!f) continue;
        const isVideo = l.source_kind === 'video' || l.video_url || l.source_bunny_video_id;
        if (!isVideo) continue;
        if (depth(f.source_path) > 1) continue;
        // focus physics first (all current shallow are physics); also catch any subject
        shallow.push({
            ...l,
            folder_name: f.name,
            folder_path: f.source_path,
            subject: f.subject,
            course: f.examhub_course_key || 'combo-xps-2027'
        });
    }
    console.log('Shallow videos:', shallow.length);

    const report = { deleted: rootJunk.map((l) => l.id), relocated: [], unmatched: [], errors: [] };

    for (const lesson of shallow) {
        // Prefer physics drive index; for other subjects try same mon folder if path hints
        let driveFile = matchDriveFile(lesson, index, taskByBunny);
        if (!driveFile && lesson.subject !== 'physics') {
            report.unmatched.push({
                id: lesson.id,
                title: lesson.title,
                reason: 'non-physics shallow, skip auto',
                subject: lesson.subject
            });
            continue;
        }
        if (!driveFile) {
            report.unmatched.push({
                id: lesson.id,
                title: lesson.title,
                folder: lesson.folder_name,
                reason: 'no checkpoint match'
            });
            console.warn('UNMATCHED', lesson.title, 'folder=', lesson.folder_name);
            continue;
        }

        // For synthetic task path, relativePath may be full path including mon
        let rawRel = driveFile.relativePath || '';
        if (driveFile.synthetic && !rawRel && driveFile.name) {
            rawRel = '';
        }
        let segs = pathSegmentsFromDrive(
            { relativePath: rawRel || driveFile.relativePath },
            monName
        );
        // If path still includes file name as last segment matching title, drop it
        if (segs.length && norm(segs[segs.length - 1]) === norm(stripQuality(driveFile.name || lesson.title))) {
            segs = segs.slice(0, -1);
        }
        if (segs.length < 2) {
            report.unmatched.push({
                id: lesson.id,
                title: lesson.title,
                reason: 'path still too short after strip',
                segs,
                driveRel: driveFile.relativePath
            });
            console.warn('SHORT PATH', lesson.title, segs, driveFile.relativePath);
            continue;
        }

        // Subject from path when task path is ĐGNL / other mon (don't keep wrong physics tab)
        const detected = detectSubjectFromPath(
            String(driveFile.relativePath || segs.join('/')).split('/').filter(Boolean)
        );
        let subjectDb = lesson.subject === 'toan' ? 'math' : lesson.subject;
        if (detected) subjectDb = detected;
        // If still physics but path is clearly dgnl after strip failure
        if (/hsa|tsa|vact|đánh giá/i.test(segs.join('/')) && subjectDb === 'physics') {
            subjectDb = /tsa/i.test(segs.join('/')) ? 'dgnl_tsa' : 'dgnl_hsa';
        }
        const courseKey = lesson.course || 'combo-xps-2027';
        const targetPath = segs.join('/');

        console.log(
            DRY ? '[dry]' : '[move]',
            lesson.title,
            '\n  from:',
            lesson.folder_path || '(root)',
            '\n  to:  ',
            targetPath
        );

        if (DRY) {
            report.relocated.push({
                id: lesson.id,
                title: lesson.title,
                from: lesson.folder_path,
                to: targetPath,
                driveId: driveFile.id
            });
            continue;
        }

        try {
            const folderId = await ensureFolderChain(url, key, {
                courseKey,
                subject: subjectDb,
                rootName: 'COMBO XPS 2027',
                segments: segs
            });
            await rest(url, key, 'PATCH', `online_lessons?id=eq.${lesson.id}`, {
                folder_id: folderId,
                description: targetPath,
                source_drive_file_id: driveFile.id || lesson.source_drive_file_id || null,
                last_synced_at: new Date().toISOString()
            });
            report.relocated.push({
                id: lesson.id,
                title: lesson.title,
                from: lesson.folder_path,
                to: targetPath,
                folderId,
                driveId: driveFile.id
            });
        } catch (e) {
            report.errors.push({ id: lesson.id, title: lesson.title, error: e.message });
            console.error('ERR', lesson.title, e.message);
        }
    }

    // Delete empty shallow folders (optional, depth 1 under root with 0 lessons)
    if (!DRY) {
        const folders2 = await fetchAll(
            url,
            key,
            'online_folders',
            'id,name,subject,parent_id,source_path'
        );
        const lessons2 = await fetchAll(url, key, 'online_lessons', 'id,folder_id');
        const used = new Set(lessons2.map((l) => l.folder_id));
        let emptyDeleted = 0;
        for (const f of folders2) {
            if (depth(f.source_path) !== 1) continue;
            if (used.has(f.id)) continue;
            // only delete if no children folders
            const kids = folders2.filter((c) => c.parent_id === f.id);
            if (kids.length) continue;
            try {
                await rest(url, key, 'DELETE', `online_folders?id=eq.${f.id}`);
                emptyDeleted++;
                console.log('deleted empty folder', f.subject, f.name);
            } catch (e) {
                /* may fail if FK */
            }
        }
        report.emptyFoldersDeleted = emptyDeleted;
    }

    const outPath = path.join('X:/ECODEx/exam-system/scripts/fix-root-shallow-report.json');
    fs.writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), dry: DRY, ...report }, null, 2));
    console.log('\n=== SUMMARY ===');
    console.log({
        rootJunk: rootJunk.length,
        relocated: report.relocated.length,
        unmatched: report.unmatched.length,
        errors: report.errors.length,
        emptyFoldersDeleted: report.emptyFoldersDeleted || 0
    });
    console.log('wrote', outPath);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
