CREATE TABLE `Session` (
	`id` text PRIMARY KEY NOT NULL,
	`shop` text NOT NULL,
	`state` text NOT NULL,
	`isOnline` integer DEFAULT false NOT NULL,
	`scope` text,
	`expires` text,
	`accessToken` text NOT NULL,
	`userId` integer,
	`firstName` text,
	`lastName` text,
	`email` text,
	`accountOwner` integer DEFAULT false NOT NULL,
	`locale` text,
	`collaborator` integer DEFAULT false,
	`emailVerified` integer DEFAULT false
);
