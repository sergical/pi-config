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
  echo "Creating settings.json from template..."
  cat > "$EXPECTED_DIR/settings.json" << 'EOF'
{
  "defaultThinkingLevel": "high",
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-6",
  "hideThinkingBlock": false,
  "packages": [
    "git:github.com/nicobailon/pi-subagents",
    "git:github.com/nicobailon/pi-mcp-adapter",
    "git:github.com/HazAT/pi-smart-sessions"
  ]
}
EOF
  echo "  ✓ Created settings.json (default: anthropic + claude-sonnet-4-6)"
  echo ""
  echo "  To use Bedrock instead, edit settings.json:"
  echo '    "defaultProvider": "amazon-bedrock"'
  echo "  And set AWS_PROFILE or AWS credentials in your shell."
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
echo ""

# ─── Auth reminder ─────────────────────────────────────────────────────────────
if [ ! -f "$EXPECTED_DIR/auth.json" ]; then
  echo "⚠️  No auth.json found. Set up authentication:"
  echo "   Option 1: Run 'pi' and use /login"
  echo "   Option 2: Create ~/.pi/agent/auth.json:"
  echo '     {"anthropic": {"type": "api_key", "key": "sk-ant-..."}}'
  echo ""
  echo "   For Bedrock: set AWS_PROFILE or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY"
  echo ""
fi

echo "✅ Setup complete! Restart pi to pick up changes."
echo ""
echo "Quick reference:"
echo "  Switch provider:  Edit settings.json → defaultProvider"
echo "  Switch model:     Edit settings.json → defaultModel (or use /model in pi)"
echo "  Anthropic:        \"defaultProvider\": \"anthropic\""
echo "  Bedrock:          \"defaultProvider\": \"amazon-bedrock\""
