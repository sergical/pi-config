#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXPECTED_DIR="$HOME/.pi/agent"

# ─── Verify location ──────────────────────────────────────────────────────────
if [ "$SCRIPT_DIR" != "$EXPECTED_DIR" ]; then
  echo "⚠️  This repo should live at ~/.pi/agent/"
  echo "   Current location: $SCRIPT_DIR"
  echo ""
  echo "   Option 1 — Clone directly:"
  echo "     git clone git@github.com:sergical/pi-config.git $EXPECTED_DIR"
  echo ""
  echo "   Option 2 — Move existing clone:"
  echo "     mv $SCRIPT_DIR $EXPECTED_DIR"
  echo ""
  exit 1
fi

echo "Setting up pi-config at $EXPECTED_DIR"
echo ""

# ─── Settings ──────────────────────────────────────────────────────────────────
if [ ! -f "$EXPECTED_DIR/settings.json" ]; then
  echo "Which Claude provider do you want to use?"
  echo "  1) anthropic  — Direct Anthropic API (needs API key or /login)"
  echo "  2) bedrock    — AWS Bedrock (needs AWS credentials)"
  echo ""
  read -rp "Choose [1/2] (default: 1): " provider_choice

  case "$provider_choice" in
    2|bedrock)
      PROVIDER="amazon-bedrock"
      DEFAULT_MODEL="us.anthropic.claude-sonnet-4-6"
      echo ""
      echo "  Using Bedrock. Make sure AWS credentials are configured:"
      echo "    export AWS_PROFILE=your-profile"
      echo "    # or AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY"
      echo "    # optional: AWS_REGION (defaults to us-east-1)"
      ;;
    *)
      PROVIDER="anthropic"
      DEFAULT_MODEL="claude-sonnet-4-6"
      ;;
  esac

  cat > "$EXPECTED_DIR/settings.json" << EOF
{
  "defaultThinkingLevel": "high",
  "defaultProvider": "$PROVIDER",
  "defaultModel": "$DEFAULT_MODEL",
  "hideThinkingBlock": false,
  "packages": [
    "git:github.com/nicobailon/pi-subagents",
    "git:github.com/nicobailon/pi-mcp-adapter",
    "git:github.com/HazAT/pi-smart-sessions",
    "git:github.com/HazAT/pi-parallel",
    "git:github.com/HazAT/glimpse",
    "git:github.com/sasha-computer/pi-cmux"
  ]
}
EOF
  echo ""
  echo "  ✓ Created settings.json (provider: $PROVIDER, model: $DEFAULT_MODEL)"
  echo ""
else
  echo "settings.json already exists — skipping"
  echo ""
fi

# ─── Install packages ─────────────────────────────────────────────────────────
echo "Installing packages..."
pi install git:github.com/nicobailon/pi-subagents 2>/dev/null || echo "  pi-subagents already installed"
pi install git:github.com/nicobailon/pi-mcp-adapter 2>/dev/null || echo "  pi-mcp-adapter already installed"
pi install git:github.com/HazAT/pi-smart-sessions 2>/dev/null || echo "  pi-smart-sessions already installed"
pi install git:github.com/HazAT/pi-parallel 2>/dev/null || echo "  pi-parallel already installed"
pi install git:github.com/HazAT/glimpse 2>/dev/null || echo "  glimpse already installed"
pi install git:github.com/sasha-computer/pi-cmux 2>/dev/null || echo "  pi-cmux already installed"
echo ""

# ─── Extension dependencies ───────────────────────────────────────────────────
if [ -f "$EXPECTED_DIR/extensions/claude-tool/package.json" ]; then
  echo "Installing claude-tool dependencies..."
  cd "$EXPECTED_DIR/extensions/claude-tool" && npm install --silent
  cd "$EXPECTED_DIR"
  echo ""
fi

# ─── Auth reminder ─────────────────────────────────────────────────────────────
PROVIDER_SET=$(grep -o '"defaultProvider": *"[^"]*"' "$EXPECTED_DIR/settings.json" | grep -o '"[^"]*"$' | tr -d '"')

if [ "$PROVIDER_SET" = "amazon-bedrock" ]; then
  if ! aws sts get-caller-identity &>/dev/null; then
    echo "⚠️  AWS credentials not found. Bedrock needs valid AWS auth:"
    echo "     export AWS_PROFILE=your-profile"
    echo "     # or AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY"
    echo ""
  else
    echo "  ✓ AWS credentials detected"
    echo ""
  fi
elif [ ! -f "$EXPECTED_DIR/auth.json" ]; then
  echo "⚠️  No auth.json found. Set up authentication:"
  echo "   Option 1: Run 'pi' and use /login"
  echo "   Option 2: Create ~/.pi/agent/auth.json:"
  echo '     {"anthropic": {"type": "api_key", "key": "sk-ant-..."}}'
  echo ""
fi

echo "✅ Setup complete! Restart pi to pick up changes."
echo ""
echo "Quick reference:"
echo "  Switch provider:  Edit settings.json → defaultProvider"
echo "  Switch model:     Edit settings.json → defaultModel (or use /model in pi)"
echo "  Anthropic:        \"defaultProvider\": \"anthropic\""
echo "  Bedrock:          \"defaultProvider\": \"amazon-bedrock\""
