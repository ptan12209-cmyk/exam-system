"use client"

import React, { useState, use, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Save, Loader2, Settings, Columns, ClipboardList, Eye } from 'lucide-react'
import { useIeltsTest } from '@/hooks/useIeltsTest'
import { useToast } from '@/components/ui/toast'
import { SectionEditor } from './_components/SectionEditor'
import { ReadingEditor } from './_components/ReadingEditor'
import { ListeningEditor } from './_components/ListeningEditor'
import { WritingEditor } from './_components/WritingEditor'
import { QuestionEditor } from './_components/QuestionEditor'
import { TestPreview } from './_components/TestPreview'
import { IeltsSection } from '@/types'
import { TeacherShell } from '@/components/teacher/TeacherShell'
import { Button } from '@/components/ui/button'

export default function EditIeltsTestPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const testId = params.id
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  
  const {
    test,
    loading,
    saving,
    error,
    refetch,
    updateTestDetails,
    addSection,
    updateSection,
    deleteSection,
    addQuestion,
    updateQuestion,
    deleteQuestion
  } = useIeltsTest(testId)

  const [activeTab, setActiveTab] = useState<'details' | 'sections' | 'questions' | 'preview'>('details')
  const [selectedSection, setSelectedSection] = useState<IeltsSection | null>(null)
  const toast = useToast()

  // Local state cho Cài đặt chi tiết
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft')
  const [timerMode, setTimerMode] = useState<'standard' | 'custom'>('standard')
  const [duration, setDuration] = useState(60)

  // Đồng bộ thông tin đề thi sang local state một lần
  useEffect(() => {
    if (test) {
      setTitle(test.title)
      setDescription(test.description || '')
      setStatus(test.status)
      setTimerMode(test.timer_mode)
      setDuration(test.duration)
    }
  }, [test])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Đang tải cấu hình đề thi...</p>
      </div>
    )
  }

  if (error || !test) {
    return (
      <div className="container mx-auto p-6 text-center max-w-xl space-y-4">
        <div className="rounded-[2rem] border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-400">
          {error || 'Bài thi không tồn tại hoặc đã bị xóa.'}
        </div>
        <Link href="/teacher/ielts">
          <Button variant="outline" className="rounded-full border-[hsl(var(--border))]/70 bg-transparent px-5 py-2 text-sm font-semibold">
            Quay lại danh sách
          </Button>
        </Link>
      </div>
    )
  }

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await updateTestDetails({
      title,
      description,
      status,
      timer_mode: timerMode,
      duration: timerMode === 'custom' ? Number(duration) : undefined
    })
    if (success) {
      toast.success('Đã cập nhật cài đặt đề thi thành công!')
    }
  }

  const sections = test.sections || []

  return (
    <TeacherShell onLogout={handleLogout}>
      <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-7xl">
        {/* Top Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))]/25 pb-4">
          <div className="space-y-1">
            <Link
              href="/teacher/ielts"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors mb-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Danh sách đề thi
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate max-w-[500px]">
              Chỉnh sửa: <span className="text-cyan-400">{test.title}</span>
            </h1>
            <p className="text-xs text-muted-foreground">Kỹ năng: <span className="uppercase font-bold text-foreground">{test.skill}</span> · Thời lượng: {test.duration} phút</p>
          </div>

          {/* Tab Controls */}
          <div className="flex gap-1.5 bg-white/5 p-1 rounded-full border border-white/5 self-start">
            <button
              onClick={() => { setActiveTab('details'); setSelectedSection(null) }}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'details' ? 'bg-cyan-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings className="h-3.5 w-3.5" /> Chi tiết đề
            </button>
            <button
              onClick={() => { setActiveTab('sections'); setSelectedSection(null) }}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'sections' ? 'bg-cyan-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Columns className="h-3.5 w-3.5" /> Phần thi ({sections.length})
            </button>
            {test.skill !== 'writing' && (
              <button
                onClick={() => { setActiveTab('questions'); setSelectedSection(null) }}
                className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'questions' ? 'bg-cyan-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ClipboardList className="h-3.5 w-3.5" /> Câu hỏi ({test.total_questions})
              </button>
            )}
            <button
              onClick={() => { setActiveTab('preview'); setSelectedSection(null) }}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'preview' ? 'bg-cyan-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye className="h-3.5 w-3.5" /> Xem trước
            </button>
          </div>
        </div>

        {/* Main Workspace Area */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {/* Tab Details */}
            {activeTab === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <form onSubmit={handleSaveDetails} className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 space-y-4 max-w-2xl">
                  <h3 className="text-sm font-bold text-cyan-400 border-b border-[hsl(var(--border))]/20 pb-2 mb-4">Cài đặt cơ bản bài thi</h3>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Tiêu đề bài thi *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Mô tả bài thi</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Chế độ thời gian *</label>
                      <select
                        value={timerMode}
                        onChange={e => {
                          setTimerMode(e.target.value as any)
                          if (e.target.value === 'standard') {
                            setDuration(test.skill === 'reading' ? 60 : test.skill === 'listening' ? 30 : 60)
                          }
                        }}
                        className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2.5 text-sm text-foreground focus:outline-none cursor-pointer [&>option]:bg-neutral-900"
                      >
                        <option value="standard">Standard (Mặc định)</option>
                        <option value="custom">Custom (Tùy chỉnh)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Thời gian làm bài (Phút) *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        disabled={timerMode === 'standard'}
                        value={duration}
                        onChange={e => setDuration(Number(e.target.value))}
                        className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2.5 text-sm text-foreground focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Trạng thái phát hành *</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2.5 text-sm text-foreground focus:outline-none cursor-pointer [&>option]:bg-neutral-900"
                    >
                      <option value="draft">Draft (Bản nháp - Học sinh chưa thấy)</option>
                      <option value="published">Published (Công khai cho học sinh làm)</option>
                      <option value="archived">Archived (Lưu trữ)</option>
                    </select>
                  </div>

                  <div className="pt-4 flex items-center justify-end">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all border-0 h-auto"
                    >
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Save className="h-4.5 w-4.5" /> Lưu cài đặt
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

          {/* Tab Sections */}
          {activeTab === 'sections' && (
            <motion.div
              key={`sections-${selectedSection?.id || 'list'}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {selectedSection ? (
                /* Trình soạn thảo chi tiết của một section tùy theo kỹ năng */
                test.skill === 'reading' ? (
                  <ReadingEditor
                    section={selectedSection}
                    onSave={updateSection}
                    onClose={() => setSelectedSection(null)}
                  />
                ) : test.skill === 'listening' ? (
                  <ListeningEditor
                    section={selectedSection}
                    onSave={updateSection}
                    onClose={() => setSelectedSection(null)}
                  />
                ) : (
                  <WritingEditor
                    section={selectedSection}
                    onSave={updateSection}
                    onClose={() => setSelectedSection(null)}
                  />
                )
              ) : (
                /* Danh sách sections hiện có */
                <SectionEditor
                  test={test}
                  sections={sections}
                  onAddSection={addSection}
                  onUpdateSection={updateSection}
                  onDeleteSection={deleteSection}
                  onSelectSection={setSelectedSection}
                />
              )}
            </motion.div>
          )}

          {/* Tab Questions */}
          {activeTab === 'questions' && test.skill !== 'writing' && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <QuestionEditor
                test={test}
                sections={sections}
                onAddQuestion={addQuestion}
                onUpdateQuestion={updateQuestion}
                onDeleteQuestion={deleteQuestion}
              />
            </motion.div>
          )}

          {/* Tab Preview */}
          {activeTab === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <TestPreview test={test} sections={sections} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </TeacherShell>
)
}
