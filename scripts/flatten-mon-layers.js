'use strict';

/**
 * Remove intermediate mon-package folders that duplicate teacher courses at subject root.
 *
 * Bad:  COMBO / 01. MÔN TOÁN 2009 / TOÁN THẦY X / ...
 * Good: COMBO / TOÁN THẦY X / ...
 *
 * KHXH: children of 07. go to history vs geography by name (Sử/Địa).
 *
 * node scripts/flatten-mon-layers.js [--dry-run]
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

function isMonPackageName(name) {
    const n = String(name || '');
    return (
        /^0?[1-6]\.\s*m[oô]n\b/i.test(n) ||
        /^0?7\.\s*khoa\s*h[oọ]c\s*x[aã]\s*h[oộ]i/i.test(n) ||
        /^0?8\.\s*combo\s*đ[aá]nh\s*gi[aá]/i.test(n) ||
        /^📚/.test(n)
    );
}

function khxhChildSubject(name) {
    const n = String(name || '');
    if (/^s[uử]\s*c[oô]|l[iị]ch\s*s[uử]/i.test(n)) return 'history';
    if (/^đ[iị]a\s*(l[yý]|c[oô]|th[aầ]y)|đ[iị]a\s*l[yý]/i.test(n)) return 'geography';
    if (/ktpl|ph[aá]p\s*lu[aậ]t|kinh\s*t[eế]/i.test(n)) return 'civic_education';
    // default stay with parent subject when ambiguous
    return null;
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

function collectSubtree(id, byParent) {
    const out = [id];
    for (const k of byParent.get(id) || []) out.push(...collectSubtree(k.id, byParent));
    return out;
}

function stripPrefix(sourcePath, monPath) {
    const sp = String(sourcePath || '');
    const mp = String(monPath || '');
    if (!mp) return sp;
    if (sp === mp) return '';
    if (sp.startsWith(mp + '/')) return sp.slice(mp.length + 1);
    return sp;
}

/**
 * Recursively merge source folder into target folder (same logical course).
 * Moves lessons; merges children by name; deletes empty source nodes.
 */
async function mergeFolderInto(url, key, sourceId, targetId, folderById, byParent, report, monPathPrefix) {
    const source = folderById.get(sourceId);
    const target = folderById.get(targetId);
    if (!source || !target) return;

    // Move all lessons from source → target
    const lessons = await rest(
        url,
        key,
        'GET',
        `online_lessons?folder_id=eq.${sourceId}&select=id`
    );
    const lessonRows = Array.isArray(lessons) ? lessons : [];
    for (const l of lessonRows) {
        if (!DRY) {
            await rest(url, key, 'PATCH', `online_lessons?id=eq.${l.id}`, {
                folder_id: targetId
            });
        }
        report.lessonsMoved++;
    }

    // Merge children by normalized name
    const sourceKids = [...(byParent.get(sourceId) || [])];
    const targetKids = byParent.get(targetId) || [];
    for (const sk of sourceKids) {
        const match = targetKids.find((t) => norm(t.name) === norm(sk.name));
        if (match) {
            await mergeFolderInto(url, key, sk.id, match.id, folderById, byParent, report, monPathPrefix);
        } else {
            // Reparent child under target, fix source_path
            const newPath = stripPrefix(sk.source_path, monPathPrefix);
            // Prefer path under target: target.source_path + / + name
            const base = target.source_path ? `${target.source_path}/${sk.name}` : sk.name;
            const finalPath = newPath && newPath.endsWith(sk.name) ? newPath : base;
            console.log(
                DRY ? '[dry-lift]' : '[lift]',
                sk.source_path,
                '→ under',
                target.source_path || target.name,
                'as',
                finalPath
            );
            if (!DRY) {
                await rest(url, key, 'PATCH', `online_folders?id=eq.${sk.id}`, {
                    parent_id: targetId,
                    subject: target.subject,
                    source_path: finalPath
                });
                // Fix all descendants source_path + subject
                const sub = collectSubtree(sk.id, byParent).filter((id) => id !== sk.id);
                for (const did of sub) {
                    const d = folderById.get(did);
                    if (!d) continue;
                    const dsp = stripPrefix(d.source_path, monPathPrefix);
                    const fixed =
                        dsp ||
                        (target.source_path
                            ? `${target.source_path}/${d.source_path.split('/').slice(-1)[0]}`
                            : d.source_path);
                    await rest(url, key, 'PATCH', `online_folders?id=eq.${did}`, {
                        subject: target.subject,
                        source_path: dsp.startsWith(finalPath) ? dsp : fixed
                    });
                }
            }
            report.foldersLifted++;
        }
    }

    // Delete source if no kids left (after merge)
    if (!DRY) {
        // re-check kids
        const stillKids = await rest(
            url,
            key,
            'GET',
            `online_folders?parent_id=eq.${sourceId}&select=id&limit=5`
        );
        const stillLessons = await rest(
            url,
            key,
            'GET',
            `online_lessons?folder_id=eq.${sourceId}&select=id&limit=5`
        );
        if (
            (!Array.isArray(stillKids) || stillKids.length === 0) &&
            (!Array.isArray(stillLessons) || stillLessons.length === 0)
        ) {
            await rest(url, key, 'DELETE', `online_folders?id=eq.${sourceId}`);
            report.foldersDeleted++;
            console.log('[del]', source.source_path || source.name);
        }
    } else {
        report.foldersDeleted++;
    }
}

