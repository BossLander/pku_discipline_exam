# 北大在线考试操作流程

## 适用场景

exam.pku.edu.cn 上的线上考试：2026级研究生校规校纪线上考试（exam 54）与 2026年北京大学新生网络安全知识考试（exam 57）。90 分合格，系统保留最高分，允许重复作答。

## 启动浏览器控制器

1. 用 TTY 方式启动脚本，stdin 必须保持打开（在 Codex 中用 exec 以 tty=true 启动，之后用 write_stdin 发命令）：
   `node <skill>/scripts/exam_browser.cjs`
2. 脚本打开真实 Chrome 窗口，使用持久化 profile（默认 `<skill>/exam_profile`），登录态保存在 profile 里，重复使用无需重新登录。
3. 若尚未登录，浏览器会停在北大统一认证页，等用户登录完成后继续。
4. 通过 stdin 逐行发送 JSON 命令，如 `{"cmd":"state"}`。

## 命令速查

| 命令 | 说明 |
|---|---|
| `goto` | 打开 URL（自动带 2.5s 等待并返回页面状态） |
| `state` | 返回标题、URL、各 frame 文本，并截图 |
| `wait` | 等待 `ms` 毫秒 |
| `clickText` | 按文本点击第一个匹配元素 |
| `clickSel` | 按 CSS 选择器点击 |
| `type` / `press` | 输入文本 / 按键 |
| `eval` | 在页面执行 JS（字段是 `js`，不是 `code`；表达式须返回可 JSON 序列化的值） |
| `fetch` | GET 页面相对 URL（自动携带 Bearer token），结果写入 `out` 文件 |
| `post` | POST/PUT/PATCH 页面相对 URL，`body` 或 `bodyFile` 传参，结果写入 `out` |
| `close` | 关闭浏览器并退出进程 |

控制器已注册 dialog 自动接受，点击“提交考试”后的确认弹窗会自动确认。

## 答题流程

1. `goto https://exam.pku.edu.cn/examinee/exams`，用 `state` 查看可参加考试和“进入考试”链接（`/examinee/exam/<id>`）。
2. 进入考试：`goto https://exam.pku.edu.cn/examinee/exam/<id>`，页面会显示“已恢复草稿”和已答/未答计数。
3. 取题目：`fetch /exams/<id>/questions` 保存题目 JSON（含每题 id、题型、选项）。
4. 对答案：
   - [exam-54.md](exam-54.md)：校规考试 90 题 + 最终答案
   - [exam-57.md](exam-57.md)：网络安全考试 20 题 + 最终答案
   - [answers.md](answers.md)：DOCX 答案库（101 题），适合按关键词检索
   - [handbooks/eg.txt](handbooks/eg.txt) 与 [handbooks/net.txt](handbooks/net.txt)：手册 OCR 原文；答案库与题库不一致时以手册原文为准
5. 组装草稿：`{"exam_id":<id>,"answers":{题目id: 答案},"final_snapshot":false}`；多选答案用连写标签，如 `"ABCD"`。
6. 保存草稿：`post /submissions/draft`，`bodyFile` 指向 payload。
7. 校验：`fetch /submissions/draft/<id>`，确认每题答案非空。
8. 界面确认“已答 20 / 未答 0”后提交：`eval` 点击“提交考试”（或 `clickText`）。
9. `state` 确认跳转到 `/result/<id>` 页并看到分数。

## 常见问题

- 一场考试页面开着时可能无法进入另一场：先提交或返回考试列表，再进入下一场。
- Chrome profile 被占用（上次异常退出）：结束匹配 `exam_profile` 的 chrome.exe 进程后重新启动控制器。
- 结束时用 `{"cmd":"close"}` 正常退出，不要直接杀窗口。
- 资料文件均为 UTF-8；PowerShell 终端直接查看中文会乱码，读写用 Python。
