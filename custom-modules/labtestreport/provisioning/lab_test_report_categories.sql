-- Lab Test Summary report categories (Monthly Report layout).
--
-- Root set "Lab Test Report Categories" -> one ConvSet per category -> the orderable test concepts.
-- queries/summary_report.sql reads exactly this tree (root looked up by uuid), ordering categories and
-- tests by sort_weight. Tests are referenced by uuid so the script is portable across environments,
-- and every insert is guarded, so re-running it is a no-op.

START TRANSACTION;

SET @creator  = (SELECT user_id FROM users WHERE system_id = 'admin');
SET @na_type  = (SELECT concept_datatype_id FROM concept_datatype WHERE uuid = '8d4a4c94-c2cc-11de-8d13-0010c6dffd0f');
SET @convset  = (SELECT concept_class_id FROM concept_class WHERE uuid = '8d492594-c2cc-11de-8d13-0010c6dffd0f');

CREATE TEMPORARY TABLE ltr_category (uuid CHAR(38), name VARCHAR(255), parent_uuid CHAR(38), sort_weight DOUBLE);
INSERT INTO ltr_category VALUES
  ('4ffb5b34-ac87-4887-90b0-d23159dd3397', 'Lab Test Report Categories', NULL, NULL),
  ('e28d2f49-6cd2-411d-84a1-c0f30361fe3f', '',  '4ffb5b34-ac87-4887-90b0-d23159dd3397', 1),
  -- "Chemistry" is already taken by the reference-app ConvSet under "Bloodwork".
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', 'Chemistry test',   '4ffb5b34-ac87-4887-90b0-d23159dd3397', 2),
  ('fcb82efa-1f04-46d3-b16e-2e1b5c3767fe', 'Serological test', '4ffb5b34-ac87-4887-90b0-d23159dd3397', 3),
  ('8b6491fd-51f8-46af-b3be-bf13328f942d', 'Coagulation Test', '4ffb5b34-ac87-4887-90b0-d23159dd3397', 4),
  ('cea71597-198c-434a-8d3a-c3cfc3726846', 'Microscopic',      '4ffb5b34-ac87-4887-90b0-d23159dd3397', 5),
  ('7608678d-0024-4809-bd08-a09e57c9e5c0', 'Culture',          '4ffb5b34-ac87-4887-90b0-d23159dd3397', 6);

