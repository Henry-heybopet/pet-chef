#!/bin/sh
set -eu

backup_dir=/root/petchef-backups
timestamp=$(date +%Y%m%d-%H%M%S)
temporary_path="$backup_dir/.petchef-$timestamp.dump.tmp"
backup_path="$backup_dir/petchef-$timestamp.dump"

umask 077
mkdir -p "$backup_dir"

/usr/bin/docker exec petchef-db pg_dump -U petchef -d petchef --format=custom > "$temporary_path"
/usr/bin/docker exec -i petchef-db pg_restore --list < "$temporary_path" > /dev/null
mv "$temporary_path" "$backup_path"

find "$backup_dir" -type f -name 'petchef-*.dump' -mtime +14 -delete
echo "Validated database backup: $backup_path"
