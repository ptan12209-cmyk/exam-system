// Types for exam listing pages

export interface Exam {
  id: string
  title: string
  description?: string
  duration: number
  total_questions: number
  status: string
  subject?: string
  created_at: string
  is_scheduled?: boolean
  start_time?: string
  end_time?: string
}

export interface Question {
  id: string
  question_text: string
  options: string[]
}

export interface Submission {
  exam_id: string
  score: number
}
