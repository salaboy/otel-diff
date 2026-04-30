#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="./otel-data"

if [ -d "${BASE_DIR}" ]; then
  echo "Removing existing ${BASE_DIR}..."
  rm -rf "${BASE_DIR}"
fi

SERVICES=(
  "default"
  "spring-merch-store-arconia-openinference"
  "python-merch-store-langchain-official"
  "spring-merch-store-arconia"
  "crew-merch-store"
  "spring-merch-store-arconia-langsmith"
  "python-merch-store-langchain-traceloop"
)

for svc in "${SERVICES[@]}"; do
  echo "Creating ${BASE_DIR}/${svc}/"
  mkdir -p "${BASE_DIR}/${svc}"
done

echo "Done. All directories created."
