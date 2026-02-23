# Risk Rating Scale Mapping — Cellar Door Legal Analysis Suite

**Created:** 2026-02-22
**Purpose:** Provide a unified reference for the different risk rating scales used across all legal analysis documents.

---

## The Problem

The legal analysis documents use five different risk rating conventions. This table maps between them so readers can compare assessments across documents.

---

## Unified Mapping Table

| Level | Emoji Scale (Heatmap) | Text Scale (Battery, Howey v2) | Letter Grade (RT1, RT2) | Howey v1 Scale | Meaning |
|-------|----------------------|-------------------------------|------------------------|----------------|---------|
| 1 — Safe | 🟢 Minimal | Low | A / A- | Negligible / Very Low | Ship without special legal work. No regulatory concern. |
| 2 — Caution | 🟡 Moderate | Medium | B+ / B | Low / Low–Moderate | Manageable with standard compliance (disclaimers, ToS). Monitor. |
| 3 — Warning | 🟠 Significant | Medium-High / High | B- / C+ | Moderate | Needs targeted legal counsel before launch. Budget for opinions. |
| 4 — Danger | 🔴 High | High / Critical | C / D | High | Potential enforcement action. Dedicated analysis required. Do not ship without counsel. |
| 5 — Stop | ⚫ Existential | Critical (existential) | F | Critical | Do not proceed without dedicated legal team and budget. Potential criminal liability. |

---

## Scale Usage by Document

| Document | Scale Used | Notes |
|----------|-----------|-------|
| **Risk Heatmap** (`cellar-door-risk-heatmap.md`) | Emoji (🟢🟡🟠🔴⚫) | Per-module, per-legal-domain matrix. Most granular. |
| **Legal Battery** (`cellar-door-legal-battery.md`) | Text (Low/Medium/High/Critical) | Per-analysis-section ratings. Sometimes compound (e.g., "Low/Critical"). |
| **Red Team v1** (`cellar-door-legal-redteam.md`) | Letter grades (A- through D) | Per-decision and overall document grades. |
| **Red Team v2** (`cellar-door-legal-redteam-v2.md`) | Letter grades (A through F) | Grades remediation quality. Also uses risk-level text (Low/Medium-High/High/Critical) in Part V. |
| **Legal Lenses** (`cellar-door-legal-lenses.md`) | No formal scale | Narrative risk assessment per lens. Uses qualitative language ("highest-risk lens," "manageable"). |
| **Howey v1** (`howey-test-module-d.md`) | Negligible / Low / Moderate / High | Per-Howey-prong, per-feature matrix. |
| **Howey v2** (`howey-module-d-v2.md`) | Emoji + Text hybrid (🟢🟡🟠🔴⚫ + Critical/High/Moderate) | Reconciles all prior scales. Uses emoji for quick scanning, text for precision. |

---

## Interpretation Notes

- **Compound ratings** (e.g., "Low/Critical" in Battery §III) mean the rating depends on configuration — Low for base case, Critical for worst case.
- **Letter grades** in RT1/RT2 grade *document quality and remediation completeness*, not inherent risk level. A "B+" on a decision means the legal work is adequate, not that the risk is moderate.
- **The Heatmap is the canonical risk reference** for per-module, per-domain risk. Other documents provide deeper analysis for specific concerns.
- When documents disagree on risk level, prefer the more recent and more specific assessment. Howey v2 supersedes Howey v1 for Module D securities risk.
