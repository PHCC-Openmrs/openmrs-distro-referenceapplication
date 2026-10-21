-- Resolves the diagnosis names listed in disease_summary_diagnosis_map.csv to concepts. Names are
-- matched trimmed, whitespace-collapsed and case-insensitively (the caller passes them already
-- normalized the same way); the caller picks the best match per name using the locale/name-type
-- columns, since a name can belong to more than one concept.
SELECT
  LOWER(REGEXP_REPLACE(TRIM(cn.name), '[[:space:]]+', ' ')) AS normalized_name,
  cn.concept_id,
  cn.locale,
  cn.concept_name_type
FROM concept_name cn
JOIN concept c ON c.concept_id = cn.concept_id AND c.retired = 0
WHERE cn.voided = 0
  AND LOWER(REGEXP_REPLACE(TRIM(cn.name), '[[:space:]]+', ' ')) IN (:names)
