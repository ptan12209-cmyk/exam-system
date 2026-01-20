# 📋 Hướng dẫn Push lên GitHub

## Các bước cơ bản

| Bước | Lệnh | Mô tả |
|------|------|-------|
| **1. Kiểm tra trạng thái** | `git status` | Xem file nào đã thay đổi |
| **2. Thêm file** | `git add .` | Thêm tất cả file đã thay đổi |
| | `git add <file>` | Thêm file cụ thể |
| **3. Commit** | `git commit -m "message"` | Lưu thay đổi với mô tả |
| **4. Push** | `git push` | Đẩy lên GitHub |
| **5. Pull (nếu cần)** | `git pull` | Kéo code mới từ GitHub |

---

## 🔧 Các lệnh thường dùng

```bash
# Combo nhanh: add + commit + push
git add . && git commit -m "feat: Thêm tính năng mới" && git push

# Xem lịch sử commit
git log --oneline -5

# Xem thay đổi chưa commit
git diff

# Hoàn tác file chưa add
git checkout -- <file>

# Hoàn tác commit cuối (giữ code)
git reset --soft HEAD~1

# Xem remote
git remote -v
```

---

## 📝 Quy tắc viết Commit Message

| Prefix | Ý nghĩa | Ví dụ |
|--------|---------|-------|
| `feat:` | Tính năng mới | `feat: Add daily check-in` |
| `fix:` | Sửa lỗi | `fix: Resolve login error` |
| `refactor:` | Tái cấu trúc code | `refactor: Simplify dashboard` |
| `chore:` | Việc vặt, cấu hình | `chore: Update dependencies` |
| `docs:` | Tài liệu | `docs: Add README` |
| `style:` | Format code | `style: Fix indentation` |
| `test:` | Thêm test | `test: Add unit tests` |

---

## 🚨 Xử lý lỗi thường gặp

### Lỗi: "Please commit your changes or stash them"
```bash
git stash          # Tạm lưu thay đổi
git pull           # Kéo code mới
git stash pop      # Khôi phục thay đổi
```

### Lỗi: "Merge conflict"
1. Mở file có conflict
2. Sửa nội dung giữa `<<<<<<< HEAD` và `>>>>>>> branch`
3. Xóa các dòng marker
4. `git add .` và `git commit`

### Lỗi: "Push rejected"
```bash
git pull --rebase  # Kéo và rebase
git push           # Push lại
```

---

## 🌿 Quản lý Branch

```bash
# Tạo branch mới
git checkout -b feature/ten-tinh-nang

# Chuyển branch
git checkout main

# Merge branch
git merge feature/ten-tinh-nang

# Xóa branch
git branch -d feature/ten-tinh-nang
```

---

## ⚡ PowerShell Shortcut

```powershell
# Thêm vào $PROFILE để dùng lệnh ngắn
function gp { git add . ; git commit -m $args[0] ; git push }

# Sử dụng: gp "feat: Add new feature"
```
