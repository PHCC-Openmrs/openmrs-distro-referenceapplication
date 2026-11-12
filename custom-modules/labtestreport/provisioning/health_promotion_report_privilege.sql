-- "App: reports.healthPromotion": lets a role open only the Health Promotion Report and the Monthly Health Promotion
-- Report (e.g. the CHW role), without the full "App: reports.programmatic" privilege that exposes every programmatic report.
-- After running, assign it to the CHW role in Admin > Manage Roles and remove "App: reports.programmatic" from that role.
-- Guarded by name, so re-running is a no-op.

INSERT INTO privilege (privilege, description, uuid)
SELECT 'App: reports.healthPromotion',
       'Able to view the Health Promotion Report and the Monthly Health Promotion Report',
       UUID()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM privilege WHERE privilege = 'App: reports.healthPromotion');
