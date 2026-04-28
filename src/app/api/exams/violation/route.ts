import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { exam_id, session_id, action, details } = body

        if (!exam_id || !action) {
            return NextResponse.json({ error: "Missing exam_id or action" }, { status: 400 })
        }

        // Validate action type
        const validActions = [
            "tab_switch",
            "look_away_exceeded",
            "phone_detected",
            "multi_face",
            "webcam_violation",
            "audio_violation",
            "fullscreen_exit",
            "copy_paste",
            "right_click",
        ]
        if (!validActions.includes(action)) {
            return NextResponse.json({ error: "Invalid action type" }, { status: 400 })
        }

        // Rate limit: max 1 violation log per second per student per exam
        const oneSecondAgo = new Date(Date.now() - 1000).toISOString()
        const { count } = await supabase
            .from("submission_audit_log")
            .select("*", { count: "exact", head: true })
            .eq("exam_id", exam_id)
            .eq("student_id", user.id)
            .gte("created_at", oneSecondAgo)

        if ((count ?? 0) > 0) {
            return NextResponse.json({ ok: true, throttled: true })
        }

        const { error } = await supabase.from("submission_audit_log").insert({
            exam_id,
            student_id: user.id,
            action,
            details: {
                ...details,
                session_id,
                user_agent: req.headers.get("user-agent") || null,
            },
            ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
            user_agent: req.headers.get("user-agent") || null,
        })

        if (error) {
            console.error("Audit log insert error:", error)
            // Don't fail the request — violations are non-critical
            return NextResponse.json({ ok: false, error: error.message })
        }

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error("Violation API error:", err)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
