ALTER TABLE `activities` ADD `media_key` text;--> statement-breakpoint
-- Backfill: anexos já gravados passam a ser contados pela coluna.
UPDATE `activities` SET `media_key` = json_extract(`meta`, '$.media.key') WHERE json_extract(`meta`, '$.media.key') IS NOT NULL;--> statement-breakpoint
CREATE INDEX `activities_type_idx` ON `activities` (`type`,`created_at`);--> statement-breakpoint
CREATE INDEX `leads_form_idx` ON `leads` (`form_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);