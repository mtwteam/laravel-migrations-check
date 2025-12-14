import OpenAI from "openai";
import type { Migration } from "./types";
import { createHash } from "crypto";

export class Reviewer {
  private INSTRUCTIONS = `
You are an expert software engineer with experience in Laravel PHP framework and SQL databases.

You will receive a list of database migrations, each with its corresponding SQL queries executed during the migration process.

Your goal is to detect potentially dangerous operations that can block tables for writing and cause application downtime.
`.trim();

  constructor(
    private readonly openaiApiKey: string,
    private readonly migrations: Migration[],
    private readonly context: string,
  ) {}

  get runHash(): string {
    return createHash("sha256").update(this.INSTRUCTIONS).update(this.context).update(this.input).digest("hex");
  }

  async reviewMigrations(): Promise<Migration[]> {
    const response = await this.call();

    // Match returned reviews with original migrations
    return this.migrations.map((migration) => {
      const review = response.find((r) => r.filename === migration.filename);

      return review
        ? {
            ...migration,
            review: {
              comment: review.comment,
              changes: review.changes,
              safe: review.safe,
            },
          }
        : migration;
    });
  }

  get input(): string {
    return this.migrations
      .map((migration) => `${migration.filename}\n\n${migration.queries.join("\n")}\n\n${migration.code}`)
      .join("\n\n---\n\n");
  }

  private async call() {
    const openai = new OpenAI({ apiKey: this.openaiApiKey });

    console.log("Calling OpenAI");
    console.log({
      instructions: this.INSTRUCTIONS,
      context: this.context,
      input: this.input,
    });

    const response = await openai.responses.create({
      model: "gpt-4.1",
      instructions: this.INSTRUCTIONS + this.context,
      input: this.input,
      text: {
        format: {
          type: "json_schema",
          name: "migration_reviews",
          strict: true,
          schema: {
            type: "object",
            properties: {
              migrations: {
                type: "array",
                description: "An array of migration review objects.",
                items: {
                  type: "object",
                  properties: {
                    filename: {
                      type: "string",
                      description: "The exact name of the migration file.",
                    },
                    comment: {
                      type: "string",
                      description: "Assessment of what's happening in the migration.",
                    },
                    changes: {
                      type: "string",
                      description: "Needed changes to ensure migration safety. Empty string if already safe.",
                    },
                    safe: {
                      type: "boolean",
                      description: "Whether the migration is currently considered safe.",
                    },
                  },
                  required: ["filename", "comment", "changes", "safe"],
                  additionalProperties: false,
                },
              },
            },
            required: ["migrations"],
            additionalProperties: false,
          },
        },
      },
      max_output_tokens: 2048,
    });

    const output = response.output_text;

    console.log("OpenAI response output:", output);

    const parsed = JSON.parse(output) as {
      migrations: {
        filename: string;
        comment: string;
        changes: string;
        safe: boolean;
      }[];
    };

    return parsed.migrations;
  }
}

export const runHashFromComment = (commentBody: string): string | null => {
  const hashMatch = /<!-- llm-run-hash: ([a-f0-9]+) -->/.exec(commentBody);
  return hashMatch ? hashMatch[1] : null;
};
