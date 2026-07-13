# Script ElevenLabs — StudyHub Full (giọng nam · anh / các em)

**Mục đích:** Thầy paste vào ElevenLabs (multilingual).  
**Video:** composition `StudyHubFull` · chữ màn hình khớp từng đoạn.  
**Không đọc số điện thoại** — chỉ “mã Q R Da-lo”, “link bio”, “luyende…”.

---

## Cách dùng ElevenLabs

1. Voice: **nam**, ổn định, tiếng Việt (hoặc multilingual v2).  
2. Stability ~ **0.45–0.55** · Similarity ~ **0.75** · Style thấp.  
3. **Tách 12 file** (khuyến nghị): `s01.mp3` … `s12.mp3`  
   → bỏ vào `remotion/public/voice/`  
   → `npm run studio` / `npm run render:full`  
   Video **tự kéo dài scene theo độ dài audio**.  
4. Hoặc 1 file full: lồng thủ công trong CapCut (dùng timeline phía dưới).

### Ký hiệu ngắt

| Ký hiệu | Ý nghĩa |
|---------|---------|
| `<break time="0.4s" />` | Nghỉ ngắn (ElevenLabs SSML-style, nếu model hỗ trợ) |
| `...` | Nghỉ tự nhiên ~0.3s |
| Dòng trống | Nghỉ giữa câu / đoạn |

Nếu model **không** hỗ trợ `<break>`, xóa thẻ break, giữ dấu `...` và xuống dòng.

---

## Bảng map scene → file

| File | Màn hình (title) | ~giây gợi ý |
|------|------------------|-------------|
| s01.mp3 | Các em 2k9 ơi | 4–5 |
| s02.mp3 | Ôn video đang loạn | 5–6 |
| s03.mp3 | StudyHub | 5–6 |
| s04.mp3 | Trong mỗi môn có gì? | 5–6 |
| s05.mp3 | Đủ môn cho 2k9 | 5–6 |
| s06.mp3 | Toán · Lý · Hóa · Sinh | 7–9 |
| s07.mp3 | Văn · Sử · Địa · Anh | 6–8 |
| s08.mp3 | Bốn hướng luyện thi | 6–8 |
| s09.mp3 | Gói học linh hoạt | 10–14 |
| s10.mp3 | Miễn phí 1 ngày | 5–7 |
| s11.mp3 | Học yên tâm | 6–8 |
| s12.mp3 | Học thử ngay + QR | 6–8 |

---

## Script từng đoạn (copy từng block sang ElevenLabs)

### s01 — Mở

```
Các em hai nghìn lẻ chín ơi.
<break time="0.45s" />
Anh mời các em xem qua khóa học online một chút.
```

### s02 — Vấn đề

```
Ôn video đang loạn.
<break time="0.35s" />
File rải khắp nơi... khó theo dõi... dễ bỏ cuộc.
<break time="0.4s" />
Đúng không các em?
```

### s03 — Giải pháp (tránh đọc sai “StudyHub”)

```
Sta-đi Háp.
<break time="0.4s" />
Cổng học online: video theo môn, có thầy cô phụ trách.
<break time="0.35s" />
Học trung học phổ thông và đánh giá năng lực, linh hoạt thời gian.
```

### s04 — Nội dung

```
Trong mỗi môn có gì?
<break time="0.35s" />
Bài giảng video theo chương.
<break time="0.3s" />
Tài liệu ôn kèm theo.
<break time="0.3s" />
Các em học mọi lúc, mọi nơi.
```

### s05 — Chương trình môn

```
Chương trình đủ môn cho hai nghìn lẻ chín.
<break time="0.4s" />
Tự nhiên... xã hội... tiếng Anh...
<break time="0.3s" />
và đánh giá năng lực.
```

### s06 — Giáo viên tự nhiên

```
Giáo viên khối tự nhiên.
<break time="0.4s" />
Toán khoảng mười khóa.
<break time="0.3s" />
Lý khoảng tám thầy.
<break time="0.3s" />
Hóa bốn... Sinh ba.
<break time="0.35s" />
Nhiều thầy cô theo từng môn, các em chọn được lộ trình phù hợp.
```

### s07 — Xã hội & Anh (tên Việt — ElevenLabs đọc ổn)

```
Xã hội và tiếng Anh.
<break time="0.35s" />
Văn bốn khóa.
<break time="0.3s" />
Sử, Địa có cô Lan Hương, cô Hương Sen, cô Mai Anh.
<break time="0.4s" />
Tiếng Anh: cô Phạm Liễu, cô Trang Anh, cô Vũ Mai Phương.
```

### s08 — Đánh giá năng lực (phiên âm, tránh HSA/V-ACT/TSA thô)

```
Đánh giá năng lực bốn hướng.
<break time="0.4s" />
Hát-ét-a.
<break time="0.3s" />
Vi-áct.
<break time="0.3s" />
Tê-ét-a.
<break time="0.3s" />
và Sư phạm.
<break time="0.35s" />
Mỗi hướng có đội ngũ riêng.
```

### s09 — Ưu đãi / giá (đọc số bằng tiếng Việt)

```
Chương trình ưu đãi đang mở tham khảo.
<break time="0.45s" />
Mua lẻ một môn: chín mươi chín nghìn đồng... giảm mười lăm phần trăm.
<break time="0.4s" />
Combo ba môn: hai trăm năm mươi nghìn... giảm hai mươi lăm.
<break time="0.4s" />
Toàn vẹn chưa đánh giá năng lực: bốn trăm năm mươi nghìn... giảm ba mươi.
<break time="0.4s" />
Chỉ đánh giá năng lực: một trăm chín mươi chín nghìn.
<break time="0.4s" />
Full kèm đánh giá năng lực: năm trăm chín mươi chín nghìn... giảm bốn mươi phần trăm.
```

