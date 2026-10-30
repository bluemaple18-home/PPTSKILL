"""S18 第二輪主機診斷：旁聽 scanner 的 OSError，不改寫受管 helper 或放寬閘門。"""

import argparse
import hashlib
import json
from pathlib import Path
import runpy
import sys


class ResourceObserver:
    def __init__(self, target):
        self.target = str(Path(target).resolve())
        self.source = Path(target).read_text().splitlines()
        self.events = []
        self.seen = set()
        self.scans = 0

    def trace(self, frame, event, arg):
        if (frame.f_code.co_filename != self.target
                or frame.f_code.co_name not in {'visit', 'scan_resource_artifacts'}):
            return None
        frame.f_trace_lines = False
        frame.f_trace_opcodes = False
        if event == 'call' and frame.f_code.co_name == 'scan_resource_artifacts':
            self.scans += 1
            self.seen.clear()
        if event == 'exception':
            error = arg[1]
            if isinstance(error, OSError) and id(error) not in self.seen:
                self.seen.add(id(error))
                entry = frame.f_locals.get('entry')
                self.events.append({
                    'type': type(error).__name__, 'errno': error.errno,
                    'strerror': error.strerror, 'filename': error.filename,
                    'filename2': error.filename2, 'message': str(error),
                    'function': frame.f_code.co_name, 'line': frame.f_lineno,
                    'source': self.source[frame.f_lineno - 1].strip(),
                    'relativeDirectory': list(frame.f_locals.get('relative', ())),
                    'entryName': getattr(entry, 'name', None),
                })
        if event == 'return' and frame.f_code.co_name == 'scan_resource_artifacts':
            self.seen.clear()
        return self.trace


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--diagnostic', required=True, type=Path)
    parser.add_argument('script', type=Path)
    parser.add_argument('arguments', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    script = args.script.resolve(strict=True)
    target = script.parent / 'tmp_artifact_lifecycle.py'
    assert script.name == 'tmp_session.py'
    assert not args.diagnostic.exists(), '禁止覆寫前輪診斷'
    observer = ResourceObserver(target)
    before = hashlib.sha256(target.read_bytes()).hexdigest()
    previous_trace = sys.gettrace()
    sys.dont_write_bytecode = True
    sys.path.insert(0, str(script.parent))
    sys.argv = [str(script), *args.arguments]
    try:
        sys.settrace(observer.trace)
        runpy.run_path(str(script), run_name='__main__')
    finally:
        sys.settrace(previous_trace)
        original_error = sys.exc_info()[1]
        try:
            record = {
                'status': 'IO_ERROR_OBSERVED' if observer.events else 'NO_IO_ERROR_OBSERVED',
                'scanner': str(target), 'scannerSha256Before': before,
                'scannerSha256After': hashlib.sha256(target.read_bytes()).hexdigest(),
                'scanCallsObserved': observer.scans, 'errors': observer.events,
                'lineAndOpcodeTracing': False,
            }
            with args.diagnostic.open('x') as output:
                output.write(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
        except Exception as diagnostic_error:
            # 診斷失敗不可取代既有非零退出；原成功則明示診斷不通過。
            try:
                sys.stderr.write('S18_DIAGNOSTIC_WRITE_FAILED: ' + repr(diagnostic_error) + '\n')
            except Exception:
                pass
            if original_error is None or (isinstance(original_error, SystemExit)
                                           and original_error.code in (None, 0)):
                raise SystemExit(74) from diagnostic_error



if __name__ == '__main__':
    main()
