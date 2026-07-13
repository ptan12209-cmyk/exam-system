# Smoke checklist — Học online

Chạy sau deploy / trước mở bán.

## Học viên

1. [ ] Login → `/online-student/dashboard` thấy danh sách môn  
2. [ ] Môn đã mở khóa → `/online-student/study?subject=toan` load folder  
3. [ ] Mở 1 bài → playback video  
4. [ ] Đánh dấu hoàn thành → progress cập nhật  
5. [ ] Máy B login cùng account → máy A bị đá / API device conflict  
6. [ ] Intro `/` : mọi gói badge **Sắp mở**, không nút Zalo mua  

## Giáo viên

1. [ ] `/teacher/online-study` lectures load theo môn  
2. [ ] Cấp quyền HV (catalog key: toan, ly, …)  
3. [ ] **Reset TB** → HV login máy mới được  
4. [ ] Đơn hàng / payment settings (nếu bật bán)  
5. [ ] Checklist Bunny ẩn/hiện được  

## DB / env

1. [ ] `migrations/migration-single-device-binding.sql` đã chạy  
2. [ ] Supabase service role + anon trên Vercel  
3. [ ] (Optional) Bunny token / PayOS / Casso nếu dùng  
