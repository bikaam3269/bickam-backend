#!/bin/bash

# Vendor Fields Migration Script
# Adds latitude, longitude, whatsapp_number, and address to users table

echo "🚀 Starting vendor fields migration..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create a .env file with your database credentials"
    exit 1
fi

# Database credentials
DB_HOST="65.21.208.232"
DB_USER="bikaam_bikaam"
DB_PASSWORD="eO{p2IB;O@@y"
DB_NAME="bikaam_marketplace"

# Check if required variables are set
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    echo "❌ Error: Missing database credentials in .env"
    echo "Required: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
    exit 1
fi

echo "📊 Database: $DB_NAME"
echo "🖥️  Host: $DB_HOST"
echo "👤 User: $DB_USER"
echo ""

# Run the SQL migration
echo "📝 Running SQL migration..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < add_vendor_fields.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Added columns:"
    echo "  ✓ latitude (DECIMAL 10,8)"
    echo "  ✓ longitude (DECIMAL 11,8)"
    echo "  ✓ whatsapp_number (VARCHAR 255)"
    echo "  ✓ address (TEXT UTF8MB4)"
    echo ""
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check your database credentials and try again"
    exit 1
fi
