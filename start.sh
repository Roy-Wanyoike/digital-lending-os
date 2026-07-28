#!/bin/bash
# Youngsend startup script
export NEXTAUTH_SECRET='youngsend-super-secret-key-change-in-production-2026'
export NEXTAUTH_URL='http://localhost:3000'
export DATABASE_URL='file:/home/z/my-project/db/custom.db'
cd /home/z/my-project
exec npx next dev -p 3000
