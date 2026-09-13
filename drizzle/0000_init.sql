CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`exploration_id` text NOT NULL,
	`event` text NOT NULL,
	`scope` text NOT NULL,
	`student_id` text,
	`node_id` text,
	`mastery_hint` text,
	`payload` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`node_id`) REFERENCES `knowledge_nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `evidence_session_idx` ON `evidence` (`session_id`);--> statement-breakpoint
CREATE INDEX `evidence_student_idx` ON `evidence` (`student_id`);--> statement-breakpoint
CREATE INDEX `evidence_node_idx` ON `evidence` (`node_id`);--> statement-breakpoint
CREATE TABLE `knowledge_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`unit_id` text,
	`synced_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mastery` (
	`student_id` text NOT NULL,
	`node_id` text NOT NULL,
	`level` text DEFAULT 'none' NOT NULL,
	`source` text DEFAULT 'teacher' NOT NULL,
	`note` text,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`student_id`, `node_id`),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`node_id`) REFERENCES `knowledge_nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mastery_node_idx` ON `mastery` (`node_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`exploration_id` text NOT NULL,
	`mode` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`archived` integer DEFAULT false NOT NULL
);