CREATE TEMPORARY TABLE ltr_test (category_uuid CHAR(38), test_uuid CHAR(38), sort_weight DOUBLE);
INSERT INTO ltr_test VALUES
  -- Hematology test
  ('e28d2f49-6cd2-411d-84a1-c0f30361fe3f', '1019AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 1),  -- Complete blood count
  ('e28d2f49-6cd2-411d-84a1-c0f30361fe3f', '855AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 2),  -- Erythrocyte sedimentation rate
  ('e28d2f49-6cd2-411d-84a1-c0f30361fe3f', '159644AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 3),  -- Glycosylated hemoglobin A (HbA1C)
  -- Chemistry test
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', '4b2e473a-12f5-45ff-aafc-29a78ad237ea', 1),  -- Blood glucose (FBG / RBG / PP)
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', '887AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 2),  -- Serum glucose (RBG)
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', '163708AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 3),  -- Glucose tolerance test 5 specimens (75g) panel
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', 'd5bd0647-e08e-4a6f-8654-273d5313c1b6', 4),  -- Serum Urea
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', '857AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 5),  -- Blood urea nitrogen
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', '164364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 6),  -- Serum creatinine (mg/dL)
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', '06cb0ce2-ef7d-4ffa-a7da-95739d24e377', 7),  -- Uric Acid
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', '159825AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 7.5), -- Uric acid, serum (duplicate, also ordered)
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', '953AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 8),  -- Liver Function Test
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', 'e6311fb3-b8ac-4b80-8261-1fbdb182ecb9', 9),  -- AST/SGOT
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', '9cb47370-7e5d-46a2-b172-54c42562c824', 10), -- ALT/SGPT
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', '785AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 11), -- Alkaline phosphatase
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', '1010AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 12), -- Lipid profile
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', '514f66c9-ab3e-4346-9de8-a30f9eee282d', 13), -- Cholesterol
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', '1009AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 14), -- Triglycerides (mg/dL)
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', '159497AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 15), -- Serum calcium
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', '717AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 16), -- Total protein
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', '848AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 17), -- Serum albumin
  ('bbe8b5ae-3c05-41a5-a214-f99c854ef8bd', 'ce130684-6cc5-4495-8c9e-24997c4d897f', 17.5), -- Albumin (duplicate, also ordered)
  -- Serological test
  ('fcb82efa-1f04-46d3-b16e-2e1b5c3767fe', '161500AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 1),  -- C-reactive protein
  ('fcb82efa-1f04-46d3-b16e-2e1b5c3767fe', '127417AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 2),  -- Rheumatoid factor (RF)
  ('fcb82efa-1f04-46d3-b16e-2e1b5c3767fe', '161469AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 3),  -- Anti-streptolysin O titer
  ('fcb82efa-1f04-46d3-b16e-2e1b5c3767fe', '163348AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 4),  -- Helicobacter pylori Antigen Test in Stool
  ('fcb82efa-1f04-46d3-b16e-2e1b5c3767fe', '163620AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 4.5), -- H. pylori stool antigen (duplicate, also ordered)
  ('fcb82efa-1f04-46d3-b16e-2e1b5c3767fe', '159362AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 5),  -- Fecal occult blood test
  ('fcb82efa-1f04-46d3-b16e-2e1b5c3767fe', '1945AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 6),  -- Serum pregnancy test, qualitative
  -- Coagulation Test
  ('8b6491fd-51f8-46af-b3be-bf13328f942d', '163436AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 1),  -- Coagulation profile
  -- Microscopic
  ('cea71597-198c-434a-8d3a-c3cfc3726846', '45AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 1),  -- Urine pregnancy test
  ('cea71597-198c-434a-8d3a-c3cfc3726846', '46f7ab58-2719-41dd-ac9f-f2cb0967e5fd', 2),  -- Urine Analysis
  ('cea71597-198c-434a-8d3a-c3cfc3726846', '079de143-05af-4fd6-8be0-067440cad51a', 3),  -- Stool Analysis
  ('cea71597-198c-434a-8d3a-c3cfc3726846', '304AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 3.5), -- Stool exam (duplicate, also ordered)
  -- Culture
  ('7608678d-0024-4809-bd08-a09e57c9e5c0', '161156AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 1),  -- Culture and sensitivity, urine
  ('7608678d-0024-4809-bd08-a09e57c9e5c0', '166141AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 2);  -- Vaginal swab

INSERT INTO concept (retired, datatype_id, class_id, is_set, creator, date_created, uuid)
SELECT 0, @na_type, @convset, 1, @creator, NOW(), cat.uuid
FROM ltr_category cat
WHERE NOT EXISTS (SELECT 1 FROM concept c WHERE c.uuid = cat.uuid);

INSERT INTO concept_name (concept_id, name, locale, locale_preferred, creator, date_created, concept_name_type, voided, uuid)
SELECT c.concept_id, cat.name, 'en', 1, @creator, NOW(), 'FULLY_SPECIFIED', 0, UUID()
FROM ltr_category cat
JOIN concept c ON c.uuid = cat.uuid
WHERE NOT EXISTS (SELECT 1 FROM concept_name cn WHERE cn.concept_id = c.concept_id AND cn.locale = 'en'
                    AND cn.concept_name_type = 'FULLY_SPECIFIED' AND cn.voided = 0);

-- Categories under the root.
INSERT INTO concept_set (concept_id, concept_set, sort_weight, creator, date_created, uuid)
SELECT c.concept_id, parent.concept_id, cat.sort_weight, @creator, NOW(), UUID()
FROM ltr_category cat
JOIN concept c      ON c.uuid = cat.uuid
JOIN concept parent ON parent.uuid = cat.parent_uuid
WHERE NOT EXISTS (SELECT 1 FROM concept_set cs WHERE cs.concept_id = c.concept_id AND cs.concept_set = parent.concept_id);

-- Tests under each category.
INSERT INTO concept_set (concept_id, concept_set, sort_weight, creator, date_created, uuid)
SELECT t.concept_id, cat.concept_id, lt.sort_weight, @creator, NOW(), UUID()
FROM ltr_test lt
JOIN concept cat ON cat.uuid = lt.category_uuid
JOIN concept t   ON t.uuid = lt.test_uuid
WHERE NOT EXISTS (SELECT 1 FROM concept_set cs WHERE cs.concept_id = t.concept_id AND cs.concept_set = cat.concept_id);

-- Every listed test must exist; a missing uuid would silently drop a row from the report.
SELECT lt.test_uuid AS missing_test_uuid FROM ltr_test lt LEFT JOIN concept t ON t.uuid = lt.test_uuid WHERE t.concept_id IS NULL;

DROP TEMPORARY TABLE ltr_test;
DROP TEMPORARY TABLE ltr_category;

COMMIT;
