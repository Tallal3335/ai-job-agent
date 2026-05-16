import { query } from './db';

const schema = `
-- Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  salary VARCHAR(100),
  description TEXT,
  url TEXT UNIQUE NOT NULL,
  source VARCHAR(50) NOT NULL,
  posted_date TIMESTAMP,
  job_level VARCHAR(50),
  job_type VARCHAR(50),
  skills TEXT[],
  experience_years INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Applications Table
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  user_id INTEGER,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  cover_letter TEXT,
  source VARCHAR(50),
  application_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CVs Table
CREATE TABLE IF NOT EXISTS cvs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  file_path VARCHAR(500),
  file_name VARCHAR(255),
  skills TEXT[],
  experience TEXT,
  education TEXT,
  summary TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job Filters Table
CREATE TABLE IF NOT EXISTS job_filters (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  name VARCHAR(255),
  keywords TEXT[],
  locations TEXT[],
  min_salary INTEGER,
  max_salary INTEGER,
  job_level VARCHAR(50),
  job_type VARCHAR(50),
  experience_years INTEGER,
  excluded_keywords TEXT[],
  auto_apply BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Search History Table
CREATE TABLE IF NOT EXISTS search_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  keywords TEXT[],
  locations TEXT[],
  source VARCHAR(50),
  results_count INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job Board Credentials Table
CREATE TABLE IF NOT EXISTS job_board_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  source VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  password VARCHAR(255),
  api_key VARCHAR(500),
  api_secret VARCHAR(500),
  access_token VARCHAR(1000),
  refresh_token VARCHAR(1000),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, source)
);

-- Application Status History Table
CREATE TABLE IF NOT EXISTS application_status_history (
  id SERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  status VARCHAR(50),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- Job Alerts Table
CREATE TABLE IF NOT EXISTS job_alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  alert_type VARCHAR(50),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_url ON jobs(url);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_cvs_user ON cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_cvs_active ON cvs(is_active);
CREATE INDEX IF NOT EXISTS idx_filters_user ON job_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_filters_active ON job_filters(is_active);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_user ON job_board_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_source ON job_board_credentials(source);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON job_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON job_alerts(is_read);
`;

export async function setupDatabase() {
  try {
    console.log('🔄 Setting up database schema...');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      await query(statement);
      console.log('✅ Executed:', statement.substring(0, 50) + '...');
    }

    console.log('✅ Database setup completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
