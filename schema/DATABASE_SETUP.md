/**
 * Database Configuration Examples
 */

# Database Setup Guide

## PostgreSQL Setup

### Installation

**macOS**:
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian**:
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows**:
Download from https://www.postgresql.org/download/windows/

### Create Database and User

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE attribution_db;

# Create user
CREATE USER attribution_user WITH PASSWORD 'secure_password';

# Grant privileges
ALTER ROLE attribution_user SET client_encoding TO 'utf8';
ALTER ROLE attribution_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE attribution_user SET default_transaction_deferrable TO on;
ALTER ROLE attribution_user SET default_transaction_read_committed TO on;
GRANT ALL PRIVILEGES ON DATABASE attribution_db TO attribution_user;

# Connect to database
\c attribution_db

# Import schema
\i schema/postgresql-schema.sql
```

### Connection String

```
postgresql://attribution_user:secure_password@localhost:5432/attribution_db
```

---

## MongoDB Setup

### Installation

**macOS**:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Docker**:
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Atlas Cloud** (Recommended for Production):
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Get connection string

### Create Database and User

```bash
# Connect to MongoDB
mongosh

# Create database
use attribution_db

# Create user with authentication
db.createUser({
  user: "attribution_user",
  pwd: "secure_password",
  roles: [
    { role: "readWrite", db: "attribution_db" }
  ]
})

# Verify connection
db.auth("attribution_user", "secure_password")
```

### Connection String

```
mongodb://attribution_user:secure_password@localhost:27017/attribution_db
```

### Atlas Connection String
```
mongodb+srv://attribution_user:secure_password@cluster.mongodb.net/attribution_db?retryWrites=true&w=majority
```

---

## Environment Configuration

Update `.env` file with database configuration:

### PostgreSQL

```env
# PostgreSQL Configuration
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=attribution_db
DB_USER=attribution_user
DB_PASSWORD=secure_password

# Connection Pool
DB_POOL_MIN=5
DB_POOL_MAX=20

# Logging
DB_LOGGING=false
```

### MongoDB

```env
# MongoDB Configuration
DB_TYPE=mongodb
DB_URI=mongodb://attribution_user:secure_password@localhost:27017/attribution_db

# Connection Pool
DB_POOL_SIZE=50

# Logging
DB_LOGGING=false
```

---

## Node.js Driver Installation

### PostgreSQL

```bash
npm install pg
npm install knex  # Optional: query builder
```

### MongoDB

```bash
npm install mongoose
npm install mongodb  # Native driver
```

---

## Database Connection Examples

### PostgreSQL with pg

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  max: process.env.DB_POOL_MAX || 20,
  min: process.env.DB_POOL_MIN || 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
```

### MongoDB with Mongoose

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: process.env.DB_POOL_SIZE || 50,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

---

## Backup and Recovery

### PostgreSQL Backup

**Full Database Backup**:
```bash
pg_dump -U attribution_user -h localhost attribution_db > backup.sql

# With compression
pg_dump -U attribution_user -h localhost -Fc attribution_db > backup.dump
```

**Restore**:
```bash
psql -U attribution_user -h localhost attribution_db < backup.sql

# From compressed
pg_restore -U attribution_user -h localhost -d attribution_db backup.dump
```

**Automated Backup (cron)**:
```bash
0 2 * * * pg_dump -U attribution_user attribution_db | gzip > /backups/attribution_$(date +\%Y\%m\%d).sql.gz
```

### MongoDB Backup

**Full Backup**:
```bash
mongodump --uri="mongodb://attribution_user:password@localhost:27017/attribution_db" --out=/backups/

# Or with mongosh
mongosh --eval 'db.attribution_db.getCollectionNames().forEach(c => {db[c].createIndex({createdAt: -1})})'
```

**Restore**:
```bash
mongorestore --uri="mongodb://attribution_user:password@localhost:27017/attribution_db" /backups/
```

---

## Monitoring and Maintenance

### PostgreSQL

**Check Database Size**:
```sql
SELECT 
  datname,
  pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
WHERE datname = 'attribution_db';
```

**Table Statistics**:
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  n_live_tup as live_rows
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Vacuum and Analyze**:
```sql
VACUUM ANALYZE;  -- Run regularly to maintain performance
```

### MongoDB

**Check Database Size**:
```javascript
db.stats()  // In mongosh
```

**Collection Stats**:
```javascript
db.clicks.stats()
db.install_events.stats()
```

**Index Stats**:
```javascript
db.clicks.aggregate([{ $indexStats: {} }])
```

---

## Production Checklist

- [ ] Enable SSL/TLS connections
- [ ] Set up automated backups
- [ ] Configure connection pooling
- [ ] Enable query logging and monitoring
- [ ] Set up database replication/HA
- [ ] Create read-only replicas for analytics queries
- [ ] Implement query performance monitoring
- [ ] Set up alerts for database issues
- [ ] Document backup/recovery procedures
- [ ] Test disaster recovery regularly
- [ ] Configure retention policies
- [ ] Set up encryption at rest

