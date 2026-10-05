#!/usr/bin/env bash
# ==============================================================================
# Turnkey Verification Command Capture Tool
# Designed for Worker M5 It2 and Forensic Auditing
# Captures 100% literal character-for-character terminal output into log files
# and automatically formats Section 1.2 of handoff.md.
# ==============================================================================

set -u

PROJECT_DIR="/Users/alexandermarshi/teamwork_projects/clinical_saas_launch"
LOG_DIR="${1:-$PROJECT_DIR/.agents/teamwork/teamwork_preview_explorer_m5_it2_1_rep/ground_truth_logs}"
SNIPPET_FILE="$LOG_DIR/section_1_2_snippet.md"

mkdir -p "$LOG_DIR"
cd "$PROJECT_DIR" || { echo "Failed to cd to $PROJECT_DIR"; exit 1; }

echo "=============================================================================="
echo " Starting Turnkey Verification Capture across 12 Mandated Commands"
echo " Project Directory: $PROJECT_DIR"
echo " Target Output Dir: $LOG_DIR"
echo "=============================================================================="

# Array of commands
COMMANDS=(
  "npm run test:aura"
  "node scripts/verify-css-bleed.mjs"
  "npm run test:scribe"
  "npm run test:ehr"
  "npm run test:e2e"
  "node tests/e2e/tier4-scenarios.test.mjs"
  "npm run test:challenger:m2"
  "npm run test:stripe"
  "npm run test:subscription"
  "npm run test:security"
  "npm run test:auth"
  "npm run build"
)

TITLES=(
  "Command 1: \`npm run test:aura\`"
  "Command 2: \`node scripts/verify-css-bleed.mjs\`"
  "Command 3: \`npm run test:scribe\`"
  "Command 4: \`npm run test:ehr\`"
  "Command 5: \`npm run test:e2e\`"
  "Command 6: \`node tests/e2e/tier4-scenarios.test.mjs\`"
  "Command 7: \`npm run test:challenger:m2\`"
  "Command 8: \`npm run test:stripe\`"
  "Command 9: \`npm run test:subscription\`"
  "Command 10: \`npm run test:security\`"
  "Command 11: \`npm run test:auth\`"
  "Command 12: \`npm run build\`"
)

# Initialize Section 1.2 snippet
cat << 'EOF' > "$SNIPPET_FILE"
### 1.2 Verbatim Terminal Output from Verification Commands
The following 12 terminal execution outputs were captured directly from running the verification commands via turnkey automated capture:

EOF

SUCCESS_COUNT=0
TOTAL_COUNT=${#COMMANDS[@]}

for i in "${!COMMANDS[@]}"; do
  IDX=$((i + 1))
  CMD="${COMMANDS[$i]}"
  TITLE="${TITLES[$i]}"
  LOG_FILE="$LOG_DIR/cmd_${IDX}.log"

  echo ""
  echo "------------------------------------------------------------------------------"
  echo "[$IDX/$TOTAL_COUNT] Executing: $CMD"
  echo "     Logging to: $LOG_FILE"

  START_TIME=$(date +%s)
  
  # Execute command with literal stdout + stderr capture
  eval "$CMD" > "$LOG_FILE" 2>&1
  EXIT_CODE=$?
  
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))

  if [ $EXIT_CODE -eq 0 ]; then
    echo "     ✓ SUCCESS (Exit 0, ${DURATION}s)"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    STATUS_STR="(PASS, Exit 0, ${DURATION}s)"
  else
    echo "     ❌ FAILED (Exit $EXIT_CODE, ${DURATION}s)"
    STATUS_STR="(FAIL, Exit $EXIT_CODE, ${DURATION}s)"
  fi

  # Append to snippet file
  {
    echo "#### $TITLE $STATUS_STR"
    echo '```'
    cat "$LOG_FILE"
    echo '```'
    echo ""
  } >> "$SNIPPET_FILE"
done

echo ""
echo "=============================================================================="
echo " Capture Completed: $SUCCESS_COUNT / $TOTAL_COUNT Passed"
echo " Section 1.2 Snippet generated at: $SNIPPET_FILE"
echo "=============================================================================="
