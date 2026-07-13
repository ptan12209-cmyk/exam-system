# Script giọng nói — FullCombo (V1 + V3 + V6)

**Giọng:** nam · xưng **anh** / **các em**  
**Không đọc số điện thoại** (TikTok dễ quét). Đọc: *“quét QR Zalo”* · *“link bio”* · *“luyende.id.vn”*.  
**Độ dài video:** ~80 giây (15 + 1.2 + 30 + 1.2 + 25 + 8 end QR)

## Có voice sẵn trong render không?

| Cách | Kết quả |
|------|---------|
| `npm run render:full` **không** chạy TTS trước | **Chỉ hình** (cần lồng voice sau) |
| `npm run voice:generate` rồi `npm run render:full` | **Có voice TTS** ghép sẵn theo timeline |
| Một lệnh | `npm run render:full:with-voice` (hoặc root: `npm run remotion:render:full:voice`) |

TTS dùng **Microsoft Edge neural** (`edge-tts` npm) — giọng **vi-VN NamMinh** (nam), **không cần API key**. Cần mạng lúc generate.

```bash
cd remotion
npm run voice:generate      # → public/voice/part-*.mp3
npm run studio              # nghe thử FullCombo
npm run render:full         # MP4 có audio
```

File voice: `remotion/public/voice/`. Có thể thay bằng file tự thu (giữ tên `part-v1.mp3` …) nếu muốn giọng thầy thật.

---

## Script đọc liền mạch (copy thu voice)

*(Nghỉ hơi ngắn ở dấu | — khoảng 0.3–0.5s. Chỗ [nhịp] nghỉ 0.8–1.2s cho chuyển cảnh.)*

---

Các em 2k9 ơi. |

Anh biết ôn video rải khắp Drive mệt lắm đúng không. |

StudyHub gom bài theo môn — Toán, Lý, Hóa, Văn… và cả ĐGNL. |

Một cổng học online. Các em vào luyende.id.vn xem danh sách môn và bảng giá tham khảo. |

Sắp mở đăng ký. Cần anh hỗ trợ thì quét QR Zalo cuối video, hoặc bấm link bio. |

[nhịp — Phần 2 Tour môn]

Anh liệt kê nhanh các môn trên StudyHub cho các em. |

Khối tự nhiên: Toán, Lý, Hóa, Sinh. |

Xã hội: Văn, Sử, Địa, KTPL. Thêm Tiếng Anh. |

ĐGNL: HSA, V-ACT, TSA và Sư phạm — mỗi gói có đội ngũ riêng. |

Vào luyende.id.vn xem đủ giáo viên theo từng môn. |

Cần tư vấn chọn môn — quét QR Zalo, anh trả lời các em. |

[nhịp — Phần 3 Trust]

Các em yên tâm học — anh nói rõ quyền lợi. |

Mỗi tài khoản chỉ đăng nhập một thiết bị. Đừng share lung tung kẻo bị khóa. |

Khi thanh toán, các em nên quay màn hình hoặc quay video. Có sự cố anh hỗ trợ nhanh hơn. |

Muốn nhắn anh: quét QR Zalo trên màn hình. Không cần ghi số. |

Trang chính luyende.id.vn. Học tử tế, bảo vệ tài khoản — anh đồng hành cùng các em. |

[nhịp — End card QR]

Các em nhớ: quét QR để chat Zalo. Link bio cũng trỏ về StudyHub. Hẹn gặp các em trên luyende.id.vn.

---

## Bản không dấu nghỉ (1 khối, dán TTS)

```
Các em 2k9 ơi. Anh biết ôn video rải khắp Drive mệt lắm đúng không. StudyHub gom bài theo môn — Toán, Lý, Hóa, Văn… và cả ĐGNL. Một cổng học online. Các em vào luyende.id.vn xem danh sách môn và bảng giá tham khảo. Sắp mở đăng ký. Cần anh hỗ trợ thì quét QR Zalo cuối video, hoặc bấm link bio.

Anh liệt kê nhanh các môn trên StudyHub cho các em. Khối tự nhiên: Toán, Lý, Hóa, Sinh. Xã hội: Văn, Sử, Địa, KTPL. Thêm Tiếng Anh. ĐGNL: HSA, V-ACT, TSA và Sư phạm — mỗi gói có đội ngũ riêng. Vào luyende.id.vn xem đủ giáo viên theo từng môn. Cần tư vấn chọn môn — quét QR Zalo, anh trả lời các em.

Các em yên tâm học — anh nói rõ quyền lợi. Mỗi tài khoản chỉ đăng nhập một thiết bị. Đừng share lung tung kẻo bị khóa. Khi thanh toán, các em nên quay màn hình hoặc quay video. Có sự cố anh hỗ trợ nhanh hơn. Muốn nhắn anh: quét QR Zalo trên màn hình. Không cần ghi số. Trang chính luyende.id.vn. Học tử tế, bảo vệ tài khoản — anh đồng hành cùng các em.

Các em nhớ: quét QR để chat Zalo. Link bio cũng trỏ về StudyHub. Hẹn gặp các em trên luyende.id.vn.
```

---

## Timeline gợi ý (khớp animation)

| Thời gian | Nội dung voice (tóm) | Visual |
|-----------|----------------------|--------|
| 0:00–0:15 | Hook 2k9 + StudyHub + domain | V1Hook |
| 0:15–0:16 | *(im / nhạc)* | Bridge “Phần 2” |
| 0:16–0:46 | Tour môn + ĐGNL | V3Tour |
| 0:46–0:47 | *(im / nhạc)* | Bridge “Phần 3” |
| 0:47–1:12 | Trust + QR Zalo | V6Trust |
| 1:12–1:20 | CTA quét QR + domain | End card QR lớn |

*(Thời gian tuyệt đối có thể lệch ±1s tùy nhịp đọc — chỉnh audio cho khớp end card.)*

---

## Hướng dẫn thu

1. Mic cách miệng ~15cm, phòng ít vọng.  
2. Giọng ấm, tốc độ vừa (không vội 2k9).  
3. **Không** đọc dãy số 0946…  
4. Export WAV/MP3 → lồng trong CapCut/Premiere lên `full-combo.mp4`.  
5. Caption TikTok: dùng chữ *“QR Zalo · luyende.id.vn”* — tránh số điện thoại trong caption nếu được.

## Caption đăng (an toàn)

```
2k9 ơi — 1 cổng học online THPT + ĐGNL 📚
Xem môn & giá: luyende.id.vn
Cần anh hỗ trợ: quét QR trong video / link bio
#2k9 #thpt #dgnl #hóconline #studyhub
```
