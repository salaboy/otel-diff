#!/usr/bin/env bash
set -euo pipefail

SPRING_PAYLOAD='{
  "conversationId": "123",
  "message": "show me all the socks in the store"
}'

PYTHON_PAYLOAD='{
  "conversation_id": "123",
  "message": "show me all the socks in the store"
}'
ENDPOINT="/api/chat/stream"

SERVICES=(
  "spring-merch-store-arconia-openinference:8081"
  "python-merch-store-langchain-official:8082"
  "spring-merch-store-arconia:8083"
  "crew-merch-store:8084"
  "spring-merch-store-arconia-langsmith:8086"
  "python-merch-store-langchain-traceloop:8085"
)

for entry in "${SERVICES[@]}"; do
  name="${entry%%:*}"
  port="${entry##*:}"
  url="http://localhost:${port}${ENDPOINT}"

  if [[ "${name}" == spring-* ]]; then
    payload="${SPRING_PAYLOAD}"
  else
    payload="${PYTHON_PAYLOAD}"
  fi

  echo "============================================"
  echo "Sending request to ${name} (${url})"
  echo "============================================"
  curl -s -N -X POST "${url}" \
    -H "Content-Type: application/json" \
    -H "Accept: text/event-stream" \
    -d "${payload}"
  echo ""
  echo ""
done

echo "All requests completed."
