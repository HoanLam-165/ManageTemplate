# KẾ HOẠCH PHÁT TRIỂN SẢN PHẨM — TEMPLATE WORKSPACE v2

> **Trạng thái:** Product Plan — đã chốt phạm vi MVP, chưa phải tài liệu triển khai kỹ thuật.
>
> **Tài liệu triển khai:** `template-workspace-skill/`
>
> **Nguyên tắc:** Product Plan trả lời **xây cái gì và vì sao**. Implementation Skill trả lời **xây như thế nào**.

---

# 1. Tầm nhìn sản phẩm

Template Workspace là một ứng dụng desktop giúp người dùng:

> **Lưu trữ → tái sử dụng → chỉnh sửa → hoàn thiện → xuất các mẫu thực hiện công việc.**

Ý tưởng xuất phát từ một vấn đề đơn giản: trong nhiều công việc, người dùng phải tạo những loại tài liệu có cấu trúc tương tự nhau nhiều lần.

Ví dụ:

- Test Case
- Bug Report
- Meeting Note
- Báo cáo
- Biên bản
- Tài liệu dự án
- Các biểu mẫu cá nhân

Thay vì mỗi lần lại tìm một file cũ hoặc thiết kế lại từ đầu, người dùng có thể lưu cách trình bày thành một Template và sử dụng lại.

## Vòng lặp giá trị cốt lõi

```text
Create Template
      ↓
Reuse Template
      ↓
Create Document
      ↓
Edit / Complete
      ↓
Export
```

MVP chỉ cần chứng minh vòng lặp này hoạt động tốt.

---

# 2. Hai nỗi đau cốt lõi

## 2.1. Không tìm thấy form cũ để làm lại công việc

Một người có thể đã từng tạo một file rất tốt cho một công việc.

Nhưng lần sau:

- không nhớ file nằm ở đâu;
- file nằm trong thư mục dự án cũ;
- có nhiều phiên bản;
- không biết file nào là bản tốt nhất;
- hoặc đơn giản là không muốn mất thời gian tìm.

Kết quả: họ làm lại từ đầu.

### Sản phẩm giải quyết

Template được lưu thành một thư viện riêng.

Người dùng có thể mở lại Template và sử dụng nó nhiều lần.

### Giả thuyết cần kiểm chứng

> Sau khi tạo một Template, người dùng có quay lại sử dụng nó nhiều lần thay vì làm lại từ đầu không?

Đây là giá trị cốt lõi cần kiểm chứng trước khi mở rộng sản phẩm.

---

# 3. Nỗi đau thứ hai — Người mới không biết bắt đầu từ đâu

Người mới có thể được giao một công việc nhưng không biết kết quả cần có cấu trúc như thế nào.

Ví dụ:

> "Viết Test Case."

Người mới có thể không biết:

- cần những trường nào;
- thứ tự trình bày;
- mức độ chi tiết;
- nên bắt đầu từ đâu.

Template có thể cung cấp một điểm bắt đầu.

Tuy nhiên, giá trị này **chưa được coi là đã chứng minh trong MVP**.

Giá trị của nó sẽ mạnh hơn khi sản phẩm có:

- Community;
- đánh giá;
- số lượt sử dụng/tải;
- template chất lượng được cộng đồng xác nhận.

Do đó MVP chỉ cung cấp các Template mẫu ban đầu, chưa xây Community.

---

# 4. Định vị sản phẩm

Sản phẩm **không phải**:

- hệ thống quản lý dự án;
- hệ thống quản lý Test Case;
- Jira;
- Notion;
- Word thay thế;
- Google Docs thay thế.

Sản phẩm tập trung vào một đơn vị nhỏ hơn:

> **Template dùng để thực hiện một loại công việc.**

Người dùng không cần quản lý cả dự án.

Họ chỉ cần:

> "Tôi thường xuyên phải làm loại tài liệu này. Tôi muốn lưu cách làm của mình để lần sau dùng lại."

---

# 5. Đối tượng người dùng ban đầu

MVP không cố phục vụ một ngành duy nhất.

Nhóm người phù hợp có đặc điểm:

- thường xuyên tạo tài liệu có cấu trúc;
- có công việc lặp lại;
- muốn lưu lại form đã từng sử dụng;
- không muốn dùng một hệ thống quản lý công việc phức tạp.

Ví dụ:

- Tester / QA;
- Freelancer;
- Sinh viên;
- Nhân viên văn phòng;
- Người thường xuyên lập báo cáo hoặc biểu mẫu.

Kiến trúc MVP không được phụ thuộc vào một loại tài liệu duy nhất.

---

# 6. Khái niệm cốt lõi

## 6.1. Template

Template là **blueprint** của một tài liệu.

