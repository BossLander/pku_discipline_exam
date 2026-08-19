// Playwright-based browser controller for exam.pku.edu.cn
//
// Usage: keep stdin open (run in a TTY session) and send one JSON command per line:
//   {"cmd":"state"}
//   {"cmd":"goto","url":"https://exam.pku.edu.cn/examinee/exams"}
//   {"cmd":"eval","js":"document.title"}
//   {"cmd":"fetch","url":"/submissions/draft/57","out":"C:/tmp/draft.json"}
//   {"cmd":"post","url":"/submissions/draft","method":"POST","bodyFile":"C:/tmp/payload.json","out":"C:/tmp/out.json"}
//   {"cmd":"clickText","text":"提交考试"}
//   {"cmd":"close"}
//
// Environment variables:
//   EXAM_PROFILE   persistent Chrome profile dir (keeps login), default <skill>/exam_profile
//   EXAM_SHOT_DIR  screenshot/response output dir, default <skill>/exam_shots
//   EXAM_CHANNEL   browser channel (default "chrome", falls back to bundled chromium)
//
// Note: the eval command reads the field `js`, not `code`.

const { writeFileSync, readFileSync, mkdirSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const readline = require("node:readline");

function resolvePlaywright() {
  const candidates = [
    "playwright",
  ];
  const cuaRoot = "C:/Users/Lenovo/AppData/Local/OpenAI/Codex/runtimes/cua_node";
  try {
    for (const e of readdirSync(cuaRoot)) {
      candidates.push(join(cuaRoot, e, "bin", "node_modules", "playwright"));
    }
  } catch {}
  candidates.push(
    "C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
  );
  for (const c of candidates) {
    try {
      return require(c);
    } catch {}
  }
  throw new Error("playwright module not found; set NODE_PATH or install playwright");
}

const pw = resolvePlaywright();

const PROFILE = process.env.EXAM_PROFILE || join(__dirname, "..", "exam_profile");
const SHOT_DIR = process.env.EXAM_SHOT_DIR || join(__dirname, "..", "exam_shots");
mkdirSync(PROFILE, { recursive: true });
mkdirSync(SHOT_DIR, { recursive: true });

let context;
let page;
let shotCount = 0;

async function dumpState() {
  const frames = page.frames();
  const texts = [];
  for (const f of frames) {
    try {
      const t = await f.locator("body").innerText({ timeout: 3000 }).catch(() => "");
      texts.push(`--- frame ${f.url()} ---\n${t}`);
    } catch {}
  }
  const shot = join(SHOT_DIR, `shot_${String(shotCount++).padStart(3, "0")}.png`);
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  return {
    title: await page.title().catch(() => ""),
    url: page.url(),
    text: texts.join("\n"),
    screenshot: shot,
  };
}

async function clickText(text) {
  const loc = page.getByText(text, { exact: false }).first();
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.click({ timeout: 8000 });
  return { ok: true };
}

async function runCommand(cmd) {
  switch (cmd.cmd) {
    case "goto": {
      await page.goto(cmd.url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(2500);
      return await dumpState();
    }
    case "state": {
      return await dumpState();
    }
    case "wait": {
      await page.waitForTimeout(cmd.ms || 1000);
      return { ok: true };
    }
    case "clickText": {
      return await clickText(cmd.text);
    }
    case "clickSel": {
      await page.locator(cmd.selector).first().click({ timeout: 8000 });
      return { ok: true };
    }
    case "type": {
      await page.locator(cmd.selector).first().click({ timeout: 8000 });
      await page.keyboard.type(cmd.text, { delay: 10 });
      return { ok: true };
    }
    case "press": {
      await page.keyboard.press(cmd.key);
      return { ok: true };
    }
    case "eval": {
      const val = await page.evaluate(async (js) => {
        const fn = new Function(`return (${js})`);
        const r = await fn();
        return JSON.parse(JSON.stringify(r));
      }, cmd.js);
      return { value: val };
    }
    case "fetch": {
      const r = await page.evaluate(async (u) => {
        const t = localStorage.getItem("token");
        const resp = await fetch(u, {
          headers: { Accept: "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        });
        return { status: resp.status, text: await resp.text() };
      }, cmd.url);
      const file = cmd.out || join(SHOT_DIR, "fetch.json");
      writeFileSync(file, r.text, "utf8");
      return { status: r.status, bytes: r.text.length, file, head: r.text.slice(0, 300) };
    }
    case "post": {
      let body = cmd.body;
      if (cmd.bodyFile) {
        body = JSON.parse(readFileSync(cmd.bodyFile, "utf8"));
      }
      const r = await page.evaluate(async ({ url, method, body }) => {
        const t = localStorage.getItem("token");
        const resp = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(t ? { Authorization: `Bearer ${t}` } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: resp.status, text: await resp.text() };
      }, { url: cmd.url, method: cmd.method || "POST", body });
      const file = cmd.out || join(SHOT_DIR, "post.json");
      writeFileSync(file, r.text, "utf8");
      return { status: r.status, bytes: r.text.length, file, head: r.text.slice(0, 500) };
    }
    case "close": {
      await context.close().catch(() => {});
      process.exit(0);
    }
    default:
      return { error: `unknown cmd ${cmd.cmd}` };
  }
}

async function main() {
  const launchOpts = {
    headless: false,
    viewport: null,
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    args: ["--start-maximized"],
  };
  try {
    context = await pw.chromium.launchPersistentContext(PROFILE, {
      channel: process.env.EXAM_CHANNEL || "chrome",
      ...launchOpts,
    });
  } catch (e) {
    console.log(JSON.stringify({ warn: "chrome channel failed, using bundled chromium", error: String(e) }));
    context = await pw.chromium.launchPersistentContext(PROFILE, { ...launchOpts });
  }
  page = context.pages()[0] || (await context.newPage());
  // Auto-accept dialogs (e.g. 确认提交) so submit clicks complete without extra handling.
  const acceptDialogs = (p) => p.on("dialog", (d) => d.accept().catch(() => {}));
  context.on("page", (p) => acceptDialogs(p));
  acceptDialogs(page);
  console.log(JSON.stringify({ ready: true }));

  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  rl.on("line", async (line) => {
    const t = line.trim();
    if (!t) return;
    let cmd;
    try {
      cmd = JSON.parse(t);
    } catch {
      console.log(JSON.stringify({ error: "bad json" }));
      return;
    }
    try {
      const result = await runCommand(cmd);
      console.log(JSON.stringify(result));
    } catch (e) {
      console.log(JSON.stringify({ error: String(e) }));
    }
  });
}

main().catch((e) => {
  console.log(JSON.stringify({ fatal: String(e) }));
  process.exit(1);
});
