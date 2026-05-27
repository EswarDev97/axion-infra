/**
 * Test: Schema Context Hook
 *
 * Tests data-layer file detection, SQL/Prisma parsing (tables, views,
 * materialized views, indexes, nullable), cache freshness, schema discovery,
 * multi-schema grouping, and hook behavior.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`${colors.green}\u2713${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}\u2717${colors.reset} ${name}`);
    console.log(`  ${colors.yellow}${error.message}${colors.reset}`);
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${JSON.stringify(expected)}\n  Got: ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(`${message}\n  Expected truthy value`);
  }
}

function assertFalse(condition, message = '') {
  if (condition) {
    throw new Error(`${message}\n  Expected falsy value`);
  }
}

function assertIncludes(str, substring, message = '') {
  if (!str.includes(substring)) {
    throw new Error(`${message}\n  Expected to include: ${JSON.stringify(substring)}\n  In: ${JSON.stringify(str.substring(0, 200))}`);
  }
}

function assertDeepEqual(actual, expected, message = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(`${message}\n  Expected: ${b}\n  Got: ${a}`);
  }
}

// ============================================================================
// Import module under test
// ============================================================================

const {
  isDataLayerFile,
  parseSQL,
  parsePrisma,
  parseViewColumns,
  formatTablesAsContext,
  groupByDatabaseAndSchema,
  extractSchemaSection,
  extractDrizzleTables,
  inferDatabaseFromPath,
} = require('../hooks/schema-context-hook');

// ============================================================================
// isDataLayerFile tests
// ============================================================================

console.log('\n--- isDataLayerFile ---\n');

test('detects repository directory', () => {
  assertTrue(isDataLayerFile('src/users/repositories/user.repository.ts'));
});

test('detects models directory', () => {
  assertTrue(isDataLayerFile('src/models/User.ts'));
});

test('detects entities directory', () => {
  assertTrue(isDataLayerFile('src/entities/Order.ts'));
});

test('detects queries directory', () => {
  assertTrue(isDataLayerFile('src/queries/getUserById.ts'));
});

test('detects dao directory', () => {
  assertTrue(isDataLayerFile('src/dao/OrderDao.java'));
});

test('detects mappers directory', () => {
  assertTrue(isDataLayerFile('src/mappers/UserMapper.ts'));
});

test('detects controllers directory', () => {
  assertTrue(isDataLayerFile('src/controllers/UserController.ts'));
});

test('detects prisma directory', () => {
  assertTrue(isDataLayerFile('prisma/schema.prisma'));
});

test('detects migrations directory', () => {
  assertTrue(isDataLayerFile('db/migrations/001_create_users.sql'));
});

test('detects .repository. filename pattern', () => {
  assertTrue(isDataLayerFile('src/user.repository.ts'));
});

test('detects .model. filename pattern', () => {
  assertTrue(isDataLayerFile('src/user.model.ts'));
});

test('detects .entity. filename pattern', () => {
  assertTrue(isDataLayerFile('src/user.entity.ts'));
});

test('detects .query. filename pattern', () => {
  assertTrue(isDataLayerFile('src/user.query.ts'));
});

test('detects .prisma file extension', () => {
  assertTrue(isDataLayerFile('schema.prisma'));
});

test('detects .sql file extension', () => {
  assertTrue(isDataLayerFile('create-tables.sql'));
});

test('skips regular component files', () => {
  assertFalse(isDataLayerFile('src/components/Button.tsx'));
});

test('skips utility files', () => {
  assertFalse(isDataLayerFile('src/utils/format.ts'));
});

test('skips test files', () => {
  assertFalse(isDataLayerFile('src/__tests__/user.test.ts'));
});

test('skips config files', () => {
  assertFalse(isDataLayerFile('tsconfig.json'));
});

test('skips style files', () => {
  assertFalse(isDataLayerFile('src/styles/main.css'));
});

test('handles null/undefined input', () => {
  assertFalse(isDataLayerFile(null));
  assertFalse(isDataLayerFile(undefined));
  assertFalse(isDataLayerFile(''));
});

// ============================================================================
// parseSQL - basic table tests
// ============================================================================

console.log('\n--- parseSQL (tables) ---\n');

test('parses simple CREATE TABLE', () => {
  const sql = `
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  const tables = parseSQL(sql);
  assertEqual(tables.length, 1, 'Should find 1 table');
  assertEqual(tables[0].table, 'users', 'Table name should be users');
  assertEqual(tables[0].objectType, 'TABLE', 'Object type should be TABLE');
  assertEqual(tables[0].columns.length, 4, 'Should find 4 columns');
  assertEqual(tables[0].columns[0].name, 'id', 'First column should be id');
  assertIncludes(tables[0].columns[0].constraints, 'PK', 'id should be PK');
  assertIncludes(tables[0].columns[1].constraints, 'NOT NULL', 'email should be NOT NULL');
  assertIncludes(tables[0].columns[1].constraints, 'UNIQUE', 'email should be UNIQUE');
});

test('parses CREATE TABLE IF NOT EXISTS', () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id),
      total DECIMAL(10,2) NOT NULL
    );
  `;
  const tables = parseSQL(sql);
  assertEqual(tables.length, 1, 'Should find 1 table');
  assertEqual(tables[0].table, 'orders', 'Table name should be orders');
  assertEqual(tables[0].columns.length, 3, 'Should find 3 columns');
  assertIncludes(tables[0].columns[1].constraints, 'FK', 'user_id should be FK');
});

test('parses multiple tables', () => {
  const sql = `
    CREATE TABLE products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL
    );

    CREATE TABLE categories (
      id SERIAL PRIMARY KEY,
      label VARCHAR(100) NOT NULL
    );
  `;
  const tables = parseSQL(sql);
  assertEqual(tables.length, 2, 'Should find 2 tables');
  assertEqual(tables[0].table, 'products');
  assertEqual(tables[1].table, 'categories');
});

test('ignores SQL comments', () => {
  const sql = `
    -- This is a comment
    CREATE TABLE items (
      id SERIAL PRIMARY KEY,
      /* multi-line
         comment */
      name VARCHAR(100)
    );
  `;
  const tables = parseSQL(sql);
  assertEqual(tables.length, 1, 'Should find 1 table');
  assertEqual(tables[0].table, 'items');
});

test('skips standalone constraint lines', () => {
  const sql = `
    CREATE TABLE order_items (
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT DEFAULT 1,
      PRIMARY KEY (order_id, product_id),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `;
  const tables = parseSQL(sql);
  assertEqual(tables.length, 1, 'Should find 1 table');
  assertEqual(tables[0].columns.length, 3, 'Should find 3 data columns');
});

test('returns empty array for non-DDL SQL', () => {
  const sql = `
    SELECT * FROM users WHERE id = 1;
    INSERT INTO logs (message) VALUES ('test');
  `;
  const tables = parseSQL(sql);
  assertEqual(tables.length, 0, 'Should find 0 tables');
});

// ============================================================================
// parseSQL - schema prefix tests
// ============================================================================

console.log('\n--- parseSQL (schema prefix) ---\n');

test('preserves schema prefix in separate field', () => {
  const sql = `
    CREATE TABLE auth.users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL
    );
  `;
  const tables = parseSQL(sql);
  assertEqual(tables.length, 1, 'Should find 1 table');
  assertEqual(tables[0].table, 'users', 'Table name should be users');
  assertEqual(tables[0].schema, 'auth', 'Schema should be auth');
});

test('handles multiple schemas', () => {
  const sql = `
    CREATE TABLE auth.users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL
    );

    CREATE TABLE billing.invoices (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL
    );
  `;
  const tables = parseSQL(sql);
  assertEqual(tables.length, 2, 'Should find 2 tables');
  assertEqual(tables[0].schema, 'auth');
  assertEqual(tables[1].schema, 'billing');
});

test('null schema when no prefix', () => {
  const sql = `
    CREATE TABLE users (
      id SERIAL PRIMARY KEY
    );
  `;
  const tables = parseSQL(sql);
  assertEqual(tables[0].schema, null, 'Schema should be null when no prefix');
});

// ============================================================================
// parseSQL - nullable tracking
// ============================================================================

console.log('\n--- parseSQL (nullable) ---\n');

test('tracks nullable columns', () => {
  const sql = `
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      nickname VARCHAR(100),
      bio TEXT
    );
  `;
  const tables = parseSQL(sql);
  assertEqual(tables[0].columns[0].nullable, false, 'PK should not be nullable');
  assertEqual(tables[0].columns[1].nullable, false, 'NOT NULL column should not be nullable');
  assertEqual(tables[0].columns[2].nullable, true, 'Column without NOT NULL should be nullable');
  assertEqual(tables[0].columns[3].nullable, true, 'Column without NOT NULL should be nullable');
});

test('nullable field in constraints string', () => {
  const sql = `
    CREATE TABLE test (
      id INT PRIMARY KEY,
      name VARCHAR(100)
    );
  `;
  const tables = parseSQL(sql);
  assertIncludes(tables[0].columns[0].constraints, 'PK');
  assertIncludes(tables[0].columns[1].constraints, 'NULLABLE');
});

// ============================================================================
// parseSQL - VIEW parsing
// ============================================================================

console.log('\n--- parseSQL (views) ---\n');

test('parses CREATE VIEW', () => {
  const sql = `
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(100)
    );

    CREATE VIEW active_users AS
    SELECT id, email, name FROM users WHERE active = true;
  `;
  const objects = parseSQL(sql);
  assertEqual(objects.length, 2, 'Should find 1 table + 1 view');
  assertEqual(objects[1].table, 'active_users');
  assertEqual(objects[1].objectType, 'VIEW');
  assertTrue(objects[1].columns.length > 0, 'View should have columns');
});

test('parses CREATE OR REPLACE VIEW', () => {
  const sql = `
    CREATE OR REPLACE VIEW user_summary AS
    SELECT id, email FROM users;
  `;
  const objects = parseSQL(sql);
  const view = objects.find(o => o.objectType === 'VIEW');
  assertTrue(view !== undefined, 'Should find a VIEW');
  assertEqual(view.table, 'user_summary');
});

test('parses schema-prefixed VIEW', () => {
  const sql = `
    CREATE VIEW reporting.daily_stats AS
    SELECT count(*) AS total FROM orders;
  `;
  const objects = parseSQL(sql);
  const view = objects.find(o => o.objectType === 'VIEW');
  assertTrue(view !== undefined, 'Should find a VIEW');
  assertEqual(view.table, 'daily_stats');
  assertEqual(view.schema, 'reporting');
});

// ============================================================================
// parseSQL - MATERIALIZED VIEW parsing
// ============================================================================

console.log('\n--- parseSQL (materialized views) ---\n');

test('parses CREATE MATERIALIZED VIEW', () => {
  const sql = `
    CREATE MATERIALIZED VIEW product_stats AS
    SELECT product_id, count(*) AS order_count, sum(total) AS revenue
    FROM orders
    GROUP BY product_id;
  `;
  const objects = parseSQL(sql);
  assertEqual(objects.length, 1, 'Should find 1 materialized view');
  assertEqual(objects[0].table, 'product_stats');
  assertEqual(objects[0].objectType, 'MATERIALIZED VIEW');
  assertTrue(objects[0].columns.length > 0, 'Should have columns');
});

test('parses schema-prefixed materialized view', () => {
  const sql = `
    CREATE MATERIALIZED VIEW analytics.monthly_revenue AS
    SELECT date_trunc('month', created_at) AS month, sum(total) AS revenue
    FROM orders
    GROUP BY month;
  `;
  const objects = parseSQL(sql);
  const matView = objects.find(o => o.objectType === 'MATERIALIZED VIEW');
  assertTrue(matView !== undefined, 'Should find a MATERIALIZED VIEW');
  assertEqual(matView.schema, 'analytics');
});

// ============================================================================
// parseSQL - INDEX parsing
// ============================================================================

console.log('\n--- parseSQL (indexes) ---\n');

test('parses CREATE INDEX and attaches to table', () => {
  const sql = `
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL
    );

    CREATE INDEX idx_users_email ON users(email);
  `;
  const objects = parseSQL(sql);
  assertEqual(objects.length, 1, 'Should find 1 table (index attached)');
  assertEqual(objects[0].indexes.length, 1, 'Should have 1 index');
  assertEqual(objects[0].indexes[0].name, 'idx_users_email');
  assertDeepEqual(objects[0].indexes[0].columns, ['email']);
  assertEqual(objects[0].indexes[0].unique, false);
});

test('parses CREATE UNIQUE INDEX', () => {
  const sql = `
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL
    );

    CREATE UNIQUE INDEX uq_users_email ON users(email);
  `;
  const objects = parseSQL(sql);
  assertEqual(objects[0].indexes[0].unique, true, 'Should be unique index');
});

test('parses composite index', () => {
  const sql = `
    CREATE TABLE orders (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      status VARCHAR(20)
    );

    CREATE INDEX idx_orders_user_status ON orders(user_id, status);
  `;
  const objects = parseSQL(sql);
  assertEqual(objects[0].indexes[0].columns.length, 2, 'Should have 2 columns');
  assertDeepEqual(objects[0].indexes[0].columns, ['user_id', 'status']);
});

test('parses multiple indexes on same table', () => {
  const sql = `
    CREATE TABLE products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200),
      category_id INT,
      price DECIMAL(10,2)
    );

    CREATE INDEX idx_products_name ON products(name);
    CREATE INDEX idx_products_category ON products(category_id);
    CREATE UNIQUE INDEX uq_products_name_cat ON products(name, category_id);
  `;
  const objects = parseSQL(sql);
  assertEqual(objects[0].indexes.length, 3, 'Should have 3 indexes');
});

test('creates stub for index on missing table', () => {
  const sql = `
    CREATE INDEX idx_missing_col ON missing_table(col1);
  `;
  const objects = parseSQL(sql);
  assertEqual(objects.length, 1, 'Should create stub table for orphan index');
  assertEqual(objects[0].table, 'missing_table');
  assertEqual(objects[0].indexes.length, 1);
});

// ============================================================================
// parseSQL - multi-database via options
// ============================================================================

console.log('\n--- parseSQL (multi-database) ---\n');

test('passes database option through', () => {
  const sql = `
    CREATE TABLE users (
      id SERIAL PRIMARY KEY
    );
  `;
  const objects = parseSQL(sql, { database: 'primary_db' });
  assertEqual(objects[0].database, 'primary_db');
});

test('null database by default', () => {
  const sql = `
    CREATE TABLE users (
      id SERIAL PRIMARY KEY
    );
  `;
  const objects = parseSQL(sql);
  assertEqual(objects[0].database, null);
});

// ============================================================================
// parseSQL - comprehensive multi-object test
// ============================================================================

console.log('\n--- parseSQL (comprehensive) ---\n');

test('parses tables + views + indexes together', () => {
  const sql = `
    CREATE TABLE auth.users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(100),
      active BOOLEAN DEFAULT true
    );

    CREATE TABLE auth.roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL
    );

    CREATE VIEW auth.active_users AS
    SELECT id, email, name FROM auth.users WHERE active = true;

    CREATE MATERIALIZED VIEW reporting.user_stats AS
    SELECT count(*) AS total_users FROM auth.users;

    CREATE INDEX idx_users_email ON auth.users(email);
    CREATE UNIQUE INDEX uq_users_name ON auth.users(name);
    CREATE INDEX idx_roles_name ON auth.roles(name);
  `;
  const objects = parseSQL(sql);

  const tables = objects.filter(o => o.objectType === 'TABLE');
  const views = objects.filter(o => o.objectType === 'VIEW');
  const matViews = objects.filter(o => o.objectType === 'MATERIALIZED VIEW');

  assertEqual(tables.length, 2, 'Should find 2 tables');
  assertEqual(views.length, 1, 'Should find 1 view');
  assertEqual(matViews.length, 1, 'Should find 1 materialized view');

  // Verify schema prefixes
  assertEqual(tables[0].schema, 'auth');
  assertEqual(views[0].schema, 'auth');
  assertEqual(matViews[0].schema, 'reporting');

  // Verify indexes attached to correct tables
  const usersTable = tables.find(t => t.table === 'users');
  const rolesTable = tables.find(t => t.table === 'roles');
  assertTrue(usersTable.indexes.length >= 2, 'users should have >= 2 indexes');
  assertTrue(rolesTable.indexes.length >= 1, 'roles should have >= 1 index');
});

// ============================================================================
// parsePrisma tests
// ============================================================================

console.log('\n--- parsePrisma ---\n');

test('parses simple Prisma model', () => {
  const prisma = `
    model User {
      id    Int    @id @default(autoincrement())
      email String @unique
      name  String?
      posts Post[]
    }
  `;
  const tables = parsePrisma(prisma);
  assertEqual(tables.length, 1, 'Should find 1 model');
  assertEqual(tables[0].table, 'User', 'Model name should be User');
  assertEqual(tables[0].objectType, 'TABLE', 'Object type should be TABLE');
  assertEqual(tables[0].columns.length, 4, 'Should find 4 fields');
  assertIncludes(tables[0].columns[0].constraints, 'PK', 'id should be PK');
  assertIncludes(tables[0].columns[1].constraints, 'UNIQUE', 'email should be UNIQUE');
  assertIncludes(tables[0].columns[2].constraints, 'NULLABLE', 'name should be NULLABLE');
});

test('parses Prisma model with relations', () => {
  const prisma = `
    model Post {
      id       Int    @id @default(autoincrement())
      title    String
      authorId Int
      author   User   @relation(fields: [authorId], references: [id])
    }
  `;
  const tables = parsePrisma(prisma);
  assertEqual(tables.length, 1, 'Should find 1 model');
  assertEqual(tables[0].columns.length, 4, 'Should find 4 fields');
  assertIncludes(tables[0].columns[3].constraints, 'FK', 'author should be FK');
});

test('parses multiple Prisma models', () => {
  const prisma = `
    model User {
      id   Int    @id
      name String
    }

    model Post {
      id    Int    @id
      title String
    }
  `;
  const tables = parsePrisma(prisma);
  assertEqual(tables.length, 2, 'Should find 2 models');
  assertEqual(tables[0].table, 'User');
  assertEqual(tables[1].table, 'Post');
});

test('extracts Prisma @@index directives', () => {
  const prisma = `
    model User {
      id    Int    @id
      email String
      name  String
      @@index([email])
      @@index([name, email], map: "idx_user_name_email")
    }
  `;
  const tables = parsePrisma(prisma);
  assertEqual(tables.length, 1);
  assertEqual(tables[0].indexes.length, 2, 'Should find 2 indexes');
  assertDeepEqual(tables[0].indexes[0].columns, ['email']);
  assertEqual(tables[0].indexes[0].unique, false);
  assertEqual(tables[0].indexes[1].name, 'idx_user_name_email');
  assertDeepEqual(tables[0].indexes[1].columns, ['name', 'email']);
});

test('extracts Prisma @@unique directives', () => {
  const prisma = `
    model UserRole {
      id     Int @id
      userId Int
      roleId Int
      @@unique([userId, roleId])
    }
  `;
  const tables = parsePrisma(prisma);
  assertEqual(tables[0].indexes.length, 1);
  assertEqual(tables[0].indexes[0].unique, true);
  assertDeepEqual(tables[0].indexes[0].columns, ['userId', 'roleId']);
});

test('tracks Prisma nullable vs NOT NULL', () => {
  const prisma = `
    model Product {
      id    Int     @id
      name  String
      desc  String?
      price Float
    }
  `;
  const tables = parsePrisma(prisma);
  assertEqual(tables[0].columns[1].nullable, false, 'name should not be nullable');
  assertIncludes(tables[0].columns[1].constraints, 'NOT NULL');
  assertEqual(tables[0].columns[2].nullable, true, 'desc should be nullable');
  assertIncludes(tables[0].columns[2].constraints, 'NULLABLE');
});

test('ignores Prisma comments and @@map directives', () => {
  const prisma = `
    model User {
      // This is a comment
      id   Int    @id
      name String
      @@map("users")
    }
  `;
  const tables = parsePrisma(prisma);
  assertEqual(tables.length, 1, 'Should find 1 model');
  assertEqual(tables[0].columns.length, 2, 'Should find 2 fields (skip comments and @@map)');
});

// ============================================================================
// formatTablesAsContext tests
// ============================================================================

console.log('\n--- formatTablesAsContext ---\n');

test('formats tables with PK/FK/Nullable columns', () => {
  const tables = [
    {
      table: 'users',
      schema: null,
      database: null,
      objectType: 'TABLE',
      columns: [
        { name: 'id', type: 'SERIAL', constraints: 'PK', nullable: false },
        { name: 'email', type: 'VARCHAR(255)', constraints: 'NOT NULL, UNIQUE', nullable: false },
        { name: 'name', type: 'VARCHAR(100)', constraints: 'NULLABLE', nullable: true },
      ],
      indexes: [],
    },
  ];
  const output = formatTablesAsContext(tables);
  assertIncludes(output, '### users', 'Should include table name as heading');
  assertIncludes(output, '| Column | Type | PK | FK | Nullable |', 'Should have PK/FK/Nullable headers');
  assertIncludes(output, '| id | SERIAL | Y |', 'id should show PK=Y');
  assertIncludes(output, '| name | VARCHAR(100) |  |  | Y |', 'name should show Nullable=Y');
});

test('formats schema-prefixed tables', () => {
  const tables = [
    {
      table: 'users',
      schema: 'auth',
      database: null,
      objectType: 'TABLE',
      columns: [{ name: 'id', type: 'INT', constraints: 'PK', nullable: false }],
      indexes: [],
    },
  ];
  const output = formatTablesAsContext(tables);
  assertIncludes(output, '### auth.users', 'Should show schema.table');
});

test('formats views with type label', () => {
  const tables = [
    {
      table: 'active_users',
      schema: null,
      database: null,
      objectType: 'VIEW',
      columns: [{ name: 'id', type: 'INT', constraints: '', nullable: true }],
      indexes: [],
    },
  ];
  const output = formatTablesAsContext(tables);
  assertIncludes(output, '### active_users (VIEW)', 'Should show VIEW label');
});

test('formats materialized views with type label', () => {
  const tables = [
    {
      table: 'stats',
      schema: 'reporting',
      database: null,
      objectType: 'MATERIALIZED VIEW',
      columns: [{ name: 'total', type: 'INT', constraints: '', nullable: true }],
      indexes: [],
    },
  ];
  const output = formatTablesAsContext(tables);
  assertIncludes(output, '### reporting.stats (MATERIALIZED VIEW)');
});

test('formats indexes per table', () => {
  const tables = [
    {
      table: 'users',
      schema: null,
      database: null,
      objectType: 'TABLE',
      columns: [{ name: 'email', type: 'VARCHAR(255)', constraints: 'NOT NULL', nullable: false }],
      indexes: [
        { name: 'idx_users_email', columns: ['email'], unique: false },
        { name: 'uq_users_email', columns: ['email'], unique: true },
      ],
    },
  ];
  const output = formatTablesAsContext(tables);
  assertIncludes(output, '**Indexes:**');
  assertIncludes(output, '`idx_users_email`: (email)');
  assertIncludes(output, '`uq_users_email`: UNIQUE (email)');
});

test('groups by database', () => {
  const tables = [
    {
      table: 'users',
      schema: null,
      database: 'primary_db',
      objectType: 'TABLE',
      columns: [{ name: 'id', type: 'INT', constraints: 'PK', nullable: false }],
      indexes: [],
    },
    {
      table: 'logs',
      schema: null,
      database: 'analytics_db',
      objectType: 'TABLE',
      columns: [{ name: 'id', type: 'INT', constraints: 'PK', nullable: false }],
      indexes: [],
    },
  ];
  const output = formatTablesAsContext(tables);
  assertIncludes(output, '## Database: primary_db');
  assertIncludes(output, '## Database: analytics_db');
});

test('groups by schema within database', () => {
  const tables = [
    {
      table: 'users',
      schema: 'auth',
      database: null,
      objectType: 'TABLE',
      columns: [{ name: 'id', type: 'INT', constraints: 'PK', nullable: false }],
      indexes: [],
    },
    {
      table: 'orders',
      schema: 'billing',
      database: null,
      objectType: 'TABLE',
      columns: [{ name: 'id', type: 'INT', constraints: 'PK', nullable: false }],
      indexes: [],
    },
  ];
  const output = formatTablesAsContext(tables);
  assertIncludes(output, '## Schema: auth');
  assertIncludes(output, '## Schema: billing');
});

// ============================================================================
// groupByDatabaseAndSchema tests
// ============================================================================

console.log('\n--- groupByDatabaseAndSchema ---\n');

test('groups objects by database and schema', () => {
  const objects = [
    { table: 'a', database: 'db1', schema: 's1' },
    { table: 'b', database: 'db1', schema: 's2' },
    { table: 'c', database: 'db2', schema: null },
    { table: 'd', database: null, schema: null },
  ];
  const grouped = groupByDatabaseAndSchema(objects);
  assertTrue('db1' in grouped);
  assertTrue('db2' in grouped);
  assertTrue('_default' in grouped);
  assertTrue('s1' in grouped.db1);
  assertTrue('s2' in grouped.db1);
});

// ============================================================================
// inferDatabaseFromPath tests
// ============================================================================

console.log('\n--- inferDatabaseFromPath ---\n');

test('infers database from db/<name>/migrations/ path', () => {
  const result = inferDatabaseFromPath('/project/db/analytics/migrations/001.sql', '/project');
  assertEqual(result, 'analytics');
});

test('infers database from databases/<name>/ path', () => {
  const result = inferDatabaseFromPath('/project/databases/primary/schema.sql', '/project');
  assertEqual(result, 'primary');
});

test('returns null for standard paths', () => {
  const result = inferDatabaseFromPath('/project/migrations/001.sql', '/project');
  assertEqual(result, null);
});

// ============================================================================
// extractSchemaSection tests
// ============================================================================

console.log('\n--- extractSchemaSection ---\n');

test('extracts mermaid ER diagram from markdown', () => {
  const content = `# Schema Design

