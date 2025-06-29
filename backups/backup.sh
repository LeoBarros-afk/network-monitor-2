#!/bin/sh

# Carrega as variáveis de ambiente (senha, usuário, etc.)
set -e

# Formata o nome do arquivo com a data e hora
FILENAME="backup-BancoDeDados$(date +%Y-%m-%d_%H-%M-%S).sql.gz"
BACKUP_PATH="/backups/${FILENAME}"

echo "Iniciando backup do banco de dados ${POSTGRES_DB}..."

# Comando principal que faz o backup
pg_dump -h postgres-db -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_PATH"

echo "Backup concluído: ${FILENAME}"

# Limpa backups antigos (com mais de 7 dias)
echo "Limpando backups com mais de 7 dias..."
find /backups -name "backup-*.sql.gz" -type f -mtime +7 -delete
echo "Limpeza concluída."