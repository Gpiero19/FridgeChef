#!/bin/bash

# Phase 0 setup — run this once before your first project.
# Safe to re-run at any time to verify your environment is intact.

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Agent Scaffold — Phase 0 Setup Check  ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ERRORS=0

# ── Required tools ────────────────────────────────────────────────

echo "Checking required tools..."
echo ""

if command -v claude &> /dev/null; then
    ok "Claude Code installed ($(claude --version 2>/dev/null || echo 'version unknown'))"
else
    fail "Claude Code not found"
    info "Install from: https://claude.ai/code"
    ERRORS=$((ERRORS + 1))
fi

if command -v git &> /dev/null; then
    ok "git installed ($(git --version))"
else
    fail "git not found — install git before proceeding"
    ERRORS=$((ERRORS + 1))
fi

if command -v node &> /dev/null; then
    ok "Node.js installed ($(node --version))"
else
    fail "Node.js not found — install from https://nodejs.org"
    ERRORS=$((ERRORS + 1))
fi

if command -v npx &> /dev/null; then
    ok "npx available"
else
    fail "npx not found — comes with Node.js, reinstall Node"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ── Playwright ────────────────────────────────────────────────────

echo "Setting up Playwright (used by test-agent for E2E browser tests)..."
echo ""

if npx playwright --version &> /dev/null; then
    ok "Playwright available ($(npx playwright --version))"
    echo "  Installing/updating browsers..."
    npx playwright install && ok "Playwright browsers ready" || warn "Browser install had warnings — run 'npx playwright install' manually"
else
    warn "Playwright not found — installing now..."
    npx playwright install && ok "Playwright installed" || fail "Playwright install failed — run 'npx playwright install' manually"
fi

echo ""

# ── Global MCP servers ───────────────────────────────────────────

echo "Installing global MCP servers..."
echo ""

claude mcp add context7 -- npx -y @upstash/context7-mcp 2>/dev/null \
  && ok "context7 MCP installed" \
  || warn "context7 MCP — already installed or failed (run manually: claude mcp add context7 -- npx -y @upstash/context7-mcp)"

claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking 2>/dev/null \
  && ok "sequential-thinking MCP installed" \
  || warn "sequential-thinking MCP — already installed or failed"

claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem ~/Documents/github 2>/dev/null \
  && ok "filesystem MCP installed (scoped to ~/Documents/github)" \
  || warn "filesystem MCP — already installed or failed"

claude mcp add git -- npx -y @cyanheads/git-mcp-server 2>/dev/null \
  && ok "git MCP installed" \
  || warn "git MCP — already installed or failed"

echo ""

# ── Environment variables ─────────────────────────────────────────

echo "Checking MCP environment variables..."
echo ""

MISSING_VARS=()

if [ -n "$GITHUB_TOKEN" ]; then
    ok "GITHUB_TOKEN is set"
else
    warn "GITHUB_TOKEN not set — GitHub MCP will not work"
    MISSING_VARS+=("GITHUB_TOKEN")
fi

if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
    ok "SUPABASE_ACCESS_TOKEN is set"
else
    info "SUPABASE_ACCESS_TOKEN not set (only needed for Supabase projects)"
fi

if [ -n "$DATABASE_URL" ]; then
    ok "DATABASE_URL is set"
else
    info "DATABASE_URL not set (only needed for raw Postgres projects)"
fi

echo ""

# ── Shell export instructions ─────────────────────────────────────

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}Add the following to your ~/.zshrc (or ~/.bash_profile):${NC}"
    echo ""
    for var in "${MISSING_VARS[@]}"; do
        lower=$(echo "$var" | tr '[:upper:]' '[:lower:]')
        echo "  export $var=your_${lower}_here"
    done
    echo ""
    echo "  Then run: source ~/.zshrc"
    echo ""
    echo "  Get your GitHub token at:"
    echo "  https://github.com/settings/tokens"
    echo "  Required scopes: repo, workflow"
    echo ""
fi

# ── Summary ───────────────────────────────────────────────────────

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $ERRORS -eq 0 ] && [ ${#MISSING_VARS[@]} -eq 0 ]; then
    echo ""
    ok "Phase 0 complete — all systems ready."
    echo ""
    echo "  Next steps for each new project:"
    echo "  1. Create project folder + git init"
    echo "  2. Copy scaffold files into the project"
    echo "  3. Open CHECKLIST.md and follow every step"
    echo ""
elif [ $ERRORS -eq 0 ]; then
    echo ""
    warn "Phase 0 mostly complete — set missing environment variables above."
    echo ""
    echo "  Once variables are set, re-run: bash setup.sh"
    echo ""
else
    echo ""
    fail "Phase 0 incomplete — fix the errors above before starting projects."
    echo ""
fi
