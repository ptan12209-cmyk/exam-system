/** Shared types for teacher online-study UI */

export interface DbFolder {
  id: string
  name: string
  parent_id: string | null
  subject: string
  order_index: number
}

export interface DbLesson {
  id: string
  folder_id: string
  title: string
  description: string | null
  video_url: string | null
  document_url: string | null
  order_index: number
  /** Import pipeline: video | pdf | document | … */
  source_kind?: string | null
  videos?: Array<{ title: string; url: string }>
  documents?: Array<{ title: string; url: string }>
}

export interface FolderTreeNode {
  folder: DbFolder
  children: FolderTreeNode[]
}

export interface StudentProfile {
  id: string
  full_name: string | null
  email: string | null
  role: string
  class: string | null
  online_subjects: string[]
  progress_percent?: number
}

export type StudyTab =
  | "lectures"
  | "permissions"
  | "payment"
  | "orders"
  | "security"
