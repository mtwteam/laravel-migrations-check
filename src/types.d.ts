export interface Migration {
  filename: string;
  status: "added" | "modified" | "renamed" | "copied" | "changed";
  queries: string[];
  code: string;
  review?: {
    safe: boolean;
    comment: string;
    changes: string;
  };
}