## Entity-Relationship Diagram

\`\`\`mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER {
        uuid id PK
        string email UK
    }
\`\`\`
`;
  const result = extractSchemaSection(content);
  assertIncludes(result, 'erDiagram', 'Should extract mermaid content');
  assertIncludes(result, 'USER ||--o{ ORDER', 'Should include relationships');
});

test('extracts SQL code blocks from markdown', () => {
  const content = `# Schema Design

\`\`\`sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255)
);
\`\`\`
`;
  const result = extractSchemaSection(content);
  assertIncludes(result, 'CREATE TABLE users', 'Should extract SQL blocks');
});

test('returns null for markdown without schema content', () => {
  const content = `# README

This is a project readme with no schema information.
`;
  const result = extractSchemaSection(content);
  assertEqual(result, null, 'Should return null for non-schema markdown');
});

// ============================================================================
// extractDrizzleTables tests
// ============================================================================

console.log('\n--- extractDrizzleTables ---\n');

test('extracts pgTable definitions', () => {
  const content = `
import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }),
});
`;
  const result = extractDrizzleTables(content);
  assertTrue(result !== null, 'Should find drizzle tables');
  assertIncludes(result, 'Table: users', 'Should include table name');
});

test('returns null for non-drizzle TypeScript', () => {
  const content = `
export function getUser(id: string) {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}
`;
  const result = extractDrizzleTables(content);
  assertEqual(result, null, 'Should return null for non-drizzle TS');
});

