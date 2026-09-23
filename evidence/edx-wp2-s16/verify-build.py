import subprocess,pathlib,json
r=pathlib.Path('/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical');e=r/'evidence/edx-wp2-s16'
files=(e/'nonbrowser-files.txt').read_text().splitlines()
assert all((r/f).is_file() for f in files)
for name,args in [('nonbrowser',['/opt/homebrew/bin/node','--test',*files]),('build-dist',['/opt/homebrew/bin/pnpm','run','build:dist']),('distribution-probe',['/opt/homebrew/bin/pnpm','run','probe:dist','--','--archive','dist/PPTSKILL-0.1.0.zip','--output','evidence/edx-wp2-s16/distribution-lifecycle.json'])]:
 print(name+' started',flush=True)
 with (e/(name+'.log')).open('w') as log: x=subprocess.run(args,cwd=r,stdout=log,stderr=subprocess.STDOUT)
 print(name+' exit='+str(x.returncode),flush=True)
 if x.returncode: raise SystemExit(x.returncode)
