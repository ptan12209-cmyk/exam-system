import { describe, it, expect } from 'vitest'
import { sanitizeLessonForCatalog, buildPlaybackPayload } from '../lesson-media'

describe('lesson-media', () => {
  const sample = {
    id: 'l1',
    folder_id: 'f1',
    title: 'Bai 1',
    description: 'desc',
    order_index: 1,
    video_url: 'https://iframe.mediadelivery.net/embed/1/abc',
    document_url: 'https://example.com/a.pdf',
    videos: [{ title: 'V1', url: 'https://youtube.com/watch?v=abcdefghijk' }],
    documents: [{ title: 'Doc', url: 'https://example.com/d.pdf' }],
  }

  it('strips URLs from catalog', () => {
    const cat = sanitizeLessonForCatalog(sample)
    expect(cat.has_video).toBe(true)
    expect(cat.has_documents).toBe(true)
    expect(JSON.stringify(cat)).not.toContain('mediadelivery')
    expect(JSON.stringify(cat)).not.toContain('example.com')
    expect(cat.video_titles).toContain('V1')
  })

  it('playback keeps media urls', () => {
    const p = buildPlaybackPayload(sample)
    expect(p.videos.length).toBeGreaterThan(0)
    expect(p.videos[0].url).toContain('http')
    expect(p.documents[0].url).toContain('pdf')
  })
})
