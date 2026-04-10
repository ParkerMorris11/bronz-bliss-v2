#!/usr/bin/env bash

set -euo pipefail

message_file="${1:-}"

if [[ -z "${message_file}" ]]; then
  exit 0
fi

current_contents="$(cat "$message_file" 2>/dev/null || true)"

if [[ -n "$(printf '%s' "$current_contents" | tr -d '[:space:]')" ]]; then
  exit 0
fi

if git diff --cached --quiet --exit-code; then
  exit 0
fi

mapfile -t files < <(git diff --cached --name-only)

has_client=0
has_server=0
has_config=0
has_deps=0

for file in "${files[@]}"; do
  case "$file" in
    client/*)
      has_client=1
      ;;
    server/*|shared/*)
      has_server=1
      ;;
    package.json|package-lock.json|node_modules/.package-lock.json)
      has_deps=1
      ;;
    *.toml|*.config.*|drizzle.config.ts|vite.config.ts|tsconfig.json|tailwind.config.ts)
      has_config=1
      ;;
  esac
done

scope_parts=()
[[ $has_client -eq 1 ]] && scope_parts+=("client")
[[ $has_server -eq 1 ]] && scope_parts+=("server")
[[ $has_config -eq 1 ]] && scope_parts+=("config")
[[ $has_deps -eq 1 ]] && scope_parts+=("deps")

scope="project"
if [[ ${#scope_parts[@]} -gt 0 ]]; then
  scope="$(IFS='/'; printf '%s' "${scope_parts[*]}")"
fi

subject="update ${scope}"

if printf '%s\n' "${files[@]}" | grep -q '^client/src/pages/settings\.tsx$' && printf '%s\n' "${files[@]}" | grep -q '^server/routes\.ts$'; then
  subject="add password updates and SMS delivery"
fi

summary_lines=()
summary_lines+=("$subject")
summary_lines+=("")
summary_lines+=("Changes staged in this commit:")

for file in "${files[@]}"; do
  summary_lines+=("- ${file}")
done

printf '%s\n' "${summary_lines[@]}" > "$message_file"
