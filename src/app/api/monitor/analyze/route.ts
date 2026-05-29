import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"

const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || "http://127.0.0.1:8000"

// Model configuration — must match face_server.py
const EXPECTED_EMBEDDING_DIM = 512 // Facenet512

// ===== In-Memory Cache for 10 FPS Surveillance Mode =====
// Avoids hitting Supabase every 100ms — cache embedding for 60s
interface EmbeddingCacheEntry {
  embedding: number[]
  timestamp: number
}
const embeddingCache = new Map<string, EmbeddingCacheEntry>()
const EMBEDDING_CACHE_TTL_MS = 60_000 // 60 seconds

async function getCachedEmbedding(adminClient: any, userId: string): Promise<number[] | null> {
  const cached = embeddingCache.get(userId)
  if (cached && (Date.now() - cached.timestamp) < EMBEDDING_CACHE_TTL_MS) {
    return cached.embedding
  }
  
  const { data: registration, error } = await adminClient
    .from("student_face_registrations")
    .select("face_encoding")
    .eq("student_id", userId)
    .maybeSingle()
  
  if (error || !registration) return null
  
  const embedding = JSON.parse(registration.face_encoding) as number[]
  
  // Model migration: if embedding dimension doesn't match (e.g. Facenet 128→Facenet512 512),
  // delete stale registration so auto-register creates a new one with the correct model
  if (embedding.length !== EXPECTED_EMBEDDING_DIM) {
    console.warn(
      `[MIGRATION] Stale embedding for ${userId}: dim=${embedding.length}, expected=${EXPECTED_EMBEDDING_DIM}. Deleting.`
    )
    await adminClient
      .from("student_face_registrations")
      .delete()
      .eq("student_id", userId)
    embeddingCache.delete(userId)
    return null
  }
  
  embeddingCache.set(userId, { embedding, timestamp: Date.now() })
  return embedding
}

// ===== Debounced DB Logging =====
// Only log when status CHANGES (not every frame at 10 FPS)
interface LastLogState {
  is_present: boolean
  is_verified: boolean
  timestamp: number
}
const lastLogState = new Map<string, LastLogState>()

// ===== Auth Cache for 10 FPS Mode =====
// Avoids calling supabase.auth.getUser() every 100ms
interface AuthCacheEntry {
  userId: string
  timestamp: number
}
const authCache = new Map<string, AuthCacheEntry>()
const AUTH_CACHE_TTL_MS = 30_000 // 30 seconds

