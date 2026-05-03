import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimiters, getClientIP, rateLimitResponse } from '@/lib/rate-limit'

// Type definitions
type TFStudentAnswer = { question: number; a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }
type SAStudentAnswer = { question: number; answer: string }

interface SyncDraftRequest {
    session_id: string
    mc_answers?: (string | null)[]
    tf_answers?: TFStudentAnswer[]
    sa_answers?: SAStudentAnswer[]
    time_spent: number
    cheat_flags?: {
        tab_switches: number
        multi_browser: boolean
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const clientIP = getClientIP(request)

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 🔒 RATE LIMITING - Check sync rate
        const rateLimitResult = rateLimiters.syncDraft(user.id)
        if (!rateLimitResult.success) {
            return rateLimitResponse(rateLimitResult)
        }
        
        // Parse request body
        const body: SyncDraftRequest = await request.json()
        const { session_id, mc_answers, tf_answers, sa_answers, time_spent, cheat_flags } = body

        if (!session_id) {
            return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
        }

        // Validate session belongs to user and is in_progress
        const { data: session, error: sessionError } = await supabase
            .from('exam_sessions')
            .select('id, student_id, status')
            .eq('id', session_id)
            .single()

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }

        if (session.student_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        if (session.status !== 'in_progress') {
            return NextResponse.json({ error: 'Session is not active' }, { status: 400 })
        }

        // Build snapshot object
        const answers_snapshot = {
            mc: mc_answers,
            tf: tf_answers,
            sa: sa_answers
        }

        // 🛡️ ANTI-CHEAT: Only update tab_switch_count if provided in this request
        const updateData: any = {
            answers_snapshot,
            time_spent: time_spent || 0,
            updated_at: new Date().toISOString()
        }

        if (cheat_flags?.tab_switches !== undefined) {
            updateData.tab_switch_count = cheat_flags.tab_switches
        }

        // Update the session with the latest snapshot
        const { error: updateError } = await supabase
            .from('exam_sessions')
            .update(updateData)
            .eq('id', session_id)

        if (updateError) {
            console.error('Failed to sync draft:', updateError)
            return NextResponse.json({ error: 'Failed to sync draft' }, { status: 500 })
        }

        return NextResponse.json({ success: true, timestamp: new Date().toISOString() })

    } catch (error) {
        console.error('Sync draft API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
