# pku_discipline_exam

北京大学校规校纪 + 网络安全线上考试答题的 Codex skill。

> 仅供学习交流与模拟练习，请认真对待正式考试。

## 这是什么

一个 Codex skill：在 [exam.pku.edu.cn](https://exam.pku.edu.cn/examinee/exams) 上自动完成两场线上考试：

- 2026级研究生校规校纪线上考试（exam 54）
- 2026年北京大学新生网络安全知识考试（exam 57）

实测成绩：校规 99/100、网络安全 95/100（均通过）。

## 目录结构

```text
pku-exam/
├── SKILL.md                     # skill 入口与使用说明
├── agents/openai.yaml           # UI 元数据
├── scripts/
│   ├── exam_browser.cjs         # Playwright 浏览器控制器
│   └── build_exam_ref.py        # 题目+答案 JSON → Markdown 参考生成器
└── references/
    ├── answers.md               # DOCX 答案库（101 题）
    ├── exam-54.md / exam-57.md  # 两场考试的题目+实考答案
    ├── handbooks/               # 手册 OCR 原文（核对用）
    └── workflow.md              # 详细操作流程
```

## 安装

1. 把 `pku-exam/` 目录复制到 Codex 的 skills 目录：
   - Windows：`C:\Users\<用户名>\.codex\skills\pku-exam`
   - macOS / Linux：`~/.codex/skills/pku-exam`
2. 新开对话后即可用 `$pku-exam` 调用。

## 前置条件

- 本机有 Node.js，且能加载 Playwright（Codex 桌面版自带运行时通常已包含）
- 首次使用需在打开的 Chrome 窗口里登录 exam.pku.edu.cn（登录态保存在 `exam_profile/`，已被 .gitignore 排除，不会提交到仓库）

## 使用方法

详细步骤见 `pku-exam/references/workflow.md`。基本流程：

1. TTY 方式启动浏览器控制器，保持 stdin 打开
2. 进入考试页，拉取题目
3. 对照 `references/` 里的答案库核对答案
4. 保存草稿并校验无空答案
5. 提交考试，确认成绩

## 免责声明

答案整理自公开参考资料与个人实考记录，不保证完全正确；与官方手册不一致时，以官方手册为准。
