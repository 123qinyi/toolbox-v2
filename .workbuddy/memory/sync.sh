#!/bin/bash
# WorkBuddy 多设备同步脚本
#
# 用法：
#   bash .workbuddy/memory/sync.sh [GITHUB_PAT]
#
# 自动检测模式：
#   已配置设备（~/.workbuddy/MEMORY.md 已存在）→ 备份本地 → 拉取远程 → 恢复到本地 → 推送
#   新设备（~/.workbuddy/MEMORY.md 不存在）→ 恢复身份 + 恢复日志 + 配置 Git + 装依赖
#
# 日常切换：
#   离开设备A：bash .workbuddy/memory/sync.sh
#   到了设备B：bash .workbuddy/memory/sync.sh（自动拉取A的最新内容并恢复到本地）

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
#  SYNC 模式（已配置设备，切换前后均可执行）
# ==========================================
if [ "$MODE" = "sync" ]; then
  echo "========================================"
  echo "  同步模式：备份 → 拉取 → 恢复 → 推送"
  echo "========================================"
  echo ""

  cd "$REPO_ROOT"

  # 1. 备份本地身份文件 + 工作区日志到 repo
  echo "[1/4] 备份本地文件..."
  for backup in "${!IDENTITY[@]}"; do
    src="$USER_WB/${IDENTITY[$backup]}"
    if [ -f "$src" ]; then
      cp "$src" "$SCRIPT_DIR/$backup"
      echo "  ${IDENTITY[$backup]} -> $backup"
    fi
  done
  if [ -d "$WORKSPACE_MEMORY" ]; then
    for f in "$WORKSPACE_MEMORY"/*.md; do
      [ -f "$f" ] || continue
      cp "$f" "$SCRIPT_DIR/$(basename "$f")"
      echo "  $(basename "$f")"
    done
  else
    echo "  工作区日志目录不存在，跳过"
  fi

  # 2. 提交本地变更 + 拉取远程
  echo "[2/4] 提交本地变更并拉取远程..."
  git add .workbuddy/memory/
  if git diff --cached --quiet 2>/dev/null; then
    echo "  本地无新变更"
  else
    git commit -m "sync: $(date '+%Y-%m-%d %H:%M') 多设备同步"
    echo "  本地变更已提交"
  fi

  git pull origin main 2>/dev/null || true
  if git diff --name-only --diff-filter=U 2>/dev/null | grep -q .; then
    echo ""
    echo "  ⚠ 合并冲突！两台设备可能同时修改了同一文件。"
    echo "  请手动解决冲突后执行："
    echo "    git add .workbuddy/memory/ && git commit && git push origin main"
    exit 1
  fi
  echo "  拉取完成"

  # 3. 恢复 repo 文件到本地（获取其他设备的最新版本）
  echo "[3/4] 恢复到本地..."
  for backup in "${!IDENTITY[@]}"; do
    src="$SCRIPT_DIR/$backup"
    dst="$USER_WB/${IDENTITY[$backup]}"
    if [ -f "$src" ]; then
      cp "$src" "$dst"
      echo "  $backup -> ~/.workbuddy/${IDENTITY[$backup]}"
    fi
  done
  mkdir -p "$WORKSPACE_MEMORY"
  for f in "$SCRIPT_DIR"/*.md; do
    [ -f "$f" ] || continue
    fname="$(basename "$f")"
    [[ "$fname" == *_BACKUP.md ]] && continue
    cp "$f" "$WORKSPACE_MEMORY/$fname"
    echo "  $fname -> 工作区日志"
  done

  # 4. 推送
  echo "[4/4] 推送..."
  if git push origin main 2>/dev/null; then
    echo "  推送成功"
  else
    echo "  [警告] 推送失败（可能是网络问题），本地变更已保存，可稍后重试"
  fi
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

  # 3. 配置 Git 全局 + 凭据管理
  echo "[3/5] 配置 Git..."
  git config --global user.name "$GIT_NAME"
  git config --global user.email "$GIT_EMAIL"
  git config --global http.postBuffer 524288000
  echo "  user.name=$GIT_NAME  user.email=$GIT_EMAIL"

  # 凭据管理：清除 PortableGit 自带的 GCM，改用 store
  # 空字符串清除系统级继承的 helper，再添加 store 为唯一 helper
  git config --global credential.helper ""
  git config --global --add credential.helper store
  echo "  credential.helper=store（已清除 GCM 干扰）"

  # 4. 配置 remote（fetch 走代理，push 走直连）+ 写入凭据
  echo "[4/5] 配置 Git remote..."
  cd "$REPO_ROOT"
  git remote set-url origin "$FETCH_URL"
  git remote set-url --push origin "$PUSH_URL_BASE"
  echo "  fetch=$FETCH_URL"
  echo "  push=$PUSH_URL_BASE"

  PAT="${1:-${GITHUB_PAT:-}}"
  if [ -n "$PAT" ]; then
    # 写入 .git-credentials（store helper 会自动读取）
    CRED_FILE="$HOME/.git-credentials"
    echo "https://$GIT_NAME:${PAT}@github.com" > "$CRED_FILE"
    chmod 600 "$CRED_FILE" 2>/dev/null
    echo "  PAT 已写入 ~/.git-credentials"
    # 验证认证
    if git ls-remote --heads origin > /dev/null 2>&1; then
      echo "  认证验证通过"
    else
      echo "  [警告] 认证验证失败，请检查 PAT 是否有效"
    fi
  else
    echo "  [需手动配置 PAT] 请执行："
    echo "    GITHUB_PAT=你的token bash .workbuddy/memory/sync.sh"
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
  echo "日常切换（两台设备都配过后）："
  echo "  离开设备：bash .workbuddy/memory/sync.sh"
  echo "  到了设备：bash .workbuddy/memory/sync.sh"
  echo "  （脚本自动拉取远程 + 恢复到本地 + 备份本地 + 推送）"
  echo ""
  echo "工具地址：https://123qinyi.github.io/toolbox-v2/"
fi
