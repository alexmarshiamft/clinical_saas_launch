## 2026-10-05T07:01:11Z
You are Explorer 2 for Milestone 5 (teamwork_preview_explorer).
Your working directory is: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m5_2
The authoritative original user request is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/ORIGINAL_REQUEST.md
The project specification is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/PROJECT.md
The E2E test certification is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/TEST_READY.md

Scope: Milestone 5 — HIPAA PHI Scrubber 18 Safe Harbor Engine & Diff Viewer (Features 23, 24, 25):
Canonical source portfolio:
Search `/Users/alexandermarshi/` or `/Users/alexandermarshi/Downloads/` for canonical PHI Scrubber implementations (e.g. `/Users/alexandermarshi/Downloads/phi-scrubber/` or related).

Investigate and produce a detailed blueprint for:
1. Feature 23: PHI Scrubber 18 Safe Harbor Engine (`src/tools/phi-scrubber/safeHarborRules.ts` & `engine.ts`):
   - Full TypeScript implementation of all 18 statutory HIPAA Safe Harbor regexes and entity identifiers:
     1. Names (first, last, full names, clinician names)
     2. Geographic subdivisions (street address, city, state, ZIP codes)
     3. Dates (birth dates, admission dates, discharge dates, encounter dates, MM/DD/YYYY, YYYY-MM-DD, month words)
     4. Telephone numbers
     5. Fax numbers
     6. Email addresses
     7. Social Security numbers (SSN: XXX-XX-XXXX)
     8. Medical Record numbers (MRN: e.g. #MC-xxxxx, MRN-xxxxx)
     9. Health plan beneficiary numbers
     10. Account numbers
     11. Certificate / license numbers (e.g. NPI, state license)
     12. Vehicle identifiers and serial numbers (including VIN and license plates)
     13. Device identifiers and serial numbers
     14. Web Universal Resource Locators (URLs)
     15. Internet Protocol (IP) addresses (IPv4 & IPv6)
     16. Biometric identifiers (fingerprints, voiceprints)
     17. Full-face photographic images and comparable images
     18. Any other unique identifying number, characteristic, or code
   - Entity scoring with confidence values (0.0 to 1.0) and precise character start/end offsets.
   - Three statutory masking modes:
     - `tag` (e.g. `[NAME]`, `[DATE]`, `[PHONE]`, `[MRN]`, `[SSN]`)
     - `block` (e.g. `████████`)
     - `asterisk` (e.g. `********`)
2. Feature 24: PHI Scrubber Side-by-Side Diff Viewer (`src/tools/phi-scrubber/PhiScrubberView.tsx` & `DiffViewer.tsx`):
   - Synchronized dual-pane view: Unredacted Source pane (with highlighted ePHI entities) vs Redacted Clean pane.
   - Interactive mask style switcher (`tag`, `block`, `asterisk`).
   - Quick action: 1-click copy clean text with clipboard toast feedback.
3. Feature 25: PHI Scrubber Forensic Audit Table (`src/tools/phi-scrubber/AuditTable.tsx`):
   - Comprehensive entity taxonomy table listing every detected PHI entity: Tag, Detected Value, Category, Start/End Offsets, Confidence Score.
   - Metric cards: Total Entities Detected, Safe Harbor Categories Triggered, Risk Severity Score.
   - JSON & CSV export functionality for forensic audit trails.

Write your findings to report.md and a 5-component handoff report to handoff.md.
When complete, notify parent via send_message.
