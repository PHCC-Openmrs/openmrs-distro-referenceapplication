-- Health Promotion Session Form: Category -> Topic dropdowns.
--
-- Source: "Health Promotion Categories & Topics" sheet. Creates a coded "Session Category" question and one
-- coded topic question per category ("Health Promotion Topic - <category>"), each answered by that category's topics.
-- The form shows only the topic question of the selected category (a separate concept per category so editing a saved
-- encounter can never attach a value to the wrong, hidden question). "Other Conditions" is one shared answer; the form
-- then asks for the condition as free text in the existing "Health Promotion Topic" text concept.
-- Answers whose name already exists (Hypertension, Diabetes, Breastfeeding, ...) are reused by uuid, not duplicated.
-- Every insert is guarded by uuid, so re-running is a no-op.

START TRANSACTION;

SET @creator = (SELECT user_id FROM users WHERE system_id = 'admin');
SET @coded   = (SELECT concept_datatype_id FROM concept_datatype WHERE name = 'Coded');
SET @na      = (SELECT concept_datatype_id FROM concept_datatype WHERE name = 'N/A');
SET @question = (SELECT concept_class_id FROM concept_class WHERE name = 'Question');

CREATE TEMPORARY TABLE hp_concept (uuid CHAR(38), name VARCHAR(255), datatype_id INT);
CREATE TEMPORARY TABLE hp_answer (question_uuid CHAR(38), answer_uuid CHAR(38), sort_weight DOUBLE);

INSERT INTO hp_concept VALUES
  ('836f6b2f-c606-53fa-9460-8ca31a0bb06c', 'Session Category', @coded),
  ('0ca01eb2-8a13-53a6-bc57-9a65bf34d72a', 'Non-Communicable Diseases (NCDs)', @na),
  ('7a6296e2-67fe-5705-9ca3-04fe5e8c0b49', 'Health Promotion Topic - NCDs', @coded),
  ('1848a9ec-e357-5b43-9753-3c2362dfc2dd', 'Healthy Lifestyle Advice for NCDs Patients', @na),
  ('150e1f45-9060-53f0-8049-92a4e2f46582', 'Other Conditions', @na),
  ('d68dd328-bf84-5a90-b158-0f8fcc7a27ce', 'Communicable Disease', @na),
  ('8453c8de-e5fa-57bf-ae90-6dca007bbddc', 'Health Promotion Topic - Communicable Disease', @coded),
  ('2a65a086-9f4e-51bf-8dc6-6904d1a0adb0', 'Head Lice', @na),
  ('44b12f8e-c012-53bf-9be0-5ea32f2c4b5f', 'Breast Cancer', @na),
  ('e7be672d-d6eb-5d6d-859c-fc11ed2723b5', 'Child Health', @na),
  ('b5daa24a-06b2-532d-aa07-b7f104bc42ce', 'Health Promotion Topic - Child Health', @coded),
  ('4a161c7d-7732-5a52-a1c0-1a492ca3217c', 'Child Health General Advice', @na),
  ('76ece99b-14c6-5c83-8e70-39377db772f2', 'Weaning & Complementary Feeding', @na),
  ('a2807953-f726-51f9-ad55-c32a861150ba', 'SRH', @na),
  ('3e0a7399-4f26-5146-abc7-9719a5d8e677', 'Health Promotion Topic - SRH', @coded),
  ('778d78ba-113d-531b-8810-efda61fa7667', 'Contraceptives', @na),
  ('6eb23de6-2a1d-5993-9b54-1acda2cf7d71', 'Vaginal Infections', @na),
  ('fafe2071-7f0a-528e-903a-1b3a7bed820f', 'Menstrual Hygiene Management (MHM)', @na),
  ('1286253d-a038-5a94-9a28-613c254836a1', 'Health Promotion Topic - Nutrition', @coded),
  ('dd9daaeb-6cd6-5dc9-b3f8-aaef6dd62b47', 'Proper Nutrition for NCDs Patients', @na),
  ('00edb9c3-99ff-5be2-a247-ba07b69afa92', 'Proper Nutrition for Pregnant & Lactating Mothers', @na),
  ('e5769a13-65fd-53ea-9d2e-a12ec0149648', 'Proper Nutrition for Children', @na),
  ('c8c193a5-25e6-5af3-9224-b6687ccb9ed2', 'General Clinical Services', @na),
  ('76f239f2-a150-5db2-b5c5-ee99e2085152', 'Health Promotion Topic - General Clinical Services', @coded),
  ('f74f6d80-2d2a-5abc-b478-1e9cf059dad8', 'Wound Care', @na),
  ('72a22072-3bf6-5299-908b-dae2b1e8f547', 'Medication & Vitamins Safety', @na),
  ('fc7e0ef3-bde0-5d00-b46c-ce469d4e4af5', 'PHCC Services', @na),
  ('84a75382-ff11-5039-a359-cee1806e0eae', 'Anemia', @na);