Nó chứa:

- nội dung cố định nếu cần;
- các phần tử có thể chỉnh sửa;
- bố cục;
- vị trí;
- kích thước;
- định dạng.

Template được thiết kế trực quan trên một trang.

Người dùng có thể kéo/thả các phần tử vào vị trí mong muốn.

## 6.2. Document

Document là sản phẩm được tạo ra từ Template.

Khi người dùng chọn:

> Use Template

hệ thống tạo một bản sao độc lập.

Sau đó:

- Document có thể chỉnh sửa tự do;
- Template không bị thay đổi;
- Template thay đổi không làm thay đổi Document cũ;
- Document thay đổi không làm thay đổi Template.

Có thể lưu Template nguồn như metadata, nhưng Document không phụ thuộc vào Template để hoạt động.

## 6.3. Mô hình tư duy

```text
Template
   │
   │ Use Template
   ↓
Document
   │
   ├── Edit
   ├── Save
   └── Export
```

---

# 7. Visual Editor

Một điểm khác biệt quan trọng của sản phẩm là Template không chỉ là một form CRUD.

Người dùng làm việc trên một trang giống một tờ giấy.

Ví dụ:

```text
┌──────────────────────────────────────┐
│              KÍNH GỬI               │
│                                      │
│ Họ tên: [______________]             │
│                                      │
│ Nội dung:                            │
│ [                                    ]│
│ [                                    ]│
│                                      │
│                    [Ký tên]          │
└──────────────────────────────────────┘
```

Người dùng có thể:

- thêm phần tử;
- kéo;
- thả;
- thay đổi kích thước;
- chỉnh định dạng;
- sắp xếp;
- xóa;
- sao chép.

## Tọa độ

Vị trí phần tử được biểu diễn bằng tọa độ logic trên trang, ưu tiên đơn vị mm thay vì lưu trực tiếp pixel màn hình.

Mục tiêu:

> cùng một bố cục logic có thể được hiển thị trên màn hình và chuyển thành DOCX mà không phụ thuộc độ phân giải màn hình.

## Word-line / alignment problem

Việc đặt phần tử quá tự do có thể khiến kết quả DOCX khó căn chỉnh.

MVP giải quyết bằng:

- grid;
- snap;
- alignment guides;
- khoảng cách/gợi ý căn chỉnh;
- khung trang A4;
- đơn vị tọa độ thống nhất.

Không cố bắt người dùng tự căn từng pixel.

---

# 8. Các loại phần tử MVP

MVP ưu tiên các loại phổ biến:

- Text;
- Number;
- Date;
- Select;
- Checkbox;
- Image.

Các loại phức tạp như:

- Table;
- Formula;
- Rich document editor;
- URL object;
- scripting;

để sau.

Mục tiêu là đủ dùng cho các Template thông thường mà không biến sản phẩm thành một trình soạn thảo văn bản hoàn chỉnh.

---

# 9. Template Lifecycle

Một Template có vòng đời:

```text
Blank Template
      ↓
Add / Edit Elements
      ↓
Arrange Layout
      ↓
Set Metadata
      ↓
Save Template
      ↓
Use Template
```

Khi chỉnh sửa Template đã tồn tại, người dùng có hai lựa chọn:

```text
Overwrite current template
OR
Create new template
```

MVP không xây hệ thống versioning kiểu Git cho Template.

---

# 10. Document Lifecycle

```text
Template
   ↓
Use Template
   ↓
Deep Copy
   ↓
Document
   ↓
Edit
   ↓
Manual Save
   ↓
Export DOCX
```

Template và Document là hai thực thể độc lập.

Một Document không bị cập nhật theo Template sau khi được tạo.

---

# 11. Lưu và quản lý dữ liệu

MVP đi theo hướng **local-first**.

Lý do:

- giảm độ phức tạp;
- dễ phát triển MVP;
- dễ kiểm thử;
- không phụ thuộc server;
- dữ liệu nằm trên máy người dùng.

Tuy nhiên, ứng dụng vẫn có hệ thống đăng nhập local để xác định quyền sở hữu Template và Document.

Mô hình dữ liệu dùng:

```text
SQLite
   +
JSON document content
   +
Local assets
```

SQLite giữ metadata và quan hệ.

JSON giữ cấu trúc nội dung/bố cục.

Asset được lưu riêng và tham chiếu bằng ID.

---

# 12. Desktop thay vì Web

MVP hướng tới **desktop application**.

Lý do:

- phù hợp với mô hình chỉnh sửa tài liệu;
- cửa sổ editor độc lập giống Word;
- thuận lợi cho multi-window;
- local storage tự nhiên;
- không phải phụ thuộc browser;
- giảm các vấn đề về session/xác thực web trong MVP.

