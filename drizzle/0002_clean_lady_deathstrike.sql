CREATE TABLE `apiKeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`keyHash` varchar(255) NOT NULL,
	`keyPrefix` varchar(12) NOT NULL,
	`name` varchar(255) NOT NULL,
	`permissions` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastUsedAt` timestamp,
	`expiresAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `apiKeys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `apikey_partnerId_idx` ON `apiKeys` (`partnerId`);--> statement-breakpoint
CREATE INDEX `apikey_keyPrefix_idx` ON `apiKeys` (`keyPrefix`);--> statement-breakpoint
CREATE INDEX `apikey_isActive_idx` ON `apiKeys` (`isActive`);