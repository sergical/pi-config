#!/usr/bin/env bash
# ptmux - shorthand for pi tmux sessions
#
# Usage:
#   ptmux                  # list sessions
#   ptmux <name>           # attach to session
#   ptmux -k <name>        # kill session
#
# Add to your shell config:
#   source /Users/haza/Projects/pi-config/scripts/ptmux.sh

ptmux() {
  local socket="${TMPDIR:-/tmp}/pi-tmux-sockets/pi.sock"

  if [[ $# -eq 0 ]]; then
    tmux -S "$socket" list-sessions 2>/dev/null || echo "No pi tmux sessions running"
    return
  fi

  if [[ "$1" == "-k" ]]; then
    tmux -S "$socket" kill-session -t "$2"
    return
  fi

  tmux -S "$socket" attach -t "$1"
}
