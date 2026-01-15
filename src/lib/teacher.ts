import { createClient } from "@/lib/supabase/client"

// Check if user email is in teacher whitelist
export async function isTeacher(email: string): Promise<boolean> {
    const supabase = createClient()

    const { data } = await supabase
        .from("teacher_whitelist")
        .select("id")
        .eq("email", email)
        .single()

    return !!data
}

// Get teacher whitelist (for admin purposes)
export async function getTeacherWhitelist(): Promise<{ email: string; note: string | null; added_at: string }[]> {
    const supabase = createClient()

    const { data } = await supabase
        .from("teacher_whitelist")
        .select("email, note, added_at")
        .order("added_at", { ascending: false })

    return data || []
}

// Add email to teacher whitelist
export async function addTeacherEmail(email: string, note?: string): Promise<boolean> {
    const supabase = createClient()

    const { error } = await supabase
        .from("teacher_whitelist")
        .insert({ email, note })

    return !error
}
