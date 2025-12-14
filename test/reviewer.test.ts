import { describe, it, expect } from "vitest";
import { Reviewer, runHashFromComment } from "../src/reviewer";

describe("Reviewer", () => {
  describe("input", () => {
    it("generates correct input for OpenAI", () => {
      const reviewer = new Reviewer(
        "test-api-key",
        [
          {
            filename: "2023_01_01_000000_create_users_table.php",
            status: "added",
            queries: [
              "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));",
              "ALTER TABLE users ADD COLUMN email VARCHAR(255);",
            ],
            code: "<?php\n\nuse Illuminate\\Database\\Migrations\\Migration;\n\nclass CreateUsersTable extends Migration {\n    public function up() {\n        Schema::create('users', function (Blueprint $table) {\n            $table->id();\n            $table->string('name');\n        });\n        Schema::table('users', function (Blueprint $table) {\n            $table->string('email');\n        });\n    }\n}",
          },
        ],
        "Some additional context for the review.",
      );

      const expectedInput = `2023_01_01_000000_create_users_table.php

CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));
ALTER TABLE users ADD COLUMN email VARCHAR(255);

<?php

use Illuminate\\Database\\Migrations\\Migration;

class CreateUsersTable extends Migration {
    public function up() {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->string('email');
        });
    }
}`;

      expect(reviewer.input).toBe(expectedInput);
    });
  });

  describe("runHashFromComment", () => {
    it("extracts run hash from comment body", () => {
      const commentBody = `This is a review comment. <!-- llm-run-hash: abcdef1234567890 -->`;

      const runHash = runHashFromComment(commentBody);

      expect(runHash).toBe("abcdef1234567890");
    });
  });
});
