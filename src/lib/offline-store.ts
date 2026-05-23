/**
 * OfflineExamStore — IndexedDB wrapper for offline exam mode.
 *
 * Stores:
 *   - Exam packages (exam data without correct answers)
 *   - Student answers (per exam)
 *   - Sync queue (submissions pending upload)
 *
 * All operations return Promises. No external dependencies.
 *
 * DB Schema:
 *   - exams: keyPath=id, stores OfflineExamPackage
 *   - answers: keyPath=exam_id, stores student answers
 *   - sync_queue: keyPath=id (auto-increment), stores OfflineSubmission
 */

const DB_NAME = 'examhub-offline'
const DB_VERSION = 1

export interface OfflineExamPackage {
  id: string
  title: string
  duration: number
  total_questions: number
  mc_questions: Array<{ question: number }>
  tf_questions: Array<{ question: number }>
  sa_questions: Array<{ question: number }>
  pdf_url?: string
  is_scheduled?: boolean
  start_time?: string
  end_time?: string
  max_attempts?: number
  security_level?: number
  package_version: string
  downloaded_at: string
}

export interface OfflineAnswers {
  exam_id: string
  mc_answers: (string | null)[]
  tf_answers: Array<{
    question: number
    a: boolean | null
    b: boolean | null
    c: boolean | null
    d: boolean | null
  }>
  sa_answers: Array<{ question: number; answer: string }>
  time_spent: number
  started_at: string
  last_saved_at: string
}

export interface OfflineSubmission {
  id?: number
  exam_id: string
  package_version: string
  mc_answers: (string | null)[]
  tf_answers: Array<{
    question: number
    a: boolean | null
    b: boolean | null
    c: boolean | null
    d: boolean | null
  }>
  sa_answers: Array<{ question: number; answer: string }>
  time_spent: number
  started_at: string
  submitted_at: string
  cheat_flags?: { tab_switches: number; multi_browser: boolean }
  status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'error'
  error_message?: string
}

class ExamOfflineStore {
  private db: IDBDatabase | null = null

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB không được hỗ trợ trên trình duyệt này'))
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains('exams')) {
          db.createObjectStore('exams', { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains('answers')) {
          db.createObjectStore('answers', { keyPath: 'exam_id' })
        }

        if (!db.objectStoreNames.contains('sync_queue')) {
          const store = db.createObjectStore('sync_queue', {
            keyPath: 'id',
            autoIncrement: true,
          })
          store.createIndex('status', 'status', { unique: false })
          store.createIndex('exam_id', 'exam_id', { unique: false })
        }
      }

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        resolve(this.db)
      }

      request.onerror = (event) => {
        reject(
          new Error(
            `Không thể mở IndexedDB: ${(event.target as IDBOpenDBRequest).error?.message}`
          )
        )
      }
    })
  }

  // ──────────────────────────────────────────────
  // Exam packages
  // ──────────────────────────────────────────────

  async saveExamPackage(examId: string, data: Omit<OfflineExamPackage, 'id' | 'downloaded_at'>): Promise<void> {
    const db = await this.getDB()
    const pkg: OfflineExamPackage = {
      ...data,
      id: examId,
      downloaded_at: new Date().toISOString(),
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('exams', 'readwrite')
      const store = tx.objectStore('exams')
      store.put(pkg)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(new Error('Không thể lưu gói bài thi'))
    })
  }

  async getExamPackage(examId: string): Promise<OfflineExamPackage | null> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction('exams', 'readonly')
      const store = tx.objectStore('exams')
      const request = store.get(examId)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(new Error('Không thể đọc gói bài thi'))
    })
  }

  async getAllExamPackages(): Promise<OfflineExamPackage[]> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction('exams', 'readonly')
      const store = tx.objectStore('exams')
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result ?? [])
      request.onerror = () => reject(new Error('Không thể đọc danh sách gói bài thi'))
    })
  }

  async deleteExamPackage(examId: string): Promise<void> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction('exams', 'readwrite')
      const store = tx.objectStore('exams')
      store.delete(examId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(new Error('Không thể xóa gói bài thi'))
    })
  }

  // ──────────────────────────────────────────────
  // Student answers
  // ──────────────────────────────────────────────

  async saveAnswers(examId: string, answers: Omit<OfflineAnswers, 'exam_id' | 'last_saved_at'>): Promise<void> {
    const db = await this.getDB()
    const record: OfflineAnswers = {
      ...answers,
      exam_id: examId,
      last_saved_at: new Date().toISOString(),
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('answers', 'readwrite')
      const store = tx.objectStore('answers')
      store.put(record)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(new Error('Không thể lưu câu trả lời'))
    })
  }

  async getAnswers(examId: string): Promise<OfflineAnswers | null> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction('answers', 'readonly')
      const store = tx.objectStore('answers')
      const request = store.get(examId)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(new Error('Không thể đọc câu trả lời'))
    })
  }

  async deleteAnswers(examId: string): Promise<void> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction('answers', 'readwrite')
      const store = tx.objectStore('answers')
      store.delete(examId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(new Error('Không thể xóa câu trả lời'))
    })
  }

  // ──────────────────────────────────────────────
  // Sync queue
  // ──────────────────────────────────────────────

  async addToSyncQueue(submission: Omit<OfflineSubmission, 'id' | 'status'>): Promise<number> {
    const db = await this.getDB()
    const record: Omit<OfflineSubmission, 'id'> = {
      ...submission,
      status: 'pending',
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite')
      const store = tx.objectStore('sync_queue')
      const request = store.add(record)
      request.onsuccess = () => resolve(request.result as number)
      request.onerror = () => reject(new Error('Không thể thêm vào hàng đợi đồng bộ'))
    })
  }

  async getSyncQueue(): Promise<OfflineSubmission[]> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly')
      const store = tx.objectStore('sync_queue')
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result ?? [])
      request.onerror = () => reject(new Error('Không thể đọc hàng đợi đồng bộ'))
    })
  }

  async getPendingSyncCount(): Promise<number> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly')
      const index = tx.objectStore('sync_queue').index('status')
      const request = index.count('pending')
      request.onsuccess = () => resolve(request.result ?? 0)
      request.onerror = () => reject(new Error('Không thể đếm hàng đợi'))
    })
  }

  async updateSyncStatus(
    id: number,
    status: OfflineSubmission['status'],
    errorMessage?: string
  ): Promise<void> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite')
      const store = tx.objectStore('sync_queue')
      const request = store.get(id)
      request.onsuccess = () => {
        const record = request.result
        if (!record) {
          reject(new Error('Không tìm thấy bản ghi đồng bộ'))
          return
        }
        record.status = status
        if (errorMessage) record.error_message = errorMessage
        store.put(record)
      }
      request.onerror = () => reject(new Error('Không thể cập nhật trạng thái đồng bộ'))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(new Error('Không thể cập nhật trạng thái đồng bộ'))
    })
  }

  async removeFromSyncQueue(id: number): Promise<void> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite')
      const store = tx.objectStore('sync_queue')
      store.delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(new Error('Không thể xóa khỏi hàng đợi'))
    })
  }

  // ──────────────────────────────────────────────
  // Maintenance
  // ──────────────────────────────────────────────

  async clearAll(): Promise<void> {
    const db = await this.getDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['exams', 'answers', 'sync_queue'], 'readwrite')
      tx.objectStore('exams').clear()
      tx.objectStore('answers').clear()
      tx.objectStore('sync_queue').clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(new Error('Không thể xóa dữ liệu offline'))
    })
  }
}

export const offlineStore = new ExamOfflineStore()
