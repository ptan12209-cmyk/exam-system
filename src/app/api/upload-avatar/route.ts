import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/rate-limit"

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

/** Sniff magic bytes — never trust the client-supplied Content-Type. */
function sniffImageType(bytes: Uint8Array): string | null {
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png"
    if (bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp"
    return null
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // 🔒 Rate limit uploads
        const { allowed } = await checkRateLimit(`avatar:${user.id}`, 5, 300)
        if (!allowed) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429 })
        }

        // Get form data
        const formData = await request.formData()
        const file = formData.get("file") as File

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        // Validate declared type (fast reject)
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({
                error: "Invalid file type. Only JPG, PNG, and WebP are allowed."
            }, { status: 400 })
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({
                error: "File too large. Maximum size is 2MB."
            }, { status: 400 })
        }

        // Verify real content type via magic bytes
        const buffer = new Uint8Array(await file.arrayBuffer())
        const sniffed = sniffImageType(buffer)
        if (!sniffed || !ALLOWED_TYPES.includes(sniffed)) {
            return NextResponse.json({
                error: "Invalid file content. Only JPG, PNG, and WebP are allowed."
            }, { status: 400 })
        }

        // Get current avatar to delete later
        const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", user.id)
            .single()

        // Store inside the user's own folder — storage policies scope by it.
        const fileExt = sniffed === "image/jpeg" ? "jpg" : sniffed.split("/")[1]
        const filePath = `${user.id}/${Date.now()}.${fileExt}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, file, {
                contentType: sniffed,
                upsert: false
            })

        if (uploadError) {
            console.error("Upload error:", uploadError)
            return NextResponse.json({
                error: "Failed to upload file"
            }, { status: 500 })
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath)

        // Update profile with new avatar URL
        const { error: updateError } = await supabase
            .from("profiles")
            .update({ avatar_url: publicUrl })
            .eq("id", user.id)

        if (updateError) {
            console.error("Profile update error:", updateError)
            // Try to delete uploaded file if profile update fails
            await supabase.storage.from("avatars").remove([filePath])
            return NextResponse.json({
                error: "Failed to update profile"
            }, { status: 500 })
        }

        // Delete old avatar if exists
        if (profile?.avatar_url) {
            try {
                // Extract object path: /object/public/avatars/<path>
                const match = profile.avatar_url.match(/\/object\/(?:public|signed)\/avatars\/(.+)$/)
                if (match) {
                    await supabase.storage.from("avatars").remove([decodeURIComponent(match[1])])
                }
            } catch (e) {
                console.error("Failed to delete old avatar:", e)
                // Non-critical, continue
            }
        }

        return NextResponse.json({
            url: publicUrl,
            message: "Avatar uploaded successfully"
        })

    } catch (error) {
        console.error("Avatar upload error:", error)
        return NextResponse.json({
            error: "Internal server error"
        }, { status: 500 })
    }
}

// DELETE endpoint to remove avatar
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get current avatar
        const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", user.id)
            .single()

        if (profile?.avatar_url) {
            // Delete from storage - extract object path from the URL
            const match = profile.avatar_url.match(/\/object\/(?:public|signed)\/avatars\/(.+)$/)
            if (match) {
                await supabase.storage.from("avatars").remove([decodeURIComponent(match[1])])
            }

            // Update profile
            await supabase
                .from("profiles")
                .update({ avatar_url: null })
                .eq("id", user.id)
        }

        return NextResponse.json({ message: "Avatar removed successfully" })

    } catch (error) {
        console.error("Avatar delete error:", error)
        return NextResponse.json({
            error: "Internal server error"
        }, { status: 500 })
    }
}