// Simple string hash to create unique cache key from full cookie
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0 // Convert to 32-bit integer
  }
  return hash.toString(36)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    const cleanPythonServerUrl = PYTHON_SERVER_URL.endsWith("/") 
      ? PYTHON_SERVER_URL.slice(0, -1) 
      : PYTHON_SERVER_URL

    // 1. Parse request body first (fast, no network)
    const body = await request.json()
    const { image_base64, type, student_id } = body as { image_base64: string; type: "register" | "analyze"; student_id?: string }

    if (!image_base64) {
      return NextResponse.json({ error: "Thiếu dữ liệu ảnh base64." }, { status: 400 })
    }

    // 2. Xác thực người dùng (CACHED for 10 FPS surveillance)
    const authHeader = request.headers.get("cookie") || request.headers.get("authorization") || ""
    const authCacheKey = hashString(authHeader) // Full hash to avoid collisions between users
    let userId: string | null = null

    // For analyze (surveillance): use cache to avoid 100ms auth overhead per frame
    if (type === "analyze" && authCacheKey) {
      const cached = authCache.get(authCacheKey)
      if (cached && (Date.now() - cached.timestamp) < AUTH_CACHE_TTL_MS) {
        userId = cached.userId
      }
    }

    // Cache miss or register request: authenticate fresh
    if (!userId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: "Chưa xác thực người dùng." }, { status: 401 })
      }
      userId = user.id
      // Cache the result
      if (authCacheKey) {
        authCache.set(authCacheKey, { userId: user.id, timestamp: Date.now() })
      }
    }

    // Xác định target student_id (để người anh có thể tự đăng ký hộ cho em trai)
    let targetStudentId = userId
    if (student_id && student_id !== userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single()
      
      if (profile && (profile.role === "teacher" || profile.role === "parent" || profile.role === "admin")) {
        targetStudentId = student_id
      } else {
        return NextResponse.json({ error: "Không có quyền đăng ký khuôn mặt cho học sinh khác." }, { status: 403 })
      }
    }

    // ----------------------------------------------------
    // TRƯỜNG HỢP A: ĐĂNG KÝ KHUÔN MẶT MẪU (FACE REGISTER)
    // ----------------------------------------------------
    if (type === "register") {
      try {
        const response = await fetch(`${cleanPythonServerUrl}/register-face`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ image_base64 })
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          return NextResponse.json({ 
            error: errData.detail || "FastAPI không nhận diện được khuôn mặt chân dung mẫu." 
          }, { status: response.status })
        }

        const data = await response.json()
        const embeddingJsonStr = JSON.stringify(data.embedding)

        // Lưu hoặc cập nhật khuôn mặt gốc của học sinh vào database (Dùng adminClient để vượt RLS)
        const { error: dbError } = await adminClient
          .from("student_face_registrations")
          .upsert({
            student_id: targetStudentId,
            face_encoding: embeddingJsonStr,
            registered_at: new Date().toISOString()
          }, { onConflict: "student_id" })

        if (dbError) {
          console.error("Lỗi lưu DB face registration:", dbError)
          return NextResponse.json({ 
            error: "Không thể lưu vector khuôn mặt vào Database: " + dbError.message 
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: "Đăng ký khuôn mặt mẫu thành công!"
        })

      } catch (err: any) {
        console.error("Lỗi kết nối FastAPI server:", err)
        return NextResponse.json({ 
          error: "Không thể kết nối với AI Python Server (DeepFace). Vui lòng chắc chắn FastAPI đang hoạt động tại cổng 8000." 
        }, { status: 502 })
      }
    }

    // ----------------------------------------------------
    // TRƯỜNG HỢP B: ĐỐI SÁNH & PHÂN TÍCH REALTIME (ANALYZE)
    // ----------------------------------------------------
    if (type === "analyze") {
      // 1. Lấy dữ liệu khuôn mặt mẫu gốc của em trai (CACHED — không gọi DB mỗi frame)
      const targetEmbedding = await getCachedEmbedding(adminClient, userId)

      if (!targetEmbedding) {
        return NextResponse.json({ 
          error: "Chưa đăng ký khuôn mặt mẫu gốc. Vui lòng thiết lập đăng ký khuôn mặt trước." 
        }, { status: 400 })
      }

      try {
        // 2. Gửi snapshot kèm vector gốc sang Python FastAPI
        const response = await fetch(`${cleanPythonServerUrl}/analyze-face`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            image_base64,
            target_embedding: targetEmbedding
          })
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          return NextResponse.json({ 
            error: errData.detail || "Lỗi xử lý AI từ FastAPI." 
          }, { status: response.status })
        }

        const data = await response.json() as {
          is_present: boolean
          is_verified: boolean
          cosine_distance: number
          threshold_used: number
          latency_ms: number
        }

        // 4. Debounced DB Logging — chỉ ghi log khi trạng thái THAY ĐỔI
        const lastState = lastLogState.get(userId)
        const stateChanged = !lastState 
          || lastState.is_present !== data.is_present 
          || lastState.is_verified !== data.is_verified
        
        if (stateChanged) {
          // Upload snapshot chỉ khi vi phạm (vắng mặt hoặc sai danh tính)
          let snapshotPath: string | null = null
          if (!data.is_present || !data.is_verified) {
            try {
              const buffer = Buffer.from(image_base64.split(",")[1], "base64")
              const fileName = `${userId}/${Date.now()}.jpg`
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from("student-snapshots")
                .upload(fileName, buffer, {
                  contentType: "image/jpeg",
                  upsert: false
                })
              if (uploadData && !uploadError) {
                const { data: { publicUrl } } = supabase.storage
                  .from("student-snapshots")
                  .getPublicUrl(fileName)
                snapshotPath = publicUrl
              }
            } catch (storageErr) {
              // Fault Tolerance: skip if storage not available
            }
          }

          // Ghi log vào DB
          const { error: logError } = await adminClient
            .from("face_monitor_logs")
            .insert({
              student_id: userId,
              is_present: data.is_present,
              is_verified: data.is_verified,
              confidence: data.is_present ? 1 - data.cosine_distance : 0.0,
              snapshot_path: snapshotPath
            })

          if (logError) {
            console.error("Lỗi ghi log giám sát khuôn mặt:", logError)
          }

          // Cập nhật trạng thái gần nhất
          lastLogState.set(userId, {
            is_present: data.is_present,
            is_verified: data.is_verified,
            timestamp: Date.now()
          })
        }

        return NextResponse.json({
          success: true,
          is_present: data.is_present,
          is_verified: data.is_verified,
          cosine_distance: data.cosine_distance,
        })

      } catch (err: any) {
        console.error("Lỗi kết nối FastAPI server trong analyze:", err)
        return NextResponse.json({ 
          error: "Không thể kết nối với AI Python Server (DeepFace). Vui lòng chắc chắn FastAPI đang hoạt động tại cổng 8000." 
        }, { status: 502 })
      }
    }

    return NextResponse.json({ error: "Loại yêu cầu không hợp lệ." }, { status: 400 })

  } catch (error: any) {
    console.error("Lỗi xử lý API nhận diện khuôn mặt:", error)
    return NextResponse.json({ error: "Lỗi hệ thống nội bộ: " + error.message }, { status: 500 })
  }
}
