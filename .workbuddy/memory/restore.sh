#!/bin/bash
# WorkBuddy 记忆与身份恢复脚本
# 用法：在新设备 clone 仓库后执行
#   cd toolbox-v2 && bash .workbuddy/memory/restore.sh

set -e

# 脚本所在目录（仓库里的 .workbuddy/memory/）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 目标目录（用户级 ~/.workbuddy/）
TARGET_DIR="$HOME/.workbuddy"

# 创建目标目录（不存在则创建）
mkdir -p "$TARGET_DIR"

# 文件映射：备份文件 -> 目标文件
declare -A FILES=(
  ["USER_MEMORY_BACKUP.md"]="MEMORY.md"
  ["SOUL_BACKUP.md"]="SOUL.md"
  ["IDENTITY_BACKUP.md"]="IDENTITY.md"
  ["USER_BACKUP.md"]="USER.md"
)

echo "========================================"
echo "  WorkBuddy 记忆与身份恢复"
echo "========================================"
echo ""

# 逐个恢复
for backup in "${!FILES[@]}"; do
  target="${FILES[$backup]}"
  src="$SCRIPT_DIR/$backup"
  dst="$TARGET_DIR/$target"

  if [ -f "$src" ]; then
    cp "$src" "$dst"
    echo "[OK] $backup -> ~/.workbuddy/$target"
  else
    echo "[SKIP] $backup 不存在，跳过"
  fi
done

echo ""
echo "========================================"
echo "  恢复完成！"
echo "========================================"
echo ""
echo "已恢复的文件："
echo "  ~/.workbuddy/MEMORY.md    (用户级长期记忆)"
echo "  ~/.workbuddy/SOUL.md      (沁一灵魂定义)"
echo "  ~/.workbuddy/IDENTITY.md  (身份信息)"
echo "  ~/.workbuddy/USER.md      (用户档案)"
echo ""
echo "下一步："
echo "  1. cd toolbox-v2 && npm install"
echo "  2. 配置 GitHub token（首次 push 需要）"
echo "  3. 工具地址：https://123qinyi.github.io/toolbox-v2/"
