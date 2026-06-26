import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const serverSupabase = await createServerClient()
    const { data: { user } } = await serverSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    const { token } = await req.json()
    if (!token || typeof token !== "string" || token.trim().length !== 8) {
      return NextResponse.json({ error: "Mã xác thực không hợp lệ. Vui lòng nhập đúng 8 ký tự." }, { status: 400 })
    }

    const uppercaseToken = token.trim().toUpperCase()

    // 1. Find a valid link token
    const { data: linkToken, error: tokenError } = await supabaseAdmin
      .from("discord_link_tokens")
      .select("*")
      .eq("token", uppercaseToken)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (tokenError || !linkToken) {
      return NextResponse.json({ error: "Mã xác thực không đúng hoặc đã hết hạn (10 phút)." }, { status: 400 })
    }

    // 2. Update the student's profile in Supabase using admin client
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        discord_id: linkToken.discord_id,
        discord_username: linkToken.discord_username,
        discord_linked_at: new Date().toISOString()
      })
      .eq("id", user.id)

    if (profileError) {
      console.error("Error linking discord in profile:", profileError)
      return NextResponse.json({ error: "Lỗi hệ thống khi cập nhật hồ sơ: " + profileError.message }, { status: 500 })
    }

    // 3. Mark the token as used
    await supabaseAdmin
      .from("discord_link_tokens")
      .update({ used: true })
      .eq("id", linkToken.id)

    return NextResponse.json({
      success: true,
      message: "Liên kết tài khoản Discord thành công!",
      discord_username: linkToken.discord_username,
      discord_id: linkToken.discord_id
    })
  } catch (err) {
    console.error("Link account error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
