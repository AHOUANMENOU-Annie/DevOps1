#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

course_repository='oseequenum/devops-m1'
required_disk_kb=$((2 * 1024 * 1024))
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

disk_space_available() {
  local available_kb
  available_kb="$(df -Pk . | awk 'NR == 2 { for (i = 2; i <= NF; i++) if ($i ~ /^[0-9]+%$/) { print $(i - 1); exit } }')"
  [ "$available_kb" -ge "$required_disk_kb" ]
}

personal_origin() {
  local url
  url="$(git remote get-url origin)" && ! printf '%s' "$url" | grep -qi "$course_repository"
}

course_remote() { git remote get-url cours | grep -qi "$course_repository"; }

port_free() { ! (exec 3<>"/dev/tcp/127.0.0.1/$1"); }

printf 'Diagnostic, séance 2\n'
check "docker présent"                                             command -v docker
check "moteur Docker actif"                                        docker info
check "docker compose disponible (séance 3)"                       docker compose version
check "image node:22-alpine présente (docker pull node:22-alpine)" docker image inspect node:22-alpine
check "au moins 2 Go d'espace disque libre"                        disk_space_available
check "remote origin pointe vers votre dépôt personnel"            personal_origin
check "remote cours pointe vers le dépôt du cours"                 course_remote
check "port 3001 libre"                                            port_free 3001
check "port 3002 libre"                                            port_free 3002

printf '\n'
if [ "$failures" -gt 0 ]; then
  printf 'Bilan : %s/%s, %s point(s) à corriger.\n' "$((total - failures))" "$total" "$failures"
  exit 1
fi
printf 'Bilan : %s/%s, poste prêt.\n' "$total" "$total"