INSERT INTO hp_answer VALUES
  ('836f6b2f-c606-53fa-9460-8ca31a0bb06c', '0ca01eb2-8a13-53a6-bc57-9a65bf34d72a', 1),
  ('836f6b2f-c606-53fa-9460-8ca31a0bb06c', 'd68dd328-bf84-5a90-b158-0f8fcc7a27ce', 2),
  ('836f6b2f-c606-53fa-9460-8ca31a0bb06c', 'e7be672d-d6eb-5d6d-859c-fc11ed2723b5', 3),
  ('836f6b2f-c606-53fa-9460-8ca31a0bb06c', 'a2807953-f726-51f9-ad55-c32a861150ba', 4),
  ('836f6b2f-c606-53fa-9460-8ca31a0bb06c', 'a1c05a25-1141-405f-9ba1-63c0738adfd5', 5),
  ('836f6b2f-c606-53fa-9460-8ca31a0bb06c', 'c8c193a5-25e6-5af3-9224-b6687ccb9ed2', 6),
  ('7a6296e2-67fe-5705-9ca3-04fe5e8c0b49', '117399AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 1),
  ('7a6296e2-67fe-5705-9ca3-04fe5e8c0b49', 'e81027bd-c331-4253-9e98-d47886190ba4', 2),
  ('7a6296e2-67fe-5705-9ca3-04fe5e8c0b49', '1848a9ec-e357-5b43-9753-3c2362dfc2dd', 3),
  ('7a6296e2-67fe-5705-9ca3-04fe5e8c0b49', '150e1f45-9060-53f0-8049-92a4e2f46582', 4),
  ('8453c8de-e5fa-57bf-ae90-6dca007bbddc', '140AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 1),
  ('8453c8de-e5fa-57bf-ae90-6dca007bbddc', '123107AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 2),
  ('8453c8de-e5fa-57bf-ae90-6dca007bbddc', '2a65a086-9f4e-51bf-8dc6-6904d1a0adb0', 3),
  ('8453c8de-e5fa-57bf-ae90-6dca007bbddc', '44b12f8e-c012-53bf-9be0-5ea32f2c4b5f', 4),
  ('8453c8de-e5fa-57bf-ae90-6dca007bbddc', '115835AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 5),
  ('8453c8de-e5fa-57bf-ae90-6dca007bbddc', '150e1f45-9060-53f0-8049-92a4e2f46582', 6),
  ('b5daa24a-06b2-532d-aa07-b7f104bc42ce', '351e39cf-0b83-46ab-9768-ac9ca765e85d', 1),
  ('b5daa24a-06b2-532d-aa07-b7f104bc42ce', '4a161c7d-7732-5a52-a1c0-1a492ca3217c', 2),
  ('b5daa24a-06b2-532d-aa07-b7f104bc42ce', '76ece99b-14c6-5c83-8e70-39377db772f2', 3),
  ('b5daa24a-06b2-532d-aa07-b7f104bc42ce', '150e1f45-9060-53f0-8049-92a4e2f46582', 4),
  ('3e0a7399-4f26-5146-abc7-9719a5d8e677', '834ce7b9-a7ae-4d30-a343-82198897cb0b', 1),
  ('3e0a7399-4f26-5146-abc7-9719a5d8e677', '778d78ba-113d-531b-8810-efda61fa7667', 2),
  ('3e0a7399-4f26-5146-abc7-9719a5d8e677', '6eb23de6-2a1d-5993-9b54-1acda2cf7d71', 3),
  ('3e0a7399-4f26-5146-abc7-9719a5d8e677', 'fafe2071-7f0a-528e-903a-1b3a7bed820f', 4),
  ('3e0a7399-4f26-5146-abc7-9719a5d8e677', '150e1f45-9060-53f0-8049-92a4e2f46582', 5),
  ('1286253d-a038-5a94-9a28-613c254836a1', 'dd9daaeb-6cd6-5dc9-b3f8-aaef6dd62b47', 1),
  ('1286253d-a038-5a94-9a28-613c254836a1', '00edb9c3-99ff-5be2-a247-ba07b69afa92', 2),
  ('1286253d-a038-5a94-9a28-613c254836a1', 'e5769a13-65fd-53ea-9d2e-a12ec0149648', 3),
  ('76f239f2-a150-5db2-b5c5-ee99e2085152', 'f74f6d80-2d2a-5abc-b478-1e9cf059dad8', 1),
  ('76f239f2-a150-5db2-b5c5-ee99e2085152', '72a22072-3bf6-5299-908b-dae2b1e8f547', 2),
  ('76f239f2-a150-5db2-b5c5-ee99e2085152', 'fc7e0ef3-bde0-5d00-b46c-ce469d4e4af5', 3),
  ('76f239f2-a150-5db2-b5c5-ee99e2085152', '84a75382-ff11-5039-a359-cee1806e0eae', 4),
  ('76f239f2-a150-5db2-b5c5-ee99e2085152', '150e1f45-9060-53f0-8049-92a4e2f46582', 5);

INSERT INTO concept (retired, datatype_id, class_id, is_set, creator, date_created, uuid)
SELECT 0, h.datatype_id, @question, 0, @creator, NOW(), h.uuid
  FROM hp_concept h
 WHERE NOT EXISTS (SELECT 1 FROM concept c WHERE c.uuid = h.uuid);

INSERT INTO concept_name (concept_id, name, locale, locale_preferred, creator, date_created, concept_name_type, voided, uuid)
SELECT c.concept_id, h.name, 'en', 1, @creator, NOW(), 'FULLY_SPECIFIED', 0, UUID()
  FROM hp_concept h JOIN concept c ON c.uuid = h.uuid
 WHERE NOT EXISTS (SELECT 1 FROM concept_name cn WHERE cn.concept_id = c.concept_id AND cn.voided = 0);

INSERT INTO concept_answer (concept_id, answer_concept, creator, date_created, sort_weight, uuid)
SELECT q.concept_id, a.concept_id, @creator, NOW(), h.sort_weight, UUID()
  FROM hp_answer h
  JOIN concept q ON q.uuid = h.question_uuid
  JOIN concept a ON a.uuid = h.answer_uuid
 WHERE NOT EXISTS (SELECT 1 FROM concept_answer ca WHERE ca.concept_id = q.concept_id AND ca.answer_concept = a.concept_id);

-- Anything that did not resolve (e.g. a reused uuid missing on this server) is listed rather than dropped silently.
SELECT h.uuid AS missing_concept, h.name FROM hp_concept h WHERE NOT EXISTS (SELECT 1 FROM concept c WHERE c.uuid = h.uuid)
UNION ALL
SELECT h.answer_uuid, 'answer not found' FROM hp_answer h WHERE NOT EXISTS (SELECT 1 FROM concept c WHERE c.uuid = h.answer_uuid);

COMMIT;
