-- =============================================================
-- CampusLib — Supabase / PostgreSQL Schema
-- =============================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Sections:
--   1. Extensions
--   2. Tables (DDL)
--   3. Trigger: Issue Book  (auto issue_no, dates, stock check)
--   4. Trigger: Return Book (restore stock + fine calculation)
--   5. Row Level Security (RLS)
--   6. Seed Data
-- =============================================================


-- -------------------------------------------------------------
-- 1. EXTENSIONS
-- -------------------------------------------------------------

-- pgcrypto is pre-enabled on Supabase; listed here for clarity.
-- We use gen_random_uuid() only if needed in future.
-- The sequence for issue_no is handled via SERIAL below.


-- -------------------------------------------------------------
-- 2. TABLES (DDL)
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS book (
    book_no     INTEGER      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    book_name   TEXT         NOT NULL,
    author_name TEXT         NOT NULL,
    price       NUMERIC(10,2),
    qty_stock   INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS member (
    mem_id      INTEGER      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    mem_name    TEXT         NOT NULL,
    mem_address TEXT         NOT NULL,
    doj         DATE         NOT NULL DEFAULT CURRENT_DATE,
    fine_amt    NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS issue (
    issue_no    INTEGER      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    issue_date  DATE         NOT NULL DEFAULT CURRENT_DATE,
    mem_id      INTEGER      NOT NULL REFERENCES member(mem_id),
    book_no     INTEGER      NOT NULL REFERENCES book(book_no),
    return_date DATE,
    returned    DATE
);


-- -------------------------------------------------------------
-- 3. TRIGGER: trg_issue_book  (BEFORE INSERT ON issue)
--
-- Fires when the app inserts a row with only mem_id and book_no.
-- Actions:
--   • Sets issue_date  = CURRENT_DATE
--   • Sets return_date = CURRENT_DATE + 10
--   • Checks qty_stock > 0; raises exception if unavailable
--   • Decrements qty_stock by 1
--
-- Note: issue_no is handled automatically by GENERATED ALWAYS AS IDENTITY.
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_issue_book()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_stock INTEGER;
BEGIN
    -- Auto-set dates
    NEW.issue_date  := CURRENT_DATE;
    NEW.return_date := CURRENT_DATE + INTERVAL '10 days';

    -- Check stock availability
    SELECT qty_stock
    INTO   v_stock
    FROM   book
    WHERE  book_no = NEW.book_no;

    IF v_stock IS NULL THEN
        RAISE EXCEPTION 'Book % does not exist', NEW.book_no;
    END IF;

    IF v_stock <= 0 THEN
        RAISE EXCEPTION 'Book not available in stock';
    END IF;

    -- Decrement stock
    UPDATE book
    SET    qty_stock = qty_stock - 1
    WHERE  book_no = NEW.book_no;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_issue_book
BEFORE INSERT ON issue
FOR EACH ROW
EXECUTE FUNCTION fn_issue_book();


-- -------------------------------------------------------------
-- 4. TRIGGER: trg_return_book  (AFTER UPDATE OF returned ON issue)
--
-- Fires when the app sets issue.returned = CURRENT_DATE.
-- Fine rules (matching the original Oracle spec):
--   Days  1–10  → issue period   → ₹0
--   Days 11–20  → grace period   → ₹0
--   Day  21+    → ₹2 × (days − 20)
--
-- Actions:
--   • Calculates fine based on (returned − issue_date)
--   • Adds fine to member.fine_amt
--   • Restores qty_stock by 1
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_return_book()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    total_days INTEGER;
    fine       NUMERIC(10,2) := 0;
BEGIN
    -- Only act when returned transitions from NULL → a date
    IF NEW.returned IS NOT NULL AND OLD.returned IS NULL THEN

        total_days := NEW.returned - NEW.issue_date;

        -- Fine accrues only after the 20-day window
        IF total_days > 20 THEN
            fine := (total_days - 20) * 2;
        END IF;

        -- Accumulate fine on member record
        UPDATE member
        SET    fine_amt = COALESCE(fine_amt, 0) + fine
        WHERE  mem_id = NEW.mem_id;

        -- Restore stock
        UPDATE book
        SET    qty_stock = qty_stock + 1
        WHERE  book_no = NEW.book_no;

    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_return_book
AFTER UPDATE OF returned ON issue
FOR EACH ROW
EXECUTE FUNCTION fn_return_book();


-- -------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS)
-- -------------------------------------------------------------
-- We use the anon key from the frontend (public dashboard).
-- RLS is enabled but a permissive policy allows full access.
-- Tighten these policies when you add authentication.

ALTER TABLE book   ENABLE ROW LEVEL SECURITY;
ALTER TABLE member ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_book"   ON book   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_member" ON member FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_issue"  ON issue  FOR ALL TO anon USING (true) WITH CHECK (true);


-- -------------------------------------------------------------
-- 6. SEED DATA
-- -------------------------------------------------------------

INSERT INTO book (book_name, author_name, price, qty_stock) VALUES
    ('Database Management', 'Korth',          450.00, 5),
    ('C Programming',       'Dennis Ritchie', 300.00, 3),
    ('Java Fundamentals',   'James Gosling',  500.00, 4),
    ('Compiler Design',     'Aho & Ullman',   425.00, 2),
    ('Linear Algebra',      'Gilbert Strang', 375.00, 5),
    ('Organic Chemistry II','Clayden',        520.00, 3);

INSERT INTO member (mem_name, mem_address, doj, fine_amt) VALUES
    ('Anish Kumar', 'Kolkata', CURRENT_DATE, 0),
    ('Ritu Sharma', 'Delhi',   CURRENT_DATE, 0),
    ('John Doe',    'Mumbai',  CURRENT_DATE, 0),
    ('Sarah Bell',  'Chennai', CURRENT_DATE, 0),
    ('Amit Bose',   'Kolkata', CURRENT_DATE, 0);
