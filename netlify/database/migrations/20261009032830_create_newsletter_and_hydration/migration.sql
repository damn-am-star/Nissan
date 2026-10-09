CREATE TABLE "athlete_hydration_logs" (
	"id" serial PRIMARY KEY,
	"athlete_name" text NOT NULL,
	"sport" text NOT NULL,
	"fluid_ml" serial,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" serial PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL
);
