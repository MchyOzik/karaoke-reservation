#!/bin/bash
# Build Lambda deployment packages (install Python dependencies)
# Run this from the project root BEFORE terraform apply

set -e
echo "🎤 Building Lambda packages..."

LAMBDAS=("rooms" "confirm")   # only these need pymysql

for fn in "${LAMBDAS[@]}"; do
  echo "📦 Building lambda/$fn ..."
  pip install -r "lambda/$fn/requirements.txt" -t "lambda/$fn/" --quiet
  echo "✅ lambda/$fn done"
done

echo ""
echo "✅ All Lambda packages built!"
echo "   Now run: cd terraform && terraform init && terraform apply"
