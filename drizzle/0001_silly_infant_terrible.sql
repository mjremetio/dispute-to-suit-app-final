CREATE TABLE `activityLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`partnerId` int,
	`clientId` int,
	`caseId` int,
	`taskId` int,
	`action` varchar(100) NOT NULL,
	`description` text,
	`metadata` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `caseComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255) NOT NULL,
	`userRole` varchar(50) NOT NULL,
	`comment` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `caseComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`clientId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('new','pending_review','in_review','more_info_needed','ready_for_attorney','sent_to_attorney','accepted_by_attorney','rejected','settled','settlement_paid_out','closed') NOT NULL DEFAULT 'new',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`assignedTo` int,
	`assignedCroId` int,
	`caseType` varchar(100),
	`estimatedValue` decimal(10,2),
	`actualValue` decimal(10,2),
	`dueDate` timestamp,
	`completedAt` timestamp,
	`closedAt` timestamp,
	`settlementPaidOutDate` timestamp,
	`dateSubmittedToAttorney` timestamp,
	`googleDriveLink` text,
	`customFields` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`firstName` varchar(255) NOT NULL,
	`lastName` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`alternatePhone` varchar(50),
	`address` text,
	`city` varchar(100),
	`state` varchar(50),
	`zipCode` varchar(20),
	`dateOfBirth` timestamp,
	`ssn` varchar(255),
	`stage` enum('lead','prospect','active','completed','inactive') NOT NULL DEFAULT 'lead',
	`source` varchar(100),
	`tags` text,
	`notes` text,
	`customFields` text,
	`portalAccess` boolean NOT NULL DEFAULT false,
	`portalUserId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `croApplications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`companyName` varchar(255),
	`agreementAccepted` boolean NOT NULL DEFAULT false,
	`agreementAcceptedAt` timestamp,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`rejectionReason` text,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `croApplications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int,
	`clientId` int,
	`category` varchar(100),
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` bigint,
	`mimeType` varchar(100),
	`version` int DEFAULT 1,
	`isLatestVersion` boolean DEFAULT true,
	`tags` text,
	`creditReportSource` varchar(255),
	`expiresAt` timestamp,
	`requiresSignature` boolean DEFAULT false,
	`signedBy` varchar(255),
	`signedAt` timestamp,
	`signatureUrl` text,
	`signaturePositionX` decimal(7,2),
	`signaturePositionY` decimal(7,2),
	`signatureScale` decimal(5,2) DEFAULT '1.00',
	`uploadedBy` int NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `externalLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`label` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `externalLinks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `intakeInquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`croUserId` int NOT NULL,
	`croName` varchar(255) NOT NULL,
	`clientFirstName` varchar(255) NOT NULL,
	`clientLastName` varchar(255) NOT NULL,
	`clientDateOfBirth` timestamp,
	`clientEmail` varchar(320) NOT NULL,
	`clientFullAddress` text NOT NULL,
	`clientAddress` text,
	`clientCity` varchar(100),
	`clientState` varchar(50),
	`clientZipCode` varchar(20),
	`supportingDocuments` text,
	`annualCreditReportScreenshot` text,
	`intakeStatus` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`rejectionReason` text,
	`caseId` int,
	`clientNotificationSent` boolean NOT NULL DEFAULT false,
	`clientNotificationSentAt` timestamp,
	`croNotificationSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `intakeInquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inviteTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(255) NOT NULL,
	`email` varchar(320),
	`role` enum('user','admin','partner','client','legal','cro','paralegal') NOT NULL DEFAULT 'user',
	`maxUses` int DEFAULT 1,
	`usedCount` int DEFAULT 0,
	`expiresAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inviteTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `inviteTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`link` varchar(500),
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`companyName` varchar(255),
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`address` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`agreementAccepted` boolean NOT NULL DEFAULT false,
	`agreementAcceptedAt` timestamp,
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `passwordResetTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passwordResetTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `passwordResetTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `rateLimits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`endpoint` varchar(100) NOT NULL,
	`requestCount` int NOT NULL DEFAULT 0,
	`windowStart` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rateLimits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signatureTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`signatureUrl` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signatureTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`parentTaskId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`assignedTo` int,
	`dueDate` timestamp,
	`completedAt` timestamp,
	`timeTracked` int DEFAULT 0,
	`isRecurring` boolean DEFAULT false,
	`recurringPattern` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','partner','client','legal','cro','paralegal') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `partnerId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `trialDays` int DEFAULT 3;--> statement-breakpoint
