-- Telefone único: se já houver leads duplicados pelo mesmo número, a criação do índice falha.
-- Nesse caso, junte/remova os duplicados antes (SELECT phone, count(*) FROM leads GROUP BY phone HAVING count(*) > 1).
DROP INDEX `leads_phone_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `leads_phone_unique` ON `leads` (`phone`);--> statement-breakpoint
ALTER TABLE `activities` ADD `provider_message_id` text;--> statement-breakpoint
-- Backfill a partir do JSON; só a primeira ocorrência de cada id recebe a coluna (respeita o índice único).
UPDATE `activities` SET `provider_message_id` = json_extract(`meta`, '$.providerMessageId')
WHERE `id` IN (
  SELECT min(`id`) FROM `activities`
  WHERE json_extract(`meta`, '$.providerMessageId') IS NOT NULL
  GROUP BY json_extract(`meta`, '$.providerMessageId')
);--> statement-breakpoint
CREATE UNIQUE INDEX `activities_provider_message_unique` ON `activities` (`provider_message_id`);
