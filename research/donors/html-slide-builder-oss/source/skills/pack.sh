#!/usr/bin/env bash
# 打包 slide-deck skill 成 Cowork 可以上傳的 ZIP。
#
# 範本與參考檔不放進 skills/ 保存第二份 —— 一份 deck 的規格只能有一個來源，
# 兩份遲早會不一樣。這支腳本在打包當下才從正本複製進去。
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${1:-debug/slide-deck-skill.zip}"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/slide-deck/template" "$STAGE/slide-deck/references"
cp skills/slide-deck/SKILL.md          "$STAGE/slide-deck/"
cp examples/starter/*.html             "$STAGE/slide-deck/template/"
cp references/slide-copy-zh-tw.md      "$STAGE/slide-deck/references/"
cp references/chart-vocabulary.yaml    "$STAGE/slide-deck/references/"

mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"
( cd "$STAGE" && zip -qr - slide-deck ) > "$OUT"

echo "打包完成：$OUT"
# BSD head 不吃 head -n -2（GNU 才有），用 awk 直接篩
unzip -l "$OUT" | awk '/^ *[0-9]+ /&&$NF!~/files?$/{printf "  %s\n", $NF}'
echo
echo "Cowork：左側 Customize → + → 上傳這個 ZIP"
echo "注意：Cowork 的 shell 跑在遠端沙箱，slide_lint.py 與編輯器要在本機的"
echo "      Claude Code 跑。Cowork 負責寫，Claude Code 負責驗。"
