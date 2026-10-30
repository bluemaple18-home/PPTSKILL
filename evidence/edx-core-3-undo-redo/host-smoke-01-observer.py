"""host-smoke-01 的 call/exception/return 旁聽；不改 scanner 判定。"""
import argparse
from contextlib import contextmanager
import hashlib
import json
from pathlib import Path
import runpy
import sys
import time


class ResourceObserver:
    def __init__(self, target, journal=None):
        self.target = str(Path(target).resolve())
        self.journal = journal
        self.scans = []
        self.active = {}
        self.diagnostic_errors = []
        self.trace_events = set()

    def emit(self, record):
        if self.journal is not None:
            self.journal.write(json.dumps(record, ensure_ascii=False) + '\n')
            self.journal.flush()

    def trace(self, frame, event, arg):
        if frame.f_code.co_filename != self.target or frame.f_code.co_name not in {'visit', 'scan_resource_artifacts'}:
            return None
        frame.f_trace_lines = False
        frame.f_trace_opcodes = False
        try:
            self.trace_events.add(event)
            if event == 'call' and frame.f_code.co_name == 'scan_resource_artifacts':
                limits = frame.f_locals.get('limits')
                record = {'id': len(self.scans) + 1, 'kind': 'cleanup' if limits is None else 'runtime',
                          'root': str(frame.f_locals.get('root')), 'limits': None if limits is None else dict(limits),
                          'startedMonotonic': time.monotonic(), 'outcome': 'UNKNOWN', 'events': []}
                self.scans.append(record)
                self.active[id(frame)] = record
                self.emit({'phase': 'start', **record})
            parent = frame
            while parent is not None and id(parent) not in self.active:
                parent = parent.f_back
            if parent is None:
                return self.trace
            record = self.active[id(parent)]
            if event == 'exception':
                error = arg[1]
                # 不去重 exception 傳播；每個 trace event 都保留，不能當成獨立 I/O 次數。
                record['events'].append({'type': type(error).__name__, 'message': str(error),
                    'errno': getattr(error, 'errno', None), 'function': frame.f_code.co_name,
                    'line': frame.f_lineno, 'relativeDirectory': list(frame.f_locals.get('relative', ())),
                    'entryName': getattr(frame.f_locals.get('entry'), 'name', None)})
                self.emit({'phase': 'exception', 'scanId': record['id'], 'event': record['events'][-1]})
            if event == 'return' and frame is parent:
                complete = type(arg) is tuple and len(arg) == 2 and all(type(v) is int and v >= 0 for v in arg)
                io = [e for e in record['events'] if e['errno'] is not None]
                recovered = frame.f_locals.get('recovered') is True
                if complete:
                    outcome = 'RECOVERED_COMPLETE' if recovered and any(e['errno'] == 2 for e in io) else 'COMPLETE'
                elif any('runtime budget exceeded' in e['message'] for e in record['events']):
                    outcome = 'BUDGET_REJECTED'
                else:
                    outcome = 'FAILED' if record['events'] else 'UNKNOWN'
                record.update(outcome=outcome, counts=list(arg) if complete else None,
                              entries=frame.f_locals.get('entries'), recovered=recovered,
                              partialCounts=[frame.f_locals.get('total_bytes'), frame.f_locals.get('total_files')],
                              elapsedMs=(time.monotonic() - record['startedMonotonic']) * 1000)
                self.active.pop(id(parent))
                self.emit({'phase': 'end', **record})
        except Exception as error:
            # 旁聽故障不得改寫 scanner 的 return 或 exception；最終診斷明示不完整。
            self.diagnostic_errors.append(repr(error))
        return self.trace

    @contextmanager
    def watching(self):
        previous = sys.gettrace()
        try:
            sys.settrace(self.trace)
            yield self
        finally:
            sys.settrace(previous)

    def report(self):
        return {'scans': self.scans, 'unfinishedScans': list(self.active),
                'diagnosticErrors': self.diagnostic_errors,
                'traceEvents': sorted(self.trace_events), 'lineAndOpcodeTracing': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--diagnostic', type=Path, required=True)
    parser.add_argument('--journal', type=Path, required=True)
    parser.add_argument('script', type=Path)
    parser.add_argument('arguments', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    script = args.script.resolve(strict=True)
    if script.name != 'tmp_session.py':
        raise ValueError('只允許本輪既有 tmp_session.py')
    target = script.parent / 'tmp_artifact_lifecycle.py'
    before = hashlib.sha256(target.read_bytes()).hexdigest()
    old_argv, old_path = sys.argv[:], sys.path[:]
    observer = None
    with args.journal.open('x', encoding='utf-8') as stream:
        observer = ResourceObserver(target, stream)
        try:
            sys.path.insert(0, str(script.parent))
            sys.argv = [str(script), *args.arguments]
            with observer.watching():
                runpy.run_path(str(script), run_name='__main__')
        finally:
            original_error = sys.exc_info()[1]
            sys.argv, sys.path[:] = old_argv, old_path
            try:
                record = {**observer.report(), 'scanner': str(target), 'scannerSha256Before': before,
                          'scannerSha256After': hashlib.sha256(target.read_bytes()).hexdigest()}
                with args.diagnostic.open('x', encoding='utf-8') as output:
                    json.dump(record, output, ensure_ascii=False, indent=2)
                    output.write('\n')
            except Exception as error:
                print('HOST_SMOKE_DIAGNOSTIC_WRITE_FAILED: ' + repr(error), file=sys.stderr)
                if original_error is None or (isinstance(original_error, SystemExit) and original_error.code in (None, 0)):
                    raise SystemExit(74) from error


if __name__ == '__main__':
    main()
