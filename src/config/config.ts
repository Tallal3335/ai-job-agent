import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000'),

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/job_agent',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'job_agent',
  },

  // Job Boards
  jobBoards: {
    bayt: {
      email: process.env.BAYT_EMAIL || '',
      password: process.env.BAYT_PASSWORD || '',
      baseUrl: 'https://www.bayt.com',
      enabled: process.env.BAYT_ENABLED !== 'false',
    },
    naukri: {
      email: process.env.NAUKRI_EMAIL || '',
      password: process.env.NAUKRI_PASSWORD || '',
      baseUrl: 'https://www.naukri.com',
      enabled: process.env.NAUKRI_ENABLED !== 'false',
    },
    gulftalent: {
      email: process.env.GULFTALENT_EMAIL || '',
      password: process.env.GULFTALENT_PASSWORD || '',
      baseUrl: 'https://www.gulftalent.com',
      enabled: process.env.GULFTALENT_ENABLED !== 'false',
    },
    upwork: {
      apiKey: process.env.UPWORK_API_KEY || '',
      apiSecret: process.env.UPWORK_API_SECRET || '',
      baseUrl: 'https://api.upwork.com',
      enabled: process.env.UPWORK_ENABLED !== 'false',
    },
    linkedin: {
      email: process.env.LINKEDIN_EMAIL || '',
      password: process.env.LINKEDIN_PASSWORD || '',
      baseUrl: 'https://www.linkedin.com',
      enabled: process.env.LINKEDIN_ENABLED !== 'false',
    },
  },

  // Application Settings
  application: {
    autoApply: process.env.AUTO_APPLY === 'true',
    minSalary: parseInt(process.env.MIN_SALARY || '0'),
    maxSalary: parseInt(process.env.MAX_SALARY || '999999'),
    locations: (process.env.LOCATIONS || '').split(',').filter(l => l.trim()),
    keywords: (process.env.KEYWORDS || '').split(',').filter(k => k.trim()),
    excludedKeywords: (process.env.EXCLUDED_KEYWORDS || '').split(',').filter(k => k.trim()),
  },

  // Email Notifications
  email: {
    enabled: process.env.EMAIL_NOTIFICATIONS === 'true',
    notificationEmail: process.env.NOTIFICATION_EMAIL || '',
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER || '',
    smtpPassword: process.env.SMTP_PASSWORD || '',
  },

  // CV Settings
  cv: {
    filePath: process.env.CV_FILE_PATH || './cv.pdf',
  },

  // Scheduling
  scheduler: {
    searchIntervalHours: parseInt(process.env.SEARCH_INTERVAL_HOURS || '6'),
    applyIntervalMinutes: parseInt(process.env.APPLY_INTERVAL_MINUTES || '30'),
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Puppeteer
  puppeteer: {
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    timeout: parseInt(process.env.PUPPETEER_TIMEOUT || '30000'),
  },
};
