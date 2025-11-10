import { getInput } from "@actions/core";
import { context, getOctokit } from "@actions/github";

const GITHUB_TOKEN = getInput("github_token");

// Unique header to identify the bot's comments
const HEADER = "<!-- laravel-migrations-check -->";

const octokit = getOctokit(GITHUB_TOKEN);

export const listFilesChangedInPR = async (): Promise<
  Awaited<ReturnType<typeof octokit.rest.pulls.listFiles>>["data"]
> => {
  const files = await octokit.rest.pulls.listFiles({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.payload.pull_request!.number,
  });

  return files.data.filter(
    (file) =>
      file.status === "added" ||
      file.status === "modified" ||
      file.status === "renamed" ||
      file.status === "copied" ||
      file.status === "changed",
  );
};

export const getComment = async (): Promise<{ id: number; body: string } | null> => {
  const { data: comments } = await octokit.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.payload.pull_request!.number,
  });

  const existingComment = comments.find((comment) => comment.body?.startsWith(HEADER));

  return existingComment?.body ? { id: existingComment.id, body: existingComment.body } : null;
};

export const updateComment = async (commentId: number, body: string) => {
  await octokit.rest.issues.updateComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    comment_id: commentId,
    body: `${HEADER}\n${body}`,
  });
};

export const createComment = async (body: string) => {
  await octokit.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.payload.pull_request!.number,
    body: `${HEADER}\n${body}`,
  });
};

export const deleteComment = async (commentId: number) => {
  await octokit.rest.issues.deleteComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    comment_id: commentId,
  });
};
