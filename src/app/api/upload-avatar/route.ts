import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get form data
        const formData = await request.formData()
        const file = formData.get("file") as File

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        // Validate file type
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

        // Get current avatar to delete later
        const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", user.id)
            .single()

        // Generate unique filename
        const fileExt = file.name.split(".").pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = fileName // No "avatars/" prefix - bucket already has it

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, file, {
                contentType: file.type,
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
                // Extract filename from URL (last segment after /)
                const urlParts = profile.avatar_url.split("/")
                const oldFileName = urlParts[urlParts.length - 1]
                await supabase.storage.from("avatars").remove([oldFileName])
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
            // Delete from storage - extract filename from URL
            const urlParts = profile.avatar_url.split("/")
            const fileName = urlParts[urlParts.length - 1]
            await supabase.storage.from("avatars").remove([fileName])

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