ALTER TABLE `users` ADD `trialStartDate` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `trialExpirationSent` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `mustChangePassword` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `userId_idx` ON `activityLogs` (`userId`);--> statement-breakpoint
CREATE INDEX `partnerId_idx` ON `activityLogs` (`partnerId`);--> statement-breakpoint
CREATE INDEX `clientId_idx` ON `activityLogs` (`clientId`);--> statement-breakpoint
CREATE INDEX `caseId_idx` ON `activityLogs` (`caseId`);--> statement-breakpoint
CREATE INDEX `action_idx` ON `activityLogs` (`action`);--> statement-breakpoint
CREATE INDEX `createdAt_idx` ON `activityLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `caseId_idx` ON `caseComments` (`caseId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `caseComments` (`userId`);--> statement-breakpoint
CREATE INDEX `createdAt_idx` ON `caseComments` (`createdAt`);--> statement-breakpoint
CREATE INDEX `partnerId_idx` ON `cases` (`partnerId`);--> statement-breakpoint
CREATE INDEX `clientId_idx` ON `cases` (`clientId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `cases` (`status`);--> statement-breakpoint
CREATE INDEX `assignedTo_idx` ON `cases` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `assignedCroId_idx` ON `cases` (`assignedCroId`);--> statement-breakpoint
CREATE INDEX `partnerId_idx` ON `clients` (`partnerId`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `clients` (`email`);--> statement-breakpoint
CREATE INDEX `stage_idx` ON `clients` (`stage`);--> statement-breakpoint
CREATE INDEX `cro_app_status_idx` ON `croApplications` (`status`);--> statement-breakpoint
CREATE INDEX `cro_app_email_idx` ON `croApplications` (`email`);--> statement-breakpoint
CREATE INDEX `caseId_idx` ON `documents` (`caseId`);--> statement-breakpoint
CREATE INDEX `clientId_idx` ON `documents` (`clientId`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `documents` (`category`);--> statement-breakpoint
CREATE INDEX `caseId_idx` ON `externalLinks` (`caseId`);--> statement-breakpoint
CREATE INDEX `intake_croUserId_idx` ON `intakeInquiries` (`croUserId`);--> statement-breakpoint
CREATE INDEX `intake_status_idx` ON `intakeInquiries` (`intakeStatus`);--> statement-breakpoint
CREATE INDEX `intake_caseId_idx` ON `intakeInquiries` (`caseId`);--> statement-breakpoint
CREATE INDEX `token_idx` ON `inviteTokens` (`token`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `isRead_idx` ON `notifications` (`isRead`);--> statement-breakpoint
CREATE INDEX `createdAt_idx` ON `notifications` (`createdAt`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `partners` (`status`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `partners` (`email`);--> statement-breakpoint
CREATE INDEX `token_idx` ON `passwordResetTokens` (`token`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `passwordResetTokens` (`userId`);--> statement-breakpoint
CREATE INDEX `identifier_endpoint_idx` ON `rateLimits` (`identifier`,`endpoint`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `signatureTemplates` (`userId`);--> statement-breakpoint
CREATE INDEX `caseId_idx` ON `tasks` (`caseId`);--> statement-breakpoint
CREATE INDEX `parentTaskId_idx` ON `tasks` (`parentTaskId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `assignedTo_idx` ON `tasks` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `partnerId_idx` ON `users` (`partnerId`);