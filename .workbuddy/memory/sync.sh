#!/bin/bash
# WorkBuddy 多设备同步脚本
#
# 用法：
#   bash .workbuddy/memory/sync.sh [GITHUB_PAT]
#
# 自动检测模式：
#   老设备（~/.workbuddy/MEMORY.md 已存在）→ 备份身份 + 同步日志 + commit + push
#   新设备（~/.workbuddy/MEMORY.md 不存在）→ 恢复身份 + 恢复日志 + 配置 Git + 装依赖

set -e

# ===== 路径定义 =====
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WORKSPACE_ROOT="$(cd "$REPO_ROOT/.." && pwd)"
WORKSPACE_MEMORY="$WORKSPACE_ROOT/.workbuddy/memory"
USER_WB="$HOME/.workbuddy"

# ===== 常量 =====
GIT_NAME="123qinyi"
GIT_EMAIL="sunzeqin@enjoymi.com"
FETCH_URL="https://gh-proxy.com/https://github.com/123qinyi/toolbox-v2.git"
PUSH_URL_BASE="https://github.com/123qinyi/toolbox-v2.git"

# 身份文件映射：repo 备份名 → 用户级文件名
declare -A IDENTITY=(
  ["USER_MEMORY_BACKUP.md"]="MEMORY.md"
  ["SOUL_BACKUP.md"]="SOUL.md"
  ["IDENTITY_BACKUP.md"]="IDENTITY.md"
  ["USER_BACKUP.md"]="USER.md"
)

# ===== 健全性检查 =====
if [ ! -d "$REPO_ROOT/.git" ]; then
  echo "错误：未找到 Git 仓库，请确保在 toolbox-v2 项目内运行"
  exit 1
fi

# ===== 模式检测 =====
if [ -f "$USER_WB/MEMORY.md" ]; then
  MODE="sync"
else
  MODE="setup"
fi

# ==========================================
#  SYNC 模式（老设备，离开前执行）
# ==========================================
if [ "$MODE" = "sync" ]; then
  echo "========================================"
  echo "  同步模式：备份并推送"
  echo "========================================"
  echo ""

  # 1. 备份身份文件到 repo
  echo "[1/3] 备份身份文件..."
  for backup in "${!IDENTITY[@]}"; do
    src="$USER_WB/${IDENTITY[$backup]}"
    if [ -f "$src" ]; then
      cp "$src" "$SCRIPT_DIR/$backup"
      echo "  ${IDENTITY[$backup]} -> $backup"
    fi
  done

  # 2. 同步工作区日志到 repo
  echo "[2/3] 同步工作区日志..."
  if [ -d "$WORKSPACE_MEMORY" ]; then
    for f in "$WORKSPACE_MEMORY"/*.md; do
      [ -f "$f" ] || continue
      cp "$f" "$SCRIPT_DIR/$(basename "$f")"
      echo "  $(basename "$f")"
    done
  else
    echo "  工作区日志目录不存在，跳过"
  fi

  # 3. 提交并推送
  echo "[3/3] 提交并推送..."
  cd "$REPO_ROOT"
  git add .workbuddy/memory/
  if git diff --cached --quiet; then
    echo "  无变更，跳过提交"
  else
    git commit -m "sync: $(date '+%Y-%m-%d %H:%M') 多设备同步"
    echo "  已提交"
  fi
  git push origin main
  echo ""
  echo "========================================"
  echo "  同步完成，可安全切换设备"
  echo "========================================"

# ==========================================
#  SETUP 模式（新设备，clone 后首次执行）
# ==========================================
else
  echo "========================================"
  echo "  初始化模式：恢复并配置"
  echo "========================================"
  echo ""

  # 1. 恢复身份文件
  echo "[1/5] 恢复身份文件..."
  mkdir -p "$USER_WB"
  for backup in "${!IDENTITY[@]}"; do
    src="$SCRIPT_DIR/$backup"
    dst="$USER_WB/${IDENTITY[$backup]}"
    if [ -f "$src" ]; then
      cp "$src" "$dst"
      echo "  $backup -> ~/.workbuddy/${IDENTITY[$backup]}"
    else
      echo "  [跳过] $backup 不存在"
    fi
  done

  # 2. 恢复工作区日志
  echo "[2/5] 恢复工作区日志..."
  mkdir -p "$WORKSPACE_MEMORY"
  for f in "$SCRIPT_DIR"/*.md; do
    [ -f "$f" ] || continue
    fname="$(basename "$f")"
    [[ "$fname" == *_BACKUP.md ]] && continue
    cp "$f" "$WORKSPACE_MEMORY/$fname"
    echo "  $fname"
  done

  # 3. 配置 Git 全局
  echo "[3/5] 配置 Git..."
  git config --global user.name "$GIT_NAME"
  git config --global user.email "$GIT_EMAIL"
  git config --global http.postBuffer 524288000
  echo "  user.name=$GIT_NAME  user.email=$GIT_EMAIL"

  # 4. 配置 remote（fetch 走代理，push 走直连 + PAT）
  echo "[4/5] 配置 Git remote..."
  cd "$REPO_ROOT"
  git remote set-url origin "$FETCH_URL"

  PAT="${1:-${GITHUB_PAT:-}}"
  CURRENT_PUSH=$(git remote get-url --push origin 2>/dev/null || echo "")
  if [ -n "$PAT" ]; then
    git remote set-url --push origin "https://$GIT_NAME:${PAT}@github.com/123qinyi/toolbox-v2.git"
    echo "  push URL 已配置（使用提供的 PAT）"
  elif echo "$CURRENT_PUSH" | grep -qE "github_pat_|ghp_"; then
    echo "  push URL 已包含认证，跳过"
  else
    git remote set-url --push origin "$PUSH_URL_BASE"
    echo "  [需手动配置 PAT] 请执行以下任一方式："
    echo "    GITHUB_PAT=你的token bash .workbuddy/memory/sync.sh"
    echo "    git remote set-url --push origin https://$GIT_NAME:你的token@github.com/123qinyi/toolbox-v2.git"
  fi

  # 5. 安装依赖 + build 验证
  echo "[5/5] 安装依赖并验证..."
  cd "$REPO_ROOT"
  npm install
  if npm run build > /tmp/wb_build.log 2>&1; then
    echo "  Build 通过"
  else
    echo "  [警告] Build 失败，最后 10 行："
    tail -10 /tmp/wb_build.log
  fi

  echo ""
  echo "========================================"
  echo "  初始化完成！"
  echo "========================================"
  echo ""
  echo "日常切换："
  echo "  离开设备：bash .workbuddy/memory/sync.sh"
  echo "  新设备：  git pull && bash .workbuddy/memory/sync.sh"
  echo ""
  echo "工具地址：https://123qinyi.github.io/toolbox-v2/"
fi