/**
 * Lift a mon-child teacher folder to subject root (or merge if exists).
 */
async function promoteMonChild(
    url,
    key,
    monFolder,
    child,
    subjectRootId,
    rootChildrenByName,
    folderById,
    byParent,
    targetSubject,
    report
) {
    const monPath = monFolder.source_path || monFolder.name;
    const existing = rootChildrenByName.get(norm(child.name));

    if (existing && existing.id !== child.id) {
        console.log(
            DRY ? '[dry-merge]' : '[merge]',
            monPath + '/' + child.name,
            '→ root',
            existing.name,
            `(subject ${targetSubject})`
        );
        await mergeFolderInto(
            url,
            key,
            child.id,
            existing.id,
            folderById,
            byParent,
            report,
            monPath
        );
        return;
    }

    // Lift: reparent to subject root, strip mon prefix from paths
    const newPath = child.name; // depth-1 under COMBO
    console.log(DRY ? '[dry-promote]' : '[promote]', monPath + '/' + child.name, '→', newPath, targetSubject);

    if (!DRY) {
        const rootId =
            targetSubject === monFolder.subject
                ? subjectRootId
                : await ensureRoot(url, key, monFolder.examhub_course_key || 'combo-xps-2027', targetSubject);

        await rest(url, key, 'PATCH', `online_folders?id=eq.${child.id}`, {
            parent_id: rootId,
            subject: targetSubject,
            source_path: newPath
        });

        const sub = collectSubtree(child.id, byParent).filter((id) => id !== child.id);
        for (const did of sub) {
            const d = folderById.get(did);
            if (!d) continue;
            const restPath = stripPrefix(d.source_path, monPath);
            // restPath should be like "TOÁN THẦY X/a/b" or "a/b" if monPath was mon only
            let fixed = restPath;
            if (restPath.startsWith(child.name + '/')) {
                fixed = restPath; // already includes teacher name
            } else if (!restPath.startsWith(child.name)) {
                // was mon/teacher/rest → strip mon → teacher/rest; if only rest, prepend teacher
                if (d.source_path.includes(child.name + '/')) {
                    const idx = d.source_path.indexOf(child.name + '/');
                    fixed = d.source_path.slice(idx);
                } else {
                    fixed = newPath + (restPath ? '/' + restPath.split('/').slice(1).join('/') : '');
                    // simpler: replace monPath/ with ''
                    fixed = stripPrefix(d.source_path, monPath);
                }
            }
            await rest(url, key, 'PATCH', `online_folders?id=eq.${did}`, {
                subject: targetSubject,
                source_path: fixed
            });
        }
    }
    report.foldersPromoted++;
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
    const byParent = new Map();
    for (const f of folders) {
        const p = f.parent_id || 'ROOT';
        if (!byParent.has(p)) byParent.set(p, []);
        byParent.get(p).push(f);
    }
    const folderById = new Map(folders.map((f) => [f.id, f]));

    const report = {
        lessonsMoved: 0,
        foldersLifted: 0,
        foldersPromoted: 0,
        foldersDeleted: 0,
        monProcessed: []
    };

    // Subject roots
    const roots = folders.filter((f) => !f.parent_id || f.source_path === '');

    for (const root of roots) {
        const kids = byParent.get(root.id) || [];
        const monLayers = kids.filter((k) => isMonPackageName(k.name));
        if (!monLayers.length) continue;

        const rootChildrenByName = new Map();
        for (const k of kids) {
            if (!isMonPackageName(k.name)) rootChildrenByName.set(norm(k.name), k);
        }

        for (const mon of monLayers) {
            // Skip empty 08 under toan if no kids
            const monKids = byParent.get(mon.id) || [];
            console.log(
                `\n== mon layer ${root.subject} / ${mon.name} kids=${monKids.length}`
            );
            report.monProcessed.push({
                subject: root.subject,
                mon: mon.name,
                kids: monKids.length
            });

            // Special: drive package 📚 under toan — promote mon children only, delete 📚 if empty
            // Special: KHXH 07 — each child goes to history/geography
            const isKhxh = /^0?7\.\s*khoa\s*h[oọ]c\s*x[aã]\s*h[oộ]i/i.test(mon.name);
            const isDriveRoot = /^📚/.test(mon.name);
            const isDgnlPack = /^0?8\.\s*combo/i.test(mon.name);

            if (isDgnlPack && monKids.length === 0) {
                // empty leftover — delete
                if (!DRY) {
                    try {
                        await rest(url, key, 'DELETE', `online_folders?id=eq.${mon.id}`);
                        report.foldersDeleted++;
                        console.log('[del empty mon]', mon.name);
                    } catch (e) {
                        console.warn('cannot del', mon.name, e.message);
                    }
                }
                continue;
            }

            if (isDriveRoot) {
                // Promote nested mon packages' children recursively later; first lift mon packages
                for (const nested of monKids) {
                    if (isMonPackageName(nested.name)) {
                        // process nested mon under drive root: treat as mon layer under same subject root
                        const nestedKids = byParent.get(nested.id) || [];
                        for (const child of nestedKids) {
                            let targetSubject = root.subject;
                            if (/^0?7\./i.test(nested.name)) {
                                targetSubject = khxhChildSubject(child.name) || 'history';
                            } else if (/^0?1\./i.test(nested.name)) targetSubject = 'math';
                            else if (/^0?2\./i.test(nested.name)) targetSubject = 'physics';
                            else if (/^0?3\./i.test(nested.name)) targetSubject = 'chemistry';
                            else if (/^0?4\./i.test(nested.name)) targetSubject = 'biology';
                            else if (/^0?5\./i.test(nested.name)) targetSubject = 'english';
                            else if (/^0?6\./i.test(nested.name)) targetSubject = 'literature';
                            else if (/^0?8\./i.test(nested.name)) {
                                // leave dgnl structure — promote child as-is to correct dgnl subject
                                const det = child.name;
                                if (/hsa/i.test(det)) targetSubject = 'dgnl_hsa';
                                else if (/tsa/i.test(det)) targetSubject = 'dgnl_tsa';
                                else if (/v-?act|vatc/i.test(det)) targetSubject = 'dgnl_vact';
                                else targetSubject = 'dgnl_hsa';
                            }
                            const targetRootId = await (async () => {
                                if (targetSubject === root.subject) return root.id;
                                return ensureRoot(
                                    url,
                                    key,
                                    mon.examhub_course_key || 'combo-xps-2027',
                                    targetSubject
                                );
                            })();
                            // Build name map for target subject root
                            const tKids =
                                (await (async () => {
                                    if (DRY) return rootChildrenByName;
                                    // use current
                                    return rootChildrenByName;
                                })()) || rootChildrenByName;
                            // If target different subject, find siblings on that root from folders list
                            let nameMap = rootChildrenByName;
                            if (targetSubject !== root.subject) {
                                nameMap = new Map();
                                const tRoot = folders.find(
                                    (f) =>
                                        f.subject === targetSubject &&
                                        (!f.parent_id || f.source_path === '')
                                );
                                if (tRoot) {
                                    for (const c of byParent.get(tRoot.id) || []) {
                                        if (!isMonPackageName(c.name)) nameMap.set(norm(c.name), c);
                                    }
                                }
                            }
                            await promoteMonChild(
                                url,
                                key,
                                nested,
                                child,
                                targetRootId,
                                nameMap,
                                folderById,
                                byParent,
                                targetSubject,
                                report
                            );
                        }
                        // delete nested mon if empty
                        if (!DRY) {
                            const still = await rest(
                                url,
                                key,
                                'GET',
                                `online_folders?parent_id=eq.${nested.id}&select=id&limit=3`
                            );
                            if (!Array.isArray(still) || still.length === 0) {
                                try {
                                    await rest(url, key, 'DELETE', `online_folders?id=eq.${nested.id}`);
                                    report.foldersDeleted++;
                                } catch (e) {
                                    /* ignore */
                                }
                            }
                        }
                    }
                }
                // delete drive root if empty
                if (!DRY) {
                    const still = await rest(
                        url,
                        key,
                        'GET',
                        `online_folders?parent_id=eq.${mon.id}&select=id&limit=3`
                    );
                    if (!Array.isArray(still) || still.length === 0) {
                        try {
                            await rest(url, key, 'DELETE', `online_folders?id=eq.${mon.id}`);
                            report.foldersDeleted++;
                            console.log('[del drive package]', mon.name.slice(0, 40));
                        } catch (e) {
                            /* ignore */
                        }
                    }
                }
                continue;
            }

            // Normal mon 01-07
            for (const child of monKids) {
                let targetSubject = root.subject;
                if (isKhxh) {
                    targetSubject = khxhChildSubject(child.name) || 'history';
                }

                let nameMap = rootChildrenByName;
                let subjectRootId = root.id;
                if (targetSubject !== root.subject) {
                    subjectRootId = await ensureRoot(
                        url,
                        key,
                        mon.examhub_course_key || 'combo-xps-2027',
                        targetSubject
                    );
                    nameMap = new Map();
                    const tRoot = folders.find(
                        (f) =>
                            f.subject === targetSubject &&
                            (!f.parent_id || f.source_path === '')
                    );
                    if (tRoot) {
                        for (const c of byParent.get(tRoot.id) || []) {
                            if (!isMonPackageName(c.name)) nameMap.set(norm(c.name), c);
                        }
                    }
                }

                await promoteMonChild(
                    url,
                    key,
                    mon,
                    child,
                    subjectRootId,
                    nameMap,
                    folderById,
                    byParent,
                    targetSubject,
                    report
                );
            }

            // Delete mon layer if empty
            if (!DRY) {
                const still = await rest(
                    url,
                    key,
                    'GET',
                    `online_folders?parent_id=eq.${mon.id}&select=id&limit=3`
                );
                const stillLessons = await rest(
                    url,
                    key,
                    'GET',
                    `online_lessons?folder_id=eq.${mon.id}&select=id&limit=3`
                );
                if (
                    (!Array.isArray(still) || still.length === 0) &&
                    (!Array.isArray(stillLessons) || stillLessons.length === 0)
                ) {
                    try {
                        await rest(url, key, 'DELETE', `online_folders?id=eq.${mon.id}`);
                        report.foldersDeleted++;
                        console.log('[del mon layer]', mon.subject, mon.name);
                    } catch (e) {
                        console.warn('cannot delete mon', mon.name, e.message);
                    }
                }
            } else {
                console.log('[dry] would delete mon layer if empty:', mon.name);
                report.foldersDeleted++;
            }
        }
    }

    // Final: SỬ CÔ still under dgnl_vact depth1 → history
    folders = await fetchAll(
        url,
        key,
        'online_folders',
        'id,name,subject,parent_id,source_path,examhub_course_key'
    );
    for (const f of folders) {
        if (f.subject === 'dgnl_vact' && /^s[uử]\s*c[oô]/i.test(f.name || '')) {
            console.log(DRY ? '[dry]' : '[fix]', 'SỬ still on vact → history', f.name);
            if (!DRY) {
                const histRoot = await ensureRoot(
                    url,
                    key,
                    f.examhub_course_key || 'combo-xps-2027',
                    'history'
                );
                // merge or promote
                const byP = new Map();
                for (const x of folders) {
                    const p = x.parent_id || 'ROOT';
                    if (!byP.has(p)) byP.set(p, []);
                    byP.get(p).push(x);
                }
                const histKids = folders.filter(
                    (x) => x.parent_id === histRoot && norm(x.name) === norm(f.name)
                );
                const folderById2 = new Map(folders.map((x) => [x.id, x]));
                if (histKids[0]) {
                    await mergeFolderInto(
                        url,
                        key,
                        f.id,
                        histKids[0].id,
                        folderById2,
                        byP,
                        report,
                        f.source_path
                    );
                } else {
                    await rest(url, key, 'PATCH', `online_folders?id=eq.${f.id}`, {
                        parent_id: histRoot,
                        subject: 'history',
                        source_path: f.name
                    });
                    for (const did of collectSubtree(f.id, byP).filter((id) => id !== f.id)) {
                        const d = folderById2.get(did);
                        if (!d) continue;
                        await rest(url, key, 'PATCH', `online_folders?id=eq.${did}`, {
                            subject: 'history'
                        });
                    }
                }
            }
        }
    }

    const out = path.join('X:/ECODEx/exam-system/scripts/flatten-mon-layers-report.json');
    fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), dry: DRY, ...report }, null, 2));
    console.log('\n=== SUMMARY ===', report);
    console.log('wrote', out);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
