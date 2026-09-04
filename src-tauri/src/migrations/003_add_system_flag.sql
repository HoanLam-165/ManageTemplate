ALTER TABLE templates ADD COLUMN is_system BOOLEAN DEFAULT 0;
UPDATE templates SET is_system = 1 WHERE name IN ('Blank Template', 'Test Case', 'Bug Report', 'Meeting Notes');
