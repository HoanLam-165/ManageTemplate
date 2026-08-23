# Template Workspace — Phase 00: Bootstrap

> **Mục tiêu:** chuẩn bị project và xác nhận CLI hiểu đúng sản phẩm trước khi cho phép code.
>
> **Trạng thái:** PRE-IMPLEMENTATION
>
> **Quan trọng:** Phase này CHƯA được triển khai tính năng sản phẩm.

---

## 1. Mục tiêu

Đưa project từ trạng thái chưa có source code thành một desktop app skeleton có thể chạy được trên máy phát triển.

Đồng thời xác nhận CLI đã đọc và hiểu đúng:
- Product Plan v2
- `SKILL.md`
- `00-project-rules.md`

---

## 2. Review trước — KHÔNG CODE

CLI phải đọc các tài liệu trên và báo cáo:

1. Nó hiểu sản phẩm là gì.
2. Template và Document là gì.
3. Quan hệ Template → Document.
4. MVP cần chứng minh điều gì.
5. Các locked decisions.
6. Các mâu thuẫn hoặc blocker.
7. Các quyết định còn thiếu.

Nếu phát hiện mâu thuẫn/blocker:

```text
STOP → REPORT → WAIT FOR APPROVAL
```

Không tự sửa tài liệu và không tự đổi kiến trúc.

---

## 3. Stack dự kiến

### Desktop
- Tauri 2
- React
- TypeScript
- Vite

### UI
- Tailwind CSS
- component library phù hợp nếu cần

### Storage
- SQLite
- JSON cho cấu trúc Template/Document
- local filesystem cho assets

### Export
- DOCX

**Chưa tự chốt thư viện DOCX ở Phase 00.** Việc này thuộc Technical Spike.

---

## 4. Sau khi Review PASS

Chỉ khi người dùng duyệt, CLI mới được bootstrap:

1. Tạo project structure.
2. Cài dependency cần thiết.
3. Tạo Tauri application.
4. Tạo React + TypeScript frontend.
5. Cấu hình build.
6. Tạo màn hình tối thiểu.
7. Chạy development build.
8. Chạy production build.

---

## 5. Project skeleton tối thiểu

```text
template-workspace/
├── src/
├── src-tauri/
├── tests/
├── docs/
├── package.json
├── tsconfig.json
├── vite.config.*
└── ...
```

Ưu tiên cấu trúc mặc định, dễ bảo trì của framework.

---

## 6. UI tối thiểu

Chỉ cần chứng minh app chạy được:

```text
┌──────────────────────────────────────┐
│ Template Workspace                   │
├──────────────────────────────────────┤
│                                      │
│        Template Workspace             │
│                                      │
│        MVP Bootstrap Ready            │
│                                      │
└──────────────────────────────────────┘
```

Không xây Editor, Template Library, Login UI, Database, Document hay Export.

---

## 7. Kiểm chứng bắt buộc

### Environment
- [ ] dependency cài thành công
- [ ] frontend chạy được
- [ ] Tauri app chạy được
- [ ] không có lỗi build nghiêm trọng

### Development
- [ ] app mở được
- [ ] UI hiển thị đúng
- [ ] hot reload hoạt động nếu framework hỗ trợ

### Production
- [ ] production build thành công
- [ ] production application chạy được

### Repository
- [ ] source code rõ ràng
- [ ] không commit secret
- [ ] có `.gitignore`
- [ ] có README tối thiểu
- [ ] có hướng dẫn chạy project

---

## 8. Không được làm

CLI KHÔNG được:

- xây Template Editor;
- xây Document Editor;
- thiết kế database hoàn chỉnh;
- tạo authentication logic;
- chọn DOCX renderer;
- tạo business logic;
- tạo payment;
- tạo AI;
- tạo cloud backend;
- tự đổi stack;
- tự thay đổi locked decision.

Nếu cần một việc trong danh sách trên:

```text
STOP → REPORT → WAIT FOR APPROVAL
```

---

## 9. Báo cáo cuối Phase

```text
PHASE 00 — FINAL REPORT

Status:
PASS / FAIL / BLOCKED

Environment:
...

Installed:
...

Project structure:
...

Development build:
PASS / FAIL

Production build:
PASS / FAIL

Tests:
...

Problems:
...

Decisions required:
...

Files changed:
...

Next phase:
PHASE 02 — DOCX SPIKE
```

Sau báo cáo:

> **STOP. Không tự chuyển sang Phase tiếp theo.**

---

## 10. Definition of Done

Phase 00 PASS khi:

> Có thể cài dependency, chạy development app và tạo production build thành công.

Đồng thời CLI đã chứng minh nó hiểu đúng Product Plan và các locked decisions trước khi được phép triển khai tiếp.

---

## 11. Lệnh review cho CLI

```text
Read the Product Plan v2, SKILL.md and 00-project-rules.md.

Do NOT modify code yet.

Perform the Phase 00 pre-implementation review described in:
docs/phases/00-bootstrap.md

Report:
1. your understanding of the product,
2. locked decisions,
3. contradictions,
4. missing decisions/blockers,
5. proposed bootstrap stack.

Do not make implementation changes.
Do not install dependencies.
Do not proceed to implementation.

STOP and wait for approval.
```

Sau khi duyệt:

```text
APPROVED.

Implement Phase 00 only according to the phase document.

Do not implement any later phase.
Run all required verification.
Report the Phase 00 final report.
STOP after the report.
```

---

## 12. Gate

```text
PHASE 00
   │
   ├── Review FAIL → sửa tài liệu → Review lại
   │
   └── Review PASS
          ↓
       Bootstrap
          ↓
       Verify
          ↓
       Human Review
          ↓
      ┌───┴───┐
     FAIL    PASS
      │        │
      ↓        ↓
     Fix    Phase 02
```

**Không có đường tự động từ Phase 00 → Phase 02.**
