# Script ElevenLabs = 100% chữ trên video

**Nguồn sự thật:** `remotion/src/lib/scenes.ts` → field `lines[]`  
**Không số điện thoại.**

Video hiện **đúng từng câu** trong `lines` (dòng đầu to, các dòng sau hiện lần lượt).

## File audio — 1 file hoặc 12 file

| Ưu tiên | File | Cách làm |
|--------|------|----------|
| **1 (khuyên)** | `remotion/public/voice/full.mp3` | ElevenLabs export **1 take full** (script s01→s12 liền) |
| 2 | `s01.mp3` … `s12.mp3` | Tách từng đoạn — khớp tuyệt đối |
| 3 | Không có file | Video câm |

**1 file `full.mp3`:** Remotion phát cả track, **chia thời lượng scene theo độ dài chữ** script (đoạn giá/s09 đứng lâu hơn). Đọc **đúng thứ tự s01→s12** để hình theo kịp.

```bash
# đặt full.mp3 vào remotion/public/voice/
cd remotion
npm run render:full
```

---

## Quy tắc khớp

| Giọng nói | Màn hình |
|-----------|----------|
| Câu 1 | Title lớn |
| Câu 2, 3, … | Card lần lượt |
| Chip (THPT, HSA…) | Chỉ từ khóa **đã có** trong câu nói |

---

## s01

```
Các em 2k9 ơi.
<break time="0.45s" />
Anh mời các em xem qua khóa học online một chút.
```

**Hình:** Badge section “Mở đầu” · title “Các em 2k9 ơi.” · card câu 2.

---

## s02

```
Ôn video đang loạn.
<break time="0.35s" />
File rải khắp Drive, khó theo dõi, dễ bỏ cuộc.
<break time="0.4s" />
Đúng không các em?
```

**Hình:** 3 card = 3 câu trên.

---

## s03

```
StudyHub.
<break time="0.4s" />
Cổng học online: video theo môn, có thầy cô phụ trách.
<break time="0.35s" />
Học THPT và ĐGNL, linh hoạt thời gian.
```

**Hình:** Title StudyHub · 2 card · chip THPT · ĐGNL · Online.

---

## s04

```
Trong mỗi môn có gì?
<break time="0.35s" />
Bài giảng video theo chương.
<break time="0.3s" />
Tài liệu ôn kèm theo.
<break time="0.3s" />
Các em học mọi lúc, mọi nơi.
```

**Hình:** 4 dòng đúng script.

---

## s05

```
Chương trình đủ môn cho 2k9.
<break time="0.4s" />
Tự nhiên, xã hội, tiếng Anh,
<break time="0.3s" />
và ĐGNL.
```

**Hình:** 3 dòng + chip Tự nhiên / Xã hội / Tiếng Anh / ĐGNL.

---

## s06

```
Giáo viên khối tự nhiên.
<break time="0.4s" />
Toán khoảng mười khóa.
<break time="0.3s" />
Lý khoảng tám thầy.
<break time="0.3s" />
Hóa bốn, Sinh ba.
<break time="0.35s" />
Nhiều thầy cô theo từng môn, các em chọn được lộ trình phù hợp.
```

**Hình:** 5 dòng + chip Toán×10 · Lý×8 · Hóa×4 · Sinh×3.

---

## s07

```
Xã hội và tiếng Anh.
<break time="0.35s" />
Văn bốn khóa.
<break time="0.3s" />
Sử, Địa có cô Lan Hương, cô Hương Sen, cô Mai Anh.
<break time="0.4s" />
Tiếng Anh: cô Phạm Liễu, cô Trang Anh, cô Vũ Mai Phương.
```

**Hình:** 4 dòng đúng tên thầy cô.

---

## s08

```
ĐGNL bốn hướng.
<break time="0.4s" />
HSA.
<break time="0.3s" />
V-ACT.
<break time="0.3s" />
TSA.
<break time="0.3s" />
và Sư phạm.
<break time="0.35s" />
Mỗi hướng có đội ngũ riêng.
```

**Hình:** 6 dòng + chip HSA · V-ACT · TSA · Sư phạm.

---

## s09

```
Chương trình ưu đãi đang mở tham khảo.
<break time="0.45s" />
Mua lẻ một môn: chín mươi chín nghìn đồng, giảm mười lăm phần trăm.
<break time="0.4s" />
Combo ba môn: hai trăm năm mươi nghìn, giảm hai mươi lăm.
<break time="0.4s" />
Toàn vẹn chưa ĐGNL: bốn trăm năm mươi nghìn, giảm ba mươi.
<break time="0.4s" />
Chỉ ĐGNL: một trăm chín mươi chín nghìn.
<break time="0.4s" />
Full kèm ĐGNL: năm trăm chín mươi chín nghìn, giảm bốn mươi phần trăm.
```

**Hình:** 6 card giá = 6 câu (số đọc bằng chữ, màn hiện cùng câu).

---

## s10

```
Đặc biệt.
<break time="0.35s" />
Các em được học thử miễn phí một ngày.
<break time="0.4s" />
Xem giao diện, xem bài mẫu, không ép mua ngay.
```

**Hình:** Badge ưu đãi · 3 dòng script.

---

## s11

```
Quyền lợi học viên.
<break time="0.35s" />
Một tài khoản, một thiết bị.
<break time="0.3s" />
Hỗ trợ qua Zalo bằng cách quét mã QR.
<break time="0.35s" />
Nên quay màn hình khi thanh toán.
<break time="0.3s" />
Nội dung bám chương trình 2k9.
```

**Hình:** 5 dòng đúng script.

---

## s12

```
Muốn học thử ngay.
<break time="0.4s" />
Các em quét mã QR Zalo trên màn hình.
<break time="0.35s" />
Hoặc vào luyende.id.vn.
<break time="0.3s" />
Hoặc bấm link bio.
<break time="0.4s" />
Anh mở học thử cho các em.
<break time="0.35s" />
Hẹn gặp các em trên StudyHub.
```

**Hình:** 6 dòng + **QR Zalo** (khi nói “quét mã QR”).

---

## Việc thầy

1. ElevenLabs: **đúng text từng block s01–s12** (không thêm bớt).  
2. Đặt `s01.mp3`…`s12.mp3` vào `remotion/public/voice/`.  
3. `npm run render:full` — video scale theo audio, chữ đã khớp script.

Sửa nội dung sau này: **chỉ sửa** `remotion/src/lib/scenes.ts` → `lines[]` (vừa màn hình vừa voice).