Kiến trúc cụ thể nằm trong Implementation Skill.

---

# 13. Multi-window

Một cửa sổ editor chỉ làm việc với một Document.

Nếu người dùng muốn làm đồng thời:

```text
Document A
Document B
Document C
```

thì mở ba cửa sổ riêng, tương tự cách sử dụng Word.

MVP không sử dụng hệ thống tab.

Một Document chỉ được mở trong tối đa một editor window.

Nếu người dùng cố mở lại Document đang mở:

> tập trung vào cửa sổ hiện tại thay vì tạo cửa sổ thứ hai.

---

# 14. Save

MVP dùng **manual save**.

Có ba cách:

- Ctrl + S;
- File → Save;
- khi đóng cửa sổ đang có thay đổi chưa lưu, hiển thị lựa chọn Save / Don't Save / Cancel.

Không xây autosave trong MVP.

Lý do:

- đơn giản hơn;
- dễ hiểu;
- dễ kiểm thử;
- tránh làm phức tạp trạng thái nhiều cửa sổ.

---

# 15. Export

DOCX là định dạng bắt buộc của MVP.

PDF chưa bắt buộc.

Lý do:

Người dùng cuối có thể tiếp tục chỉnh sửa DOCX bằng Word hoặc phần mềm tương thích.

## Technical Spike

Trước khi xây editor hoàn chỉnh phải kiểm chứng khả năng:

```text
Document JSON
      ↓
DOCX Renderer
      ↓
Microsoft Word
```

Cần kiểm tra:

- A4;
- vị trí;
- text wrapping;
- font;
- alignment;
- image;
- nhiều phần tử;
- long text.

Nếu renderer không đáp ứng được mô hình sản phẩm, phải xử lý rủi ro trước khi tiếp tục xây toàn bộ editor.

---

# 16. Template Library

Mở ứng dụng sẽ có các Template mẫu.

MVP cung cấp:

1. Test Case
2. Bug Report
3. Meeting Notes
4. Blank Template

Người dùng có thể:

- xem;
- sử dụng;
- tạo Template mới;
- chỉnh sửa Template của mình.

## Metadata MVP

Template có:

- tên;
- mô tả;
- category;
- thumbnail.

Tính năng xem chi tiết nâng cao để sau.

---

# 17. Giới hạn Template

MVP áp dụng giới hạn:

> Free user có tối đa 3 Template do người dùng lưu.

Blank Template không tính vào quota này.

Mục đích:

- kiểm chứng mô hình giới hạn;
- tránh dữ liệu không kiểm soát;
- tạo cơ sở cho mô hình thương mại sau này.

Không triển khai payment/subscription trong MVP.

Quota phải được thiết kế thành business rule riêng, không rải hard-code trong UI.

---

# 18. Tìm kiếm

MVP chỉ cần tìm kiếm đơn giản theo tên/chữ.

Không xây:

- advanced search;
- filter phức tạp;
- full-text indexing nâng cao.

Mục tiêu là chứng minh thư viện Template có thể sử dụng nhanh.

---

# 19. Những thứ CỐ Ý không làm trong MVP

MVP không có:

- AI;
- Community;
- Marketplace;
- Premium template marketplace;
- Payment;
- Cloud sync;
- Collaboration;
- Template versioning;
- Git-like history;
- Project management;
- Test management;
- DOCX import;
- PDF bắt buộc;
- Autosave;
- Advanced search;
- Complex tables;
- Formula engine;
- Scripting.

Đây không phải vì các tính năng đó không có giá trị.

Mà vì:

> **MVP cần chứng minh giá trị cốt lõi trước khi mở rộng.**

---

# 20. Giả thuyết sản phẩm cần kiểm chứng

## Hypothesis 1 — Reuse

Người dùng có thực sự quay lại sử dụng Template đã tạo không?

Đây là giả thuyết quan trọng nhất.

## Hypothesis 2 — Speed

Người dùng có hoàn thành một tài liệu nhanh hơn so với việc tự tạo lại từ file cũ không?

## Hypothesis 3 — Simplicity

Người dùng có hiểu mô hình:

```text
Template → Document
```

mà không cần hướng dẫn dài không?

## Hypothesis 4 — Visual editing

Người dùng có thấy việc kéo/thả phần tử trên trang trực quan hơn việc điền một form CRUD truyền thống không?

## Hypothesis 5 — Export

DOCX tạo ra có đủ tốt để người dùng thực sự mang ra sử dụng bên ngoài không?

---

# 21. MVP Success Criteria

MVP không cần chứng minh:

> "Sản phẩm có thể phục vụ hàng triệu người."

MVP cần chứng minh:

