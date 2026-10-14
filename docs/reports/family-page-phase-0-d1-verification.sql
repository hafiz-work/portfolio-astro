-- Family page Phase 0 D1 verification/remediation note.
-- Names below are redacted; <person-a>/<person-b>/<person-c> are placeholders.
-- Status: not applied by Codex from portfolio-astro.
-- Run from <hono-workers-checkout> against local first, then remote
-- only after reviewing the SELECT output.

-- 1) Inventory public family identities.
SELECT
  p.id,
  p.tree_id,
  t.slug,
  p.display_name,
  p.global_key
FROM family_people p
JOIN family_trees t ON t.id = p.tree_id
WHERE t.slug IN ('hafiz-family', 'bahtiar-family', 'azhari-family')
ORDER BY lower(p.display_name), t.slug;

-- 2) Find duplicate display names that do not share a stable global_key.
SELECT
  lower(display_name) AS normalized_name,
  COUNT(*) AS rows_count,
  GROUP_CONCAT(DISTINCT COALESCE(global_key, '<null>')) AS global_keys
FROM family_people
GROUP BY lower(display_name)
HAVING COUNT(*) > 1
   AND COUNT(DISTINCT COALESCE(global_key, '<null>')) > 1;

-- 3) Idempotent backfill for known cross-tree keys if any rows are missing them.
-- Review before applying; this relies on the current family seed naming.
UPDATE family_people
SET global_key = '<person-a>'
WHERE lower(display_name) = '<person-a>'
  AND (global_key IS NULL OR trim(global_key) = '');

UPDATE family_people
SET global_key = '<person-b>'
WHERE lower(display_name) = '<person-b>'
  AND (global_key IS NULL OR trim(global_key) = '');

UPDATE family_people
SET global_key = '<person-c>'
WHERE lower(display_name) = '<person-c>'
  AND (global_key IS NULL OR trim(global_key) = '');

-- 4) Verify the parent bridge rows exist in trees that contain all people.
SELECT
  t.slug,
  parent.display_name AS parent_name,
  child.display_name AS child_name,
  r.relationship_type
FROM family_relationships r
JOIN family_trees t ON t.id = r.tree_id
JOIN family_people parent ON parent.id = r.person_id
JOIN family_people child ON child.id = r.related_person_id
WHERE r.relationship_type = 'parent'
  AND parent.global_key IN ('<person-b>', '<person-c>')
  AND child.global_key = '<person-a>'
ORDER BY t.slug, parent.global_key;

-- 5) Idempotent remediation for the expected bahtiar-family parent rows.
-- This inserts only when all referenced rows exist in bahtiar-family.
INSERT OR IGNORE INTO family_relationships
  (tree_id, person_id, related_person_id, relationship_type, is_primary)
SELECT
  t.id,
  parent.id,
  child.id,
  'parent',
  1
FROM family_trees t
JOIN family_people parent
  ON parent.tree_id = t.id AND parent.global_key = '<person-b>'
JOIN family_people child
  ON child.tree_id = t.id AND child.global_key = '<person-a>'
WHERE t.slug = 'bahtiar-family';

INSERT OR IGNORE INTO family_relationships
  (tree_id, person_id, related_person_id, relationship_type, is_primary)
SELECT
  t.id,
  parent.id,
  child.id,
  'parent',
  1
FROM family_trees t
JOIN family_people parent
  ON parent.tree_id = t.id AND parent.global_key = '<person-c>'
JOIN family_people child
  ON child.tree_id = t.id AND child.global_key = '<person-a>'
WHERE t.slug = 'bahtiar-family';