### s10 — Học thử miễn phí 1 ngày

```
Đặc biệt.
<break time="0.35s" />
Các em được học thử miễn phí một ngày.
<break time="0.4s" />
Xem giao diện... xem bài mẫu... không ép mua ngay.
```

### s11 — Quyền lợi

```
Quyền lợi học viên.
<break time="0.35s" />
Một tài khoản, một thiết bị.
<break time="0.3s" />
Hỗ trợ qua Da-lo bằng cách quét mã Q R.
<break time="0.35s" />
Nên quay màn hình khi thanh toán.
<break time="0.3s" />
Nội dung bám chương trình hai nghìn lẻ chín.
```

### s12 — Chốt CTA

```
Muốn học thử ngay...
<break time="0.4s" />
Các em quét mã Q R Da-lo trên màn hình.
<break time="0.35s" />
Hoặc vào luyende chấm i đê chấm vân ên.
<break time="0.3s" />
Hoặc bấm link bio.
<break time="0.4s" />
Anh mở học thử cho các em.
<break time="0.35s" />
Hẹn gặp các em trên Sta-đi Háp.
```

---

## Bản FULL một lần (nếu thầy export 1 file)

Dán nguyên khối; có break. **Không** có số điện thoại.

```
Các em hai nghìn lẻ chín ơi.
<break time="0.45s" />
Anh mời các em xem qua khóa học online một chút.
<break time="0.6s" />
Ôn video đang loạn. File rải khắp nơi... khó theo dõi... dễ bỏ cuộc. Đúng không các em?
<break time="0.55s" />
Sta-đi Háp. Cổng học online: video theo môn, có thầy cô phụ trách. Học trung học phổ thông và đánh giá năng lực, linh hoạt thời gian.
<break time="0.55s" />
Trong mỗi môn: bài giảng video theo chương, tài liệu ôn kèm theo. Các em học mọi lúc, mọi nơi.
<break time="0.5s" />
Chương trình đủ môn cho hai nghìn lẻ chín: tự nhiên, xã hội, tiếng Anh, và đánh giá năng lực.
<break time="0.55s" />
Giáo viên khối tự nhiên. Toán khoảng mười khóa. Lý khoảng tám thầy. Hóa bốn, Sinh ba. Nhiều thầy cô theo từng môn.
<break time="0.5s" />
Xã hội và tiếng Anh. Văn bốn khóa. Sử, Địa có cô Lan Hương, cô Hương Sen, cô Mai Anh. Tiếng Anh: cô Phạm Liễu, cô Trang Anh, cô Vũ Mai Phương.
<break time="0.55s" />
Đánh giá năng lực bốn hướng: Hát-ét-a, Vi-áct, Tê-ét-a, và Sư phạm. Mỗi hướng có đội ngũ riêng.
<break time="0.6s" />
Chương trình ưu đãi đang mở tham khảo. Lẻ một môn chín mươi chín nghìn, giảm mười lăm phần trăm. Combo ba môn hai trăm năm mươi nghìn, giảm hai mươi lăm. Toàn vẹn chưa đánh giá năng lực bốn trăm năm mươi nghìn, giảm ba mươi. Chỉ đánh giá năng lực một trăm chín mươi chín nghìn. Full kèm đánh giá năng lực năm trăm chín mươi chín nghìn, giảm bốn mươi phần trăm.
<break time="0.55s" />
Đặc biệt: các em được học thử miễn phí một ngày. Xem giao diện, xem bài mẫu, không ép mua ngay.
<break time="0.5s" />
Quyền lợi: một tài khoản một thiết bị. Hỗ trợ Da-lo bằng quét mã Q R. Nên quay màn hình khi thanh toán. Nội dung bám chương trình hai nghìn lẻ chín.
<break time="0.55s" />
Muốn học thử ngay: quét mã Q R Da-lo trên màn hình, hoặc vào luyende chấm i đê chấm vân ên, hoặc bấm link bio. Anh mở học thử cho các em. Hẹn gặp các em trên Sta-đi Háp.
```

---

## Timeline gợi ý (khi lồng 1 file full)

| Khoảng (ước) | Nội dung |
|--------------|----------|
| 0:00 | Mở 2k9 |
| 0:05 | Vấn đề Drive |
| 0:12 | Sta-đi Háp / giải pháp |
| 0:20 | Nội dung môn |
| 0:28 | Đủ môn |
| 0:36 | GV tự nhiên |
| 0:48 | GV xã hội + Anh |
| 1:00 | ĐGNL bốn hướng |
| 1:12 | Bảng giá ưu đãi |
| 1:35 | Học thử 1 ngày |
| 1:45 | Quyền lợi |
| 1:55 | CTA + QR |

*(Timeline chính xác = độ dài audio thầy export; video Remotion tự theo nếu tách 12 file.)*

---

## Checklist thầy

- [ ] Export 12 mp3 tên đúng `s01.mp3` … `s12.mp3`  
- [ ] Copy vào `remotion/public/voice/`  
- [ ] `cd remotion && npm run studio` nghe khớp scene  
- [ ] `npm run render:full`  
- [ ] Caption TikTok: không ghi số ĐT; ghi “QR Da-lo · luyende.id.vn”
