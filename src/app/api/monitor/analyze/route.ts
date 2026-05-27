import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"

const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || "http://127.0.0.1:8000"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    const cleanPythonServerUrl = PYTHON_SERVER_URL.endsWith("/") 
      ? PYTHON_SERVER_URL.slice(0, -1) 
      : PYTHON_SERVER_URL

    // 1. Xác thực người dùng học sinh
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Chưa xác thực người dùng." }, { status: 401 })
    }

    // 2. Phân tích request body
    const body = await request.json()
    const { image_base64, type, student_id } = body as { image_base64: string; type: "register" | "analyze"; student_id?: string }

    if (!image_base64) {
      return NextResponse.json({ error: "Thiếu dữ liệu ảnh base64." }, { status: 400 })
    }

    // Xác định target student_id (để người anh có thể tự đăng ký hộ cho em trai)
    let targetStudentId = user.id
    if (student_id && student_id !== user.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
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
      // 1. Lấy dữ liệu khuôn mặt mẫu gốc của em trai (Dùng adminClient để vượt RLS)
      const { data: registration, error: regError } = await adminClient
        .from("student_face_registrations")
        .select("face_encoding")
        .eq("student_id", user.id)
        .maybeSingle()

      if (regError || !registration) {
        return NextResponse.json({ 
          error: "Chưa đăng ký khuôn mặt mẫu gốc. Vui lòng thiết lập đăng ký khuôn mặt trước." 
        }, { status: 400 })
      }

      const targetEmbedding = JSON.parse(registration.face_encoding) as number[]

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
          dominant_emotion: string
          emotions_chart: Record<string, number>
        }

        let snapshotPath: string | null = null

        // 3. Nếu xảy ra vi phạm (vắng mặt hoặc sai danh tính), tải ảnh làm bằng chứng lên Storage
        if (!data.is_present || !data.is_verified) {
          try {
            const buffer = Buffer.from(image_base64.split(",")[1], "base64")
            const fileName = `${user.id}/${Date.now()}.jpg`
            
            // Upload ảnh lên bucket 'student-snapshots'
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("student-snapshots")
              .upload(fileName, buffer, {
                contentType: "image/jpeg",
                upsert: false
              })

            if (uploadData && !uploadError) {
              // Lấy Public URL để lưu vào log
              const { data: { publicUrl } } = supabase.storage
                .from("student-snapshots")
                .getPublicUrl(fileName)
              snapshotPath = publicUrl
            }
          } catch (storageErr) {
            // Fault Tolerance: Nếu Storage chưa được tạo hoặc lỗi, ta chỉ log DB và bỏ qua upload ảnh
            console.error("Storage upload skipped or failed:", storageErr)
          }
        }

        // 4. Ghi nhận log giám sát khuôn mặt vào Database (Dùng adminClient để vượt RLS)
        const { error: logError } = await adminClient
          .from("face_monitor_logs")
          .insert({
            student_id: user.id,
            is_present: data.is_present,
            is_verified: data.is_verified,
            dominant_emotion: data.dominant_emotion,
            confidence: data.is_present ? 1 - data.cosine_distance : 0.0,
            snapshot_path: snapshotPath
          })

        if (logError) {
          console.error("Lỗi ghi log giám sát khuôn mặt:", logError)
        }

        return NextResponse.json({
          success: true,
          is_present: data.is_present,
          is_verified: data.is_verified,
          dominant_emotion: data.dominant_emotion,
          cosine_distance: data.cosine_distance,
          snapshot_url: snapshotPath
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
