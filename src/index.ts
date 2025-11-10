import { getInput } from "@actions/core";
import { context } from "@actions/github";
import { getExecOutput } from "@actions/exec";
import { Reviewer, runHashFromComment } from "./reviewer";
import { listFilesChangedInPR, getComment, updateComment, createComment, deleteComment } from "./github";
import type { Migration } from "./types";

const MIGRATIONS_PATH = "database/migrations/";

const OPENAI_API_KEY = getInput("openai_token");
const PROJECT_CONTEXT = getInput("context");

const queriesFromMigration = async (filePath: string): Promise<string[]> => {
  const output = await getExecOutput("php", [
    "artisan",
    "tinker",
    "--no-ansi",
    "--execute",
    `echo implode(
      PHP_EOL,
      array_column(
        app("db")->pretend(fn()=>(include "${filePath}")->up()),
        "query"
      )
    )`,
  ]);

  return output.stdout.split("\n").filter((line) => line.trim() !== "");
};

const formatComment = (migrations: Migration[]): string => {
  let commentBody = `### This pull request includes the following database migrations:\n\n`;

  for (const migration of migrations) {
    commentBody += `#### (${migration.status}) ${migration.filename}\n\`\`\`sql\n${migration.queries.join("\n")}\n\`\`\`\n\n`;

    if (migration.review) {
      commentBody += `<details><summary><strong>LLM Review:</strong> ${migration.review.safe ? "✅ Safe" : "❌ Unsafe"}</summary>\n\n`;

      commentBody += `- **Comment:** ${migration.review.comment}\n`;

      if (migration.review.changes) {
        commentBody += `- **Recommended Changes:** ${migration.review.changes || "None"}\n`;
      }

      commentBody += `</details>\n\n`;
    }
  }

  commentBody += `*via [laravel-migrations-check](https://github.com/mtwteam/laravel-migrations-check)*`;
  return commentBody;
};

const run = async () => {
  if (!context.payload.pull_request) {
    throw new Error("This action can only be run on pull request events.");
  }

  // Get added or modified Laravel migration files
  const changedFiles = await listFilesChangedInPR();
  const migrationFiles = changedFiles.filter(
    (file) => file.filename.startsWith(MIGRATIONS_PATH) && file.filename.endsWith(".php"),
  );

  // Get queries for each migration
  const migrationsWithQueries = (await Promise.all(
    migrationFiles.map(async (file) => {
      const queries = await queriesFromMigration(file.filename);
      return {
        filename: file.filename.split("/").pop() ?? file.filename,
        status: file.status,
        queries,
      };
    }),
  )) as Migration[];

  const existingComment = await getComment();

  if (migrationsWithQueries.length === 0) {
    if (existingComment) {
      await deleteComment(existingComment.id);
    }

    console.log("No Laravel migration files changed.");
    return;
  }

  // Skip LLM review if OpenAI API key is not provided
  if (!OPENAI_API_KEY) {
    const commentBody = formatComment(migrationsWithQueries);
    if (existingComment) {
      await updateComment(existingComment.id, commentBody);
    } else {
      await createComment(commentBody);
    }
    return;
  }

  // Get run hash
  const lastRunHash = runHashFromComment(existingComment?.body ?? "");
  console.log(`Last run hash: ${lastRunHash ?? "none"}`);

  const reviewerRun = new Reviewer(OPENAI_API_KEY, migrationsWithQueries, PROJECT_CONTEXT);
  console.log(`Current run hash: ${reviewerRun.runHash}`);

  if (lastRunHash === reviewerRun.runHash) {
    console.log("No changes in migrations since last review. Skipping LLM review.");
    return;
  }

  const reviewedMigrations = await reviewerRun.reviewMigrations();

  const hashFooter = `<!-- llm-run-hash: ${reviewerRun.runHash} -->`;
  const commentBody = formatComment(reviewedMigrations) + "\n" + hashFooter;

  if (existingComment) {
    await updateComment(existingComment.id, commentBody);
  } else {
    await createComment(commentBody);
  }
};

void run();
