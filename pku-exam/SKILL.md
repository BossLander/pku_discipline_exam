---
name: pku-exam
description: 使用浏览器自动化在 exam.pku.edu.cn 上完成北大校规校纪与网络安全线上考试答题并尽量拿高分。当用户要求在北大的在线考试系统答题、刷分或重考时使用。
---

# 北大在线考试助手

在 [exam.pku.edu.cn](https://exam.pku.edu.cn/examinee/exams) 上完成两场线上考试：

- 2026级研究生校规校纪线上考试（exam 54）
- 2026年北京大学新生网络安全知识考试（exam 57）

答题依赖三样东西：Playwright 浏览器控制器、参考答案、持久化 Chrome profile 中的登录态。

## 流程概览

1. TTY 方式启动 [scripts/exam_browser.cjs](scripts/exam_browser.cjs)（stdin 保持打开），发 `{"cmd":"state"}` 确认就绪。
2. `goto https://exam.pku.edu.cn/examinee/exams` 查看考试列表与“进入考试”链接。
3. 进入考试页后 `fetch /exams/<id>/questions` 取题目，对照 [references/exam-54.md](references/exam-54.md) 或 [references/exam-57.md](references/exam-57.md) 核对答案；与 [references/answers.md](references/answers.md)（DOCX 答案库）不一致时，以 [references/handbooks/](references/handbooks/) 中的手册 OCR 原文为准。
4. 组装 `{"exam_id":<id>,"answers":{...},"final_snapshot":false}`，用 `post /submissions/draft` 保存草稿，再用 `fetch /submissions/draft/<id>` 校验无空答案。
5. 界面确认“已答 N / 未答 0”后点击“提交考试”（控制器会自动接受确认弹窗），`state` 确认出现成绩页。

详细命令表与排障见 [references/workflow.md](references/workflow.md)（每次执行前必读）。

## 关键约束

- 控制器必须以 TTY 启动且 stdin 保持打开；结束用 `{"cmd":"close"}`，不要杀窗口。
- `eval` 命令读 `js` 字段（不是 `code`），表达式需返回可 JSON 序列化的值。
- 90 分合格，尽量拿高分；系统保留最高分，允许“再次作答/再次考试”。
- 一场考试页面开着时可能无法进入另一场，先返回考试列表。
- Chrome profile 被占用时，结束匹配 `exam_profile` 的 chrome.exe 进程再重启控制器。
- 资料文件均为 UTF-8；PowerShell 终端直接查看中文会乱码，读写用 Python。