### Luồng 1

```text
Mở app
→ chọn Template
→ tạo Document
→ chỉnh sửa
→ Save
→ Export DOCX
→ mở DOCX thành công
```

### Luồng 2

```text
Blank Template
→ tạo Template riêng
→ Save
→ đóng
→ mở lại
→ Use Template
→ tạo Document mới
```

### Luồng 3

```text
Template A
→ Document A

Template A thay đổi

Document A vẫn giữ nguyên.
```

### Luồng 4

```text
Document A
Document B
Document C

mở cùng lúc bằng ba cửa sổ

→ không trộn dữ liệu
→ Save độc lập
→ đóng/mở lại đúng dữ liệu
```

Nếu các luồng trên hoạt động ổn định, MVP đạt mục tiêu.

---

# 22. Rủi ro lớn nhất

## Rủi ro 1 — DOCX rendering

Đây là rủi ro kỹ thuật lớn nhất.

Vì vậy phải prototype export trước khi đầu tư quá sâu vào editor.

## Rủi ro 2 — Visual editor quá phức tạp

Nếu cố biến editor thành Word:

> phạm vi sẽ nổ.

Editor chỉ cần đủ để tạo Template.

## Rủi ro 3 — Template quá tự do

Tự do quá mức có thể làm DOCX khó render.

Do đó cần:

- A4;
- grid;
- snap;
- alignment;
- giới hạn element hợp lý.

## Rủi ro 4 — Sản phẩm giống các công cụ có sẵn

Notion/Word/Google Docs đã giải quyết nhiều vấn đề liên quan đến tài liệu.

Lợi thế cần giữ là:

> **Template-first + reuse-first + visual blueprint.**

Không mở rộng thành document management platform.

---

# 23. Hướng phát triển sau MVP

Chỉ xem xét sau khi MVP chứng minh được nhu cầu.

## Giai đoạn thương mại

Có thể nghiên cứu:

- template slots;
- premium templates;
- subscription;
- community;
- template marketplace.

## Giai đoạn Community

Người dùng có thể:

- chia sẻ Template;
- đánh giá;
- tải;
- theo dõi số lượt sử dụng;
- phân loại;
- xác minh chất lượng.

Khi đó nỗi đau số 2 trở nên mạnh hơn:

> Người mới không biết cách thực hiện → có thể học từ Template đã được cộng đồng sử dụng và đánh giá.

## Giai đoạn AI

AI có thể hỗ trợ:

- đánh giá Template;
- đề xuất trường;
- phát hiện thiếu sót;
- gợi ý cấu trúc;
- chuyển đổi Template;
- hỗ trợ tạo Template.

AI không phải trung tâm của MVP.

---

# 24. Hướng nghiên cứu / luận văn

Hiện tại chưa cần ép MVP phải có một "thuật toán AI" chỉ để phục vụ luận văn.

Các hướng nghiên cứu có thể được xem xét sau khi MVP hình thành:

- mô hình hóa Template dạng blueprint;
- biểu diễn bố cục bằng tọa độ;
- quản lý cấu trúc Template linh hoạt;
- chuyển đổi từ visual layout sang DOCX;
- đánh giá khả năng tái sử dụng Template;
- tối ưu hóa bố cục để giảm sai lệch khi export.

Đây là các hướng nghiên cứu tiềm năng, chưa phải kết luận về đề tài luận văn.

---

# 25. Nguyên tắc phát triển

### 1. Không xây thứ chưa chứng minh nhu cầu.

### 2. Không giải quyết vấn đề lớn hơn phạm vi sản phẩm.

### 3. Không dùng AI chỉ vì AI đang phổ biến.

### 4. Không biến Template Workspace thành Word/Notion/Jira thứ hai.

### 5. Không để luận văn ép MVP phình to.

### 6. Prototype rủi ro kỹ thuật trước.

### 7. Product decision và implementation decision phải tách biệt.

### 8. Mỗi phase phải có tiêu chí nghiệm thu.

### 9. Không tự ý thay đổi quyết định kiến trúc.

### 10. Ưu tiên vòng lặp:

> **Create once → Reuse many times → Export.**

---

# 26. Tóm tắt một câu

> **Template Workspace là một desktop application giúp người dùng lưu cách thực hiện một loại công việc thành Template, tái sử dụng Template để tạo các Document độc lập, chỉnh sửa trực quan trên trang và xuất kết quả thành DOCX.**

MVP không nhằm xây một nền tảng quản lý công việc toàn diện.

MVP nhằm kiểm chứng một giả thuyết đơn giản:

> **"Người dùng có muốn lưu cách làm của mình thành Template và quay lại sử dụng nó thay vì làm lại từ đầu hay không?"**
