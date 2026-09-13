ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

-- The bundled development fixtures predate the flag; keep them out of public stats.
UPDATE users
SET is_test = TRUE
WHERE email IN (
    'a@a.com', 'b@b.com', 'c@c.com', 'd@d.com',
    'e@e.com', 'f@f.com', 'g@g.com', 'h@h.com'
);
