-- "App: labtestreport.notifications": shows the Notifications bell (and its panel) in the navbar.
-- Users without it don't see the bell. Super User always has it.
-- After running, assign it in Admin > Manage Roles to the roles that should see notifications.
-- Guarded by name, so re-running is a no-op.

INSERT INTO privilege (privilege, description, uuid)
SELECT 'App: labtestreport.notifications',
       'Able to see the Notifications bell and panel in the navbar',
       UUID()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM privilege WHERE privilege = 'App: labtestreport.notifications');
