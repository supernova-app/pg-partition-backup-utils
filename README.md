# Postgres Partition Backup Script

This script provides an interactive way to backup, detach, and optionally drop PostgreSQL table partitions. It's designed to help database administrators manage large partitioned tables by allowing them to selectively backup and remove older partitions.

## Features

- Connects to a PostgreSQL database using the `DATABASE_URL` environment variable
- Lists all partitions of a specified parent table
- Allows selection of specific partitions to process
- Detaches selected partitions from the parent table
- Creates backups of selected partitions using `pg_dump`
- Optionally drops detached partitions

## Prerequisites

- Bun/Node.js (version 14 or higher recommended)
- PostgreSQL client tools (specifically `pg_dump`)
- Access to a PostgreSQL database

## Installation

1. Clone this repository:

```bash
git clone https://github.com/supernova-app/pg-partition-backup-utils.git
cd pg-partition-backup-utils
```

2. Install dependencies:

```bash
bun install
```

3. Set up your environment variables. Copy the `.env.template` file to `.env` and set the `DATABASE_URL`.

```bash
cp .env.template .env
```

## Usage

Run the script using Bun:

```bash
bun run backup.ts
```

Follow the interactive prompts:

1. Enter the name of the parent table.
2. Select the partitions you want to process.
3. Confirm your selection.
4. The script will backup each selected partition and detach it from the parent table.
5. After processing, you'll have the option to drop some or all of the detached partitions.

## Important Notes

- Ensure you have sufficient permissions in the database to perform these operations.
- Always test this script in a non-production environment before using it on critical data.
- Backups are created in the current directory with the `.dump` extension.
- The script uses the PostgreSQL connection details from the `DATABASE_URL` environment variable.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)
