import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  sanitizeLessonForCatalog,
  buildPlaybackPayload,
  normalizeMediaUrlForStorage,
  normalizeMediaItemsForStorage,
} from '../lesson-media'

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

  const prevKey = process.env.BUNNY_STREAM_TOKEN_KEY

  beforeEach(() => {
    delete process.env.BUNNY_STREAM_TOKEN_KEY
  })

  afterEach(() => {
    if (prevKey === undefined) delete process.env.BUNNY_STREAM_TOKEN_KEY
    else process.env.BUNNY_STREAM_TOKEN_KEY = prevKey
  })

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

  it('normalizes play URL and strips token for storage', () => {
    const signed =
      'https://iframe.mediadelivery.net/embed/123/abcdef01-2345-6789-abcd-ef0123456789?token=deadbeef&expires=999&autoplay=false'
    const clean = normalizeMediaUrlForStorage(signed)
    expect(clean).toContain('iframe.mediadelivery.net/embed/123/')
    expect(clean).not.toContain('token=')
    expect(clean).not.toContain('expires=')
    expect(clean).toContain('autoplay=false')
  })

  it('converts /play/ to embed for storage', () => {
    const play =
      'https://iframe.mediadelivery.net/play/99/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const clean = normalizeMediaUrlForStorage(play)
    expect(clean).toContain('/embed/99/')
    expect(clean).not.toContain('/play/')
  })

  it('normalizeMediaItemsForStorage drops empty urls', () => {
    const items = normalizeMediaItemsForStorage([
      { title: 'A', url: '  https://example.com/x  ' },
      { title: 'B', url: '' },
    ])
    expect(items).toHaveLength(1)
    expect(items[0].url).toBe('https://example.com/x')
  })
})
