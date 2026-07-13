"use client"

import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2, Search, Sliders, Smartphone, UserPlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { ONLINE_SUBJECTS, getOnlineSubjectInfo } from "@/lib/subjects"
import type { StudentProfile } from "./types"

function SubjectLabelsDisplay({ subjects }: { subjects: string[] }) {
  if (subjects.includes("all")) {
    return <span className="text-[var(--os-accent)] font-bold">Tất cả các môn</span>
  }
  if (subjects.length === 0) {
    return <span className="text-[var(--os-muted)] italic">Chưa cấp quyền môn nào</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {subjects.map((s) => {
        const info = getOnlineSubjectInfo(s)
        return (
          <span
            key={s}
            className="px-1.5 py-0.5 rounded bg-[var(--os-bg)] border border-[var(--os-muted)]/20 text-[10px] text-[var(--os-fg)] font-mono"
          >
            {info.icon} {info.label.split(" ")[0]}
          </span>
        )
      })}
    </div>
  )
}

/**
 * Tab: list students, grant subjects, create account, reset device.
 * Self-contained — owns fetch + modals (no shared activeModal with lectures).
 */
export function StudentPermissionsPanel({ active }: { active: boolean }) {
  const { success, error: toastError } = useToast()

  const [students, setStudents] = useState<StudentProfile[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [searchStudentQuery, setSearchStudentQuery] = useState("")

  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null)
  const [tempSelectedSubjects, setTempSelectedSubjects] = useState<string[]>([])
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [isCreateStudentOpen, setIsCreateStudentOpen] = useState(false)
  const [newStudentName, setNewStudentName] = useState("")
  const [newStudentEmail, setNewStudentEmail] = useState("")
  const [newStudentPassword, setNewStudentPassword] = useState("")
  const [newStudentClass, setNewStudentClass] = useState("")
  const [creatingStudent, setCreatingStudent] = useState(false)

  const fetchStudents = useCallback(
    async (query = "") => {
      setLoadingStudents(true)
      try {
        const res = await fetch(
          `/api/online-study/assign-role?search=${encodeURIComponent(query)}`
        )
        const data = await res.json()
        if (res.ok && data.success) {
          setStudents(data.data || [])
        }
      } catch (err) {
        console.error(err)
        toastError("Không thể tải danh sách học sinh.")
      } finally {
        setLoadingStudents(false)
      }
    },
    [toastError]
  )

  useEffect(() => {
    if (active) fetchStudents(searchStudentQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload when tab becomes active
  }, [active])

  const handleStudentSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchStudents(searchStudentQuery)
  }

  const resetStudentDevice = async (student: StudentProfile) => {
    if (
      !confirm(
        `Reset thiết bị của ${student.full_name || student.email}?\nHọc viên có thể đăng nhập máy mới (máy cũ sẽ bị đá khi vào lại).`
      )
    ) {
      return
    }
    try {
      const res = await fetch("/api/auth/device/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: student.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toastError(data?.error?.message || "Reset thiết bị thất bại")
        return
      }
      success("Đã reset thiết bị — học viên đăng nhập lại trên máy mới được.")
    } catch {
      toastError("Lỗi kết nối khi reset thiết bị")
    }
  }

  const openPermissionsModal = (student: StudentProfile) => {
    setSelectedStudent(student)
    setTempSelectedSubjects(student.online_subjects || [])
    setFormError(null)
    setPermissionsOpen(true)
  }

  const closePermissionsModal = () => {
    setPermissionsOpen(false)
    setSelectedStudent(null)
    setTempSelectedSubjects([])
    setFormError(null)
  }

  const handleToggleSubjectCheckbox = (value: string) => {
    if (value === "all") {
      setTempSelectedSubjects((prev) => (prev.includes("all") ? [] : ["all"]))
      return
    }
    setTempSelectedSubjects((prev) => {
      let next = prev.filter((s) => s !== "all")
      if (next.includes(value)) next = next.filter((s) => s !== value)
      else next = [...next, value]
      return next
    })
  }

  const handlePermissionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch("/api/online-study/assign-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          subjects: tempSelectedSubjects,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật quyền")

      success("Đã cập nhật quyền môn học online thành công!")
      setStudents((prev) =>
        prev.map((s) =>
          s.id === selectedStudent.id
            ? {
                ...s,
                online_subjects: tempSelectedSubjects,
                role: tempSelectedSubjects.length > 0 ? "online_student" : "student",
              }
            : s
        )
      )
      closePermissionsModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Lỗi xử lý đổi quyền")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStudentName.trim() || !newStudentEmail.trim() || !newStudentPassword.trim()) {
      toastError("Vui lòng nhập đầy đủ Họ tên, Email và Mật khẩu.")
      return
    }
    setCreatingStudent(true)
    try {
      const res = await fetch("/api/online-study/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newStudentEmail.trim(),
          fullName: newStudentName.trim(),
          password: newStudentPassword.trim(),
          studentClass: newStudentClass.trim() || null,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        success("Đã cấp tài khoản học viên trực tiếp thành công!")
        setIsCreateStudentOpen(false)
        setNewStudentName("")
        setNewStudentEmail("")
        setNewStudentPassword("")
        setNewStudentClass("")
        fetchStudents(searchStudentQuery)
      } else {
        throw new Error(data.error || "Lỗi tạo tài khoản")
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Tạo tài khoản thất bại.")
    } finally {
      setCreatingStudent(false)
    }
  }

  if (!active) return null

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <form
            onSubmit={handleStudentSearchSubmit}
            className="flex-1 flex items-center gap-2 rounded-xl border border-[var(--os-muted)]/20 bg-[var(--os-card)]/30 px-3 py-2 w-full"
            role="search"
            aria-label="Tìm học viên"
          >
            <Search className="h-4 w-4 text-[var(--os-muted)]" aria-hidden />
            <label htmlFor="student-search" className="sr-only">
              Tìm học sinh theo tên hoặc email
            </label>
            <input
              id="student-search"
              value={searchStudentQuery}
              onChange={(e) => setSearchStudentQuery(e.target.value)}
              placeholder="Tìm học sinh theo tên hoặc email..."
              className="bg-transparent text-sm w-full outline-none text-[var(--os-fg)] placeholder-[var(--os-muted)] h-9"
            />
            <Button
              type="submit"
              size="sm"
              className="rounded-lg bg-[var(--os-accent)] text-[var(--os-accent-fg)] hover:bg-[var(--os-accent)]/90 text-xs font-bold px-4 h-9 shrink-0"
            >
              Tìm kiếm
            </Button>
          </form>
          <Button
            onClick={() => setIsCreateStudentOpen(true)}
            className="w-full sm:w-auto rounded-xl bg-[var(--os-accent)] text-[var(--os-accent-fg)] hover:bg-[var(--os-accent)]/90 text-xs font-bold px-4 py-2.5 flex items-center justify-center gap-1.5 transition-transform active:scale-95 shrink-0"
          >
            <UserPlus className="h-4 w-4" /> Cấp tài khoản mới
          </Button>
        </div>

        <div className="rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)]/10 overflow-hidden">
          <div className="p-4 border-b border-[var(--os-muted)]/20 bg-[var(--os-card)]/50 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--os-muted)] font-mono">
              Cấp quyền học trực tuyến
            </span>
            <span className="text-[10px] bg-[var(--os-bg)] px-2 py-0.5 rounded border border-[var(--os-muted)]/20 text-[var(--os-muted)] font-mono">
              {students.length} học viên
            </span>
          </div>

          {loadingStudents ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--os-accent)]" />
              <p className="mt-2 text-xs text-[var(--os-muted)]">Đang tải học sinh...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-20 text-sm text-[var(--os-muted)] italic">
              Không tìm thấy học sinh nào.
            </div>
          ) : (
            <div className="divide-y divide-[var(--os-muted)]/10 bg-[var(--os-card)]/20">
              {students.map((student) => {
                const isOnline =
                  student.online_subjects && student.online_subjects.length > 0
                return (
                  <div
                    key={student.id}
                    className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-[var(--os-card)]/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                          isOnline
                            ? "border-[var(--os-accent)]/50 bg-[var(--os-accent)]/10 text-[var(--os-accent)]"
                            : "border-[var(--os-muted)]/30 bg-[var(--os-bg)] text-[var(--os-muted)]"
                        }`}
                      >
                        {student.full_name?.[0]?.toUpperCase() || "H"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[var(--os-fg)] truncate">
                            {student.full_name || "Chưa đặt tên"}
                          </h4>
                          {student.class && (
                            <span className="rounded bg-[var(--os-bg)] border border-[var(--os-muted)]/20 px-1.5 py-0.5 text-[9px] font-bold text-[var(--os-muted)] font-mono shrink-0">
                              {student.class}
                            </span>
                          )}
                          <span className="rounded bg-[var(--os-accent)]/10 border border-[var(--os-accent)]/20 px-1.5 py-0.5 text-[9px] font-bold text-[var(--os-accent)] font-mono shrink-0">
                            Đã học: {student.progress_percent || 0}%
                          </span>
                        </div>
                        <p className="text-xs text-[var(--os-muted)] mt-0.5 truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 px-0 sm:px-6 max-w-md">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--os-muted)] font-mono mb-1">
                        Môn học trực tuyến được cấp
                      </div>
                      <SubjectLabelsDisplay subjects={student.online_subjects || []} />
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void resetStudentDevice(student)}
                        className="rounded-xl font-bold text-xs py-1.5 px-3 border-[var(--os-muted)]/30 text-[var(--os-fg)] flex items-center gap-1.5"
                        title="Cho phép học viên đăng nhập thiết bị mới"
                      >
                        <Smartphone className="h-3.5 w-3.5" /> Reset TB
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openPermissionsModal(student)}
                        className="rounded-xl font-bold text-xs py-1.5 px-4 bg-[var(--os-accent)] text-[var(--os-accent-fg)] hover:bg-[var(--os-accent)]/90 flex items-center gap-1.5 transition-transform active:scale-95"
                      >
                        <Sliders className="h-3.5 w-3.5" /> Điều chỉnh quyền
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create student modal */}
      <AnimatePresence>
        {isCreateStudentOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[var(--os-bg)]/80 backdrop-blur-sm"
              onClick={() => setIsCreateStudentOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] p-6 shadow-2xl z-10"
            >
              <button
                onClick={() => setIsCreateStudentOpen(false)}
                className="absolute right-4 top-4 text-[var(--os-muted)] hover:text-[var(--os-fg)]"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-[var(--os-fg)] mb-4 font-mono uppercase tracking-wide text-sm">
                Cấp Tài Khoản Học Viên Mới
              </h3>
              <form onSubmit={handleCreateStudentSubmit} className="space-y-4 text-left">
                <div>
                  <Label className="text-xs text-[var(--os-muted)] font-mono">
                    Họ và tên học viên
                  </Label>
                  <Input
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="mt-1 bg-[var(--os-bg)] border-[var(--os-muted)]/25 focus:ring-[var(--os-accent)] text-[var(--os-fg)]"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs text-[var(--os-muted)] font-mono">
                    Email đăng nhập
                  </Label>
                  <Input
                    type="email"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    placeholder="VD: nguyenvana@gmail.com"
                    className="mt-1 bg-[var(--os-bg)] border-[var(--os-muted)]/25 focus:ring-[var(--os-accent)] text-[var(--os-fg)]"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs text-[var(--os-muted)] font-mono">
                    Mật khẩu đăng nhập
                  </Label>
                  <Input
                    type="password"
                    value={newStudentPassword}
                    onChange={(e) => setNewStudentPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="mt-1 bg-[var(--os-bg)] border-[var(--os-muted)]/25 focus:ring-[var(--os-accent)] text-[var(--os-fg)]"
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs text-[var(--os-muted)] font-mono">
                    Lớp học (Tùy chọn)
                  </Label>
                  <Input
                    value={newStudentClass}
                    onChange={(e) => setNewStudentClass(e.target.value)}
                    placeholder="VD: 12A1"
                    className="mt-1 bg-[var(--os-bg)] border-[var(--os-muted)]/25 focus:ring-[var(--os-accent)] text-[var(--os-fg)]"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCreateStudentOpen(false)}
                    className="rounded-lg border border-[var(--os-muted)]/20 text-[var(--os-muted)]"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    disabled={creatingStudent}
                    className="rounded-lg bg-[var(--os-accent)] text-[var(--os-accent-fg)] hover:bg-[var(--os-accent)]/90 font-bold px-6 flex items-center gap-1.5"
                  >
                    {creatingStudent && <Loader2 className="h-4 w-4 animate-spin" />}
                    Cấp tài khoản
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Permissions modal */}
      <AnimatePresence>
        {permissionsOpen && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[var(--os-bg)]/80 backdrop-blur-sm"
              onClick={closePermissionsModal}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] p-6 shadow-2xl z-10"
            >
              <button
                onClick={closePermissionsModal}
                className="absolute right-4 top-4 text-[var(--os-muted)] hover:text-[var(--os-fg)]"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-[var(--os-fg)]">
                  Cấp quyền môn học trực tuyến
                </h3>
                <p className="text-xs text-[var(--os-muted)] mt-1">
                  Đang thiết lập quyền cho:{" "}
                  <strong className="text-[var(--os-accent)]">
                    {selectedStudent.full_name}
                  </strong>{" "}
                  ({selectedStudent.email})
                </p>
              </div>
              <form onSubmit={handlePermissionsSubmit} className="space-y-4">
                <div className="p-3 bg-[var(--os-bg)]/40 border border-[var(--os-muted)]/20 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--os-fg)]">
                      Cấp tất cả các môn
                    </span>
                    <span className="text-[10px] text-[var(--os-muted)] mt-0.5">
                      Cho phép truy cập toàn bộ môn học trực tuyến
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempSelectedSubjects.includes("all")}
                    onChange={() => handleToggleSubjectCheckbox("all")}
                    className="h-4 w-4 rounded border-[var(--os-muted)]/40 bg-[var(--os-bg)] text-[var(--os-accent)] focus:ring-[var(--os-accent)] accent-[var(--os-accent)] cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-[var(--os-muted)] uppercase tracking-wider font-mono">
                    <span>Chọn từng môn học</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTempSelectedSubjects(["all"])}
                        className="text-[var(--os-accent)] hover:underline"
                      >
                        Chọn hết
                      </button>
                      <span>|</span>
                      <button
                        type="button"
                        onClick={() => setTempSelectedSubjects([])}
                        className="text-red-400 hover:underline"
                      >
                        Bỏ chọn hết
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 border border-[var(--os-muted)]/10 rounded-xl p-3 bg-[var(--os-bg)]/20 custom-scrollbar">
                    {ONLINE_SUBJECTS.map((subject) => {
                      const isChecked =
                        tempSelectedSubjects.includes("all") ||
                        tempSelectedSubjects.includes(subject.value as string)
                      const isDisabled = tempSelectedSubjects.includes("all")
                      return (
                        <label
                          key={subject.value}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? "bg-[var(--os-accent)]/10 border-[var(--os-accent)]/30 text-[var(--os-fg)]"
                              : "bg-[var(--os-bg)]/30 border-[var(--os-muted)]/10 text-[var(--os-muted)] hover:text-[var(--os-fg)] hover:bg-[var(--os-bg)]/55"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-base shrink-0">{subject.icon}</span>
                            <span className="truncate font-medium">{subject.label}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() =>
                              handleToggleSubjectCheckbox(subject.value as string)
                            }
                            className="h-3.5 w-3.5 rounded border-[var(--os-muted)]/40 bg-[var(--os-bg)] text-[var(--os-accent)] focus:ring-[var(--os-accent)] accent-[var(--os-accent)] cursor-pointer disabled:opacity-50"
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>
                {formError && <p className="text-xs text-red-500 mt-2">{formError}</p>}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--os-muted)]/10">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closePermissionsModal}
                    className="rounded-lg border border-[var(--os-muted)]/20 text-[var(--os-muted)]"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-[var(--os-accent)] text-[var(--os-accent-fg)] hover:bg-[var(--os-accent)]/90 font-bold px-6"
                  >
                    {submitting ? "Đang xử lý..." : "Lưu quyền hạn"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
