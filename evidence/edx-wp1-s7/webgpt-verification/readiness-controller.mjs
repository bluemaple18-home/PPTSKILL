import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

export function parsePortFile(text) {
  const lines = text.trimEnd().split(/\r?\n/);
  if (lines.length !== 2 || !/^[0-9]+$/.test(lines[0])) return null;
  const port = Number(lines[0]), endpoint = lines[1];
  if (port < 1 || port > 65535 || !/^\/devtools\/browser\/[A-Za-z0-9-]+$/.test(endpoint)) return null;
  return { port, endpoint };
}

// 只等待 caller 宣告的 owned 檔案；不啟動、終止或清理 browser。
export async function waitForPortFile(path, supervisorAlive, {
  timeoutMs = 12000, intervalMs = 50, now = () => performance.now(),
  read = (path, options) => readFile(path, options),
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
} = {}) {
  const deadline = now() + timeoutMs;
  let polls = 0, lastRead = 'not_read';
  const result = (exitCode, fields = {}) => ({ exitCode, polls, lastRead, ...fields });
  while (now() < deadline) {
    if (!supervisorAlive()) return result(27);
    const remaining = deadline - now();
    if (remaining <= 0) break;
    const abort = new AbortController();
    let timer, content;
    try {
      // 讀取也受剩餘時間限制；超時後不等待未完成的 I/O，不接受遲到結果。
      content = await Promise.race([
        read(path, { encoding: 'utf8', signal: abort.signal }),
        new Promise((_, reject) => { timer = setTimeout(() => {
          abort.abort(); reject(Object.assign(new Error('read deadline'), { code: 'READ_DEADLINE' }));
        }, remaining); }),
      ]);
      lastRead = 'read';
    } catch (error) { lastRead = error.code || error.name; }
    finally { clearTimeout(timer); }
    polls++;
    if (now() >= deadline) return result(28);
    if (!supervisorAlive()) return result(27);
    const parsed = content === undefined ? null : parsePortFile(content);
    if (parsed) return result(0, parsed);
    if (content !== undefined) lastRead = 'invalid_content';
    const budget = deadline - now();
    if (budget > 0) await sleep(Math.min(intervalMs, budget));
  }
  return result(28);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [path, pidText] = process.argv.slice(2), pid = Number(pidText);
  if (!path || !/^[0-9]+$/.test(pidText || '') || !Number.isSafeInteger(pid) || pid <= 0) {
    console.error('usage: node readiness-controller.mjs <owned-port-file> <supervisor-pid>');
    process.exitCode = 2;
  } else {
    const alive = () => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
    const outcome = await waitForPortFile(path, alive);
    console.error(JSON.stringify(outcome));
    if (!outcome.exitCode) console.log(`${outcome.port}\n${outcome.endpoint}`);
    process.exitCode = outcome.exitCode;
  }
}