// ============================================================================
// Hook integration tests (without actual filesystem)
// ============================================================================

console.log('\n--- hook integration ---\n');

const { hook } = require('../hooks/schema-context-hook');

test('hook skips non-Write/Edit tools', async () => {
  const result = await hook({ tool_name: 'Read', tool_input: { file_path: 'src/models/User.ts' } });
  assertTrue(result.proceed === true, 'Should proceed');
  assertEqual(result.hookSpecificOutput, undefined, 'Should not inject context');
});

test('hook skips when no tool_name', async () => {
  const result = await hook({});
  assertTrue(result.proceed === true, 'Should proceed');
});

test('hook skips when no file_path', async () => {
  const result = await hook({ tool_name: 'Write', tool_input: {} });
  assertTrue(result.proceed === true, 'Should proceed');
});

test('hook skips non-data-layer files', async () => {
  const result = await hook({
    tool_name: 'Write',
    tool_input: { file_path: '/tmp/test/src/components/Button.tsx' },
  });
  assertTrue(result.proceed === true, 'Should proceed');
  assertEqual(result.hookSpecificOutput, undefined, 'Should not inject context for non-data-layer files');
});

// ============================================================================
// Summary
// ============================================================================

console.log(`\n${'='.repeat(60)}`);
console.log(`Tests: ${passed + failed} total, ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}`);
console.log(`${'='.repeat(60)}\n`);

process.exit(failed > 0 ? 1 : 0);
