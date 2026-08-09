-- Migration: 20260809_restoration_otp_attempts
-- Purpose:   Add brute-force protection to the account_restoration_otps table.
--            Tracks how many times a code has been guessed so it can be invalidated
--            after MAX_RESTORATION_ATTEMPTS (5) failures.
--
-- Safe to apply on a live database — ALTER TABLE … ADD COLUMN IF NOT EXISTS is idempotent.

ALTER TABLE account_restoration_otps
    ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;
