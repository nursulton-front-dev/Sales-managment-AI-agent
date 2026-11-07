-- Migration: 0002_add_workspace_settings.sql
-- Description: Adds JSONB settings column to workspaces table for user preferences,
-- such as quickStartDismissed and custom timezone.
-- Safe, idempotent, non-destructive.

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
