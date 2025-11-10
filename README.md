# GitHub Action: Laravel Migrations Check

GitHub Action to list Laravel migrations in Pull Requests and optionally review them with ChatGPT to spot unsafe migrations.

![sample comment](.github/assets/comment.png)

## Features

- Create a comment with a list of changed migrations and SQL queries they execute (generated with `php artisan migrate --pretend`.
- Review the migrations with OpenAI's GPT model and add suggestions to the comment.
- Only request OpenAI API if there are changes in migrations for optimal token usage.

## Usage

This action requires php and composer dependencies to be installed so `php artisan` can be executed.

Required permissions:

```yml
permissions:
  contents: write
  pull-requests: write
```

Job parameters:

```yml
- uses: mtwteam/laravel-migrations-check@v1
  with:
    # GitHub Token used to add comments to PRs.
    # Default: ${{ github.token }}
    github_token: ""

    # OpenAI Token used for automatic review. Not required.
    # Default: ""
    openai_token: ""

    # Additional context about the project, for example database engine version, list of big tables, etc.
    # Default: ""
    context: ""
```

## Full example

```yml
on:
  pull_request:

permissions:
  contents: write
  pull-requests: write

jobs:
  migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: shivammathur/setup-php@v2
        with:
          php-version: "8.4"
      - name: Install Composer dependencies
        run: composer install
      - uses: mtwteam/laravel-migrations-check@v1
        with:
          openai_token: ${{ secrets.OPENAI_API_KEY }}
          context: |
            We use MySQL 8.4, big tables are: events, orders.
```

## Scenarios

### Just add a comment with a list of new migrations

```yml
- uses: mtwteam/laravel-migrations-check@v1
```

### Review new migrations with ChatGPT

```yml
- uses: mtwteam/laravel-migrations-check@v1
  with:
    openai_token: ${{ secrets.OPENAI_TOKEN }}
    context: We use MySQL 8.4, big tables are: events, orders.
```
