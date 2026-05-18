# Library Management System — Original Specification

> **A beginner's approach**
> This document is the original academic brief that this project is based on.

---

## Overview

In a college library, a large collection of books is available for students. Students approach the librarian to issue books as per their requirements, and the librarian issues books depending on availability in stock.

**Rules:**

- A student may issue only **one copy** of any given book at a time, but may hold **multiple books** simultaneously, each with a different issue number.
- Books are issued for **10 days**.
- If a student fails to return a book by the due date, a **10-day grace period** is granted with no fine.
- After the grace period expires, a fine of **₹2 per day** is charged for every additional day, collected at the time of return.

---

## Schema

### Book

| Column | Type | Constraint |
|---|---|---|
| `book_no` | `NUMBER(3)` | `PRIMARY KEY` |
| `book_name` | `VARCHAR(25)` | `NOT NULL` |
| `author_name` | `VARCHAR(25)` | `NOT NULL` |
| `price` | `NUMBER(10,2)` | — |
| `qty_stock` | `NUMBER(3)` | — |

> `qty_stock` — number of copies currently available in stock.

### Member

| Column | Type | Constraint |
|---|---|---|
| `mem_id` | `NUMBER(3)` | `PRIMARY KEY` |
| `mem_name` | `VARCHAR(25)` | `NOT NULL` |
| `mem_address` | `VARCHAR(25)` | `NOT NULL` |
| `doj` | `DATE` | — |
| `fine_amt` | `NUMBER(10,2)` | — |

### Issue

| Column | Type | Constraint |
|---|---|---|
| `issue_no` | `NUMBER(3)` | `PRIMARY KEY` |
| `issue_date` | `DATE` | — |
| `mem_id` | `NUMBER(3)` | `REFERENCES member(mem_id)` |
| `book_no` | `NUMBER(3)` | `REFERENCES book(book_no)` |
| `return_date` | `DATE` | — |
| `returned` | `DATE` | — |

---

## Requirements

1. **Auto-increment issue number** — whenever the librarian issues a book, a unique `issue_no` is assigned automatically.
   > Hint: use a **sequence**.

2. **Dates set automatically** — `issue_date` is set to the current date; `return_date` is set to 10 days from today.

3. **Minimal librarian input** — the librarian only executes a single insert with the requested `book_no` and `mem_id`:

   ```sql
   INSERT INTO issue(mem_id, book_no) VALUES (1, 1);
   ```

4. **Stock check and update** — a book is only issued if `qty_stock > 0`; after issuing, `qty_stock` is decremented automatically.
   > Hint: use a **trigger**.

5. **Return and fine processing** — on return, the actual return date is written to `issue.returned`, and any fine due is calculated per the rules above and added to `member.fine_amt`.

---

## Fine Calculation Rules

| Period | Fine |
|---|---|
| Within 10-day issue period | ₹0 |
| Days 11–20 (grace period) | ₹0 |
| Day 21 onwards | ₹2 × (days beyond grace period) |
