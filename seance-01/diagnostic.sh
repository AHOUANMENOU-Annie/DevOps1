#!/usr/bin/env bash
set -uo pipefail

total=0
failures=0

check() {
  local label="$1"
  shift
  total=$((total + 1))
  if "$@" >/dev/null 2>&1; then
    printf '  [ok]  %s\n' "$label"
  else
    printf '  [!!]  %s\n' "$label"
    failures=$((failures + 1))
  fi
}

node_ready() {
  command -v node && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 18 ]
}

git_identity() { [ -n "$(git config --global "$1")" ]; }

ssh_public_key() { compgen -G "$HOME/.ssh/*.pub"; }

docker_ready() { command -v docker && docker info; }

port_free() { ! (exec 3<>"/dev/tcp/127.0.0.1/$1"); }

printf 'Diagnostic, séance 1\n'
check "node présent, version 18 ou plus"             node_ready
check "npm présent"                                  command -v npm
check "git présent"                                  command -v git
check "git user.name configuré"                      git_identity user.name
check "git user.email configuré"                     git_identity user.email
check "ssh-keygen présent"                           command -v ssh-keygen
check "clé publique dans ~/.ssh"                     ssh_public_key
check "docker présent, moteur actif (séance 2)"      docker_ready
check "port 3001 libre"                              port_free 3001
check "port 3002 libre"                              port_free 3002

printf '\n'
if [ "$failures" -gt 0 ]; then
  printf 'Bilan : %s/%s, %s point(s) à corriger.\n' "$((total - failures))" "$total" "$failures"
  exit 1
fi
printf 'Bilan : %s/%s, poste prêt.\n' "$total" "$total"
