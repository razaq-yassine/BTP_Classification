# Generic SaaS Platform — Feature Roadmap

This document outlines the prioritized feature roadmap for building a metadata-driven generic SaaS platform. Features are ordered to minimize dependencies and can be developed one by one.

---

## Phase 1: Foundation (Finalize First)

These are prerequisites for everything else. Complete these before moving on.

| Order | Feature | Priority | Why First |
|-------|---------|----------|-----------|
| 1 | **Metadata Deployment + checks** | HIGH | Validates metadata before it's used. Prevents bad config from breaking the app. |
| 2 | **Generic List View** ✅ | HIGH | Core view. Must be solid before list-related features. |
| 3 | **Generic Detail Views** | HIGH | Core view. Must be solid before detail-related features. |
| 4 | **Generic Create** | HIGH | Core write path. Must be solid before validation, triggers, etc. |
| 5 | **Field types rendering** | HIGH | Needed for list, detail, create. Finish all types before moving on. |
| 6 | **Page Layout** | HIGH | How sections/tabs/columns are arranged. Affects detail and list UX. |

**Dependency chain:** Metadata checks → List + Detail + Create + Field types → Page Layout

---

## Phase 2: Core Polish & Governance

Build on the foundation. These don't block later work.

| Order | Feature | Priority | Depends On |
|-------|---------|----------|------------|
| 7 | **Detail view formatter** | MEDIUM | Detail views, field types |
| 8 | **Salesforce Path** | MEDIUM | Detail view, select field with `useInPath` |
| 9 | **General Layout** | MEDIUM | Page layout, sidebar |
| 10 | **owner Id, created by, edited by** | MEDIUM | Create/update flows (populate on insert/update) |
| 11 | **Permissions** | HIGH | Auth, list/detail/create (to enforce read/write) |
| 12 | **Validation rules** | HIGH | Create/update (validate before save) |

**Dependency chain:** Detail formatter + Path + Layout can run in parallel. owner/created/edited → Permissions → Validation.

---

## Phase 3: Configuration & UX

Improve configurability and usability.

| Order | Feature | Priority | Depends On |
|-------|---------|----------|------------|
| 13 | **Icon selector for Object Details** | LOW | Object metadata, object manager |
| 14 | **Refine Text size** | LOW | Layout, theme/settings |
| 15 | **Sidebar / Workspaces** | MEDIUM | Layout, navigation |
| 16 | **Default values** | MEDIUM | Create, field definitions |
| 17 | **Formulas Field** | MEDIUM | List/detail (where formulas display), field types |

**Dependency chain:** Icon selector and text size are independent. Sidebar/Workspaces can be parallel. Default values before or with Formulas. Formulas can start once list/detail are solid.

---

## Phase 4: Advanced Features

Higher complexity. Build after core is solid.

| Order | Feature | Priority | Depends On |
|-------|---------|----------|------------|
| 18 | **Record field history** | MEDIUM | Create/update, triggers or audit logging |
| 19 | **Triggers** | HIGH | Create/update/delete (when to fire) |
| 20 | **Field visibility (conditional)** | MEDIUM | Detail/create, field definitions |
| 21 | **Bulk actions** | MEDIUM | List view, permissions |
| 22 | **Saved list views** | LOW | List view, filters/sort |

**Dependency chain:** Triggers before Record History (to capture changes). Field visibility is independent. Bulk actions and saved views depend on list view.

---

## Phase 5: Integrations & Scale

| Order | Feature | Priority | Depends On |
|-------|---------|----------|------------|
| 23 | **Import/Export** | MEDIUM | List view, create/update, validation |
| 24 | **Email management** | MEDIUM | Triggers or actions, user/org data |
| 25 | **Webhooks** | LOW | Triggers, HTTP outbound |
| 26 | **Approval workflows** | LOW | Triggers, status fields, permissions |
| 27 | **Record types** | LOW | Object metadata, permissions |
| 28 | **Roll-up summaries** | LOW | Formulas, related objects |

---

## Visual Summary

```
Phase 1 (Foundation)          Phase 2 (Polish)              Phase 3 (Config)
┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
│ 1. Metadata checks  │       │ 7. Detail formatter  │       │ 13. Icon selector   │
│ 2. List View ✅    │──────▶│ 8. Path              │──────▶│ 14. Text size       │
│ 3. Detail View     │       │ 9. General Layout   │       │ 15. Sidebar         │
│ 4. Create          │       │ 10. owner/created/  │       │ 16. Default values  │
│ 5. Field types     │       │     edited by       │       │ 17. Formulas        │
│ 6. Page Layout     │       │ 11. Permissions     │       └─────────────────────┘
└─────────────────────┘       │ 12. Validation      │
                             └─────────────────────┘
                                        │
                                        ▼
                             Phase 4 (Advanced)              Phase 5 (Integrations)
                             ┌─────────────────────┐       ┌─────────────────────┐
                             │ 18. Record history  │       │ 23. Import/Export   │
                             │ 19. Triggers        │──────▶│ 24. Email           │
                             │ 20. Field visibility│      │ 25. Webhooks        │
                             │ 21. Bulk actions   │       │ 26. Approval flows  │
                             │ 22. Saved views    │       │ 27. Record types    │
                             └─────────────────────┘       │ 28. Roll-up sums    │
                                                           └─────────────────────┘
```

---

## What to Finalize First

**First milestone:** Phase 1 (items 1–6)

- Metadata checks
- List view ✅
- Detail view
- Create
- Field types
- Page layout

Treat Phase 1 as "done" when:

- All core CRUD works end-to-end
- All needed field types render correctly
- Page layout supports your target UX
- Metadata validation prevents invalid config from breaking the app

**Second milestone:** Phase 2 (items 7–12)

- Detail formatter, Path, Layout
- owner/created/edited
- Permissions
- Validation rules

**Third milestone:** Phase 3 (items 13–17)

- Icon selector, text size, sidebar
- Default values
- Formulas

---

## Priority Summary

| Priority | Features |
|----------|----------|
| **HIGH** | Metadata checks, List, Detail, Create, Field types, Page layout, Permissions, Validation, Triggers |
| **MEDIUM** | Detail formatter, Path, Layout, owner/created/edited, Sidebar, Default values, Formulas, Record history, Field visibility, Bulk actions, Import/Export, Email |
| **LOW** | Icon selector, Text size, Saved views, Webhooks, Approval workflows, Record types, Roll-up summaries |

---

## Rule of Thumb

**If feature B depends on feature A, finish A first.** Within a phase, many items can be developed in parallel (e.g., Icon selector and Text size).
