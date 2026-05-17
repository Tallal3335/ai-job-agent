import puppeteer, { Browser, Page } from 'puppeteer';
import { config } from '../config/config';
import { JobListing, JobFilter, AgentApplyResult, IJobAgent, JobSource } from '../types/index';
import { query } from '../database/db';

export abstract class BaseAgent implements IJobAgent {
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  abstract source: JobSource;

  constructor() {
    console.log(`🤖 Initializing ${this.source} agent...`);
  }

  /**
   * Initialize browser and page
   */
  async initializeBrowser(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: config.puppeteer.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.page = await this.browser.newPage();
      this.page.setDefaultTimeout(config.puppeteer.timeout);
      this.page.setDefaultNavigationTimeout(config.puppeteer.timeout);
      console.log(`✅ Browser initialized for ${this.source}`);
    } catch (error) {
      console.error(`❌ Failed to initialize browser for ${this.source}:`, error);
      throw error;
    }
  }

  /**
   * Close browser
   */
  async closeBrowser(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        console.log(`✅ Browser closed for ${this.source}`);
      }
    } catch (error) {
      console.error(`❌ Failed to close browser for ${this.source}:`, error);
    }
  }

  /**
   * Navigate to URL
   */
  async goto(url: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    try {
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      console.log(`📄 Navigated to ${url}`);
    } catch (error) {
      console.error(`❌ Failed to navigate to ${url}:`, error);
      throw error;
    }
  }

  /**
   * Wait for element
   */
  async waitForElement(selector: string, timeout: number = config.puppeteer.timeout): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    try {
      await this.page.waitForSelector(selector, { timeout });
    } catch (error) {
      console.error(`❌ Element not found: ${selector}`);
      throw error;
    }
  }

  /**
   * Click element
   */
  async click(selector: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    try {
      await this.page.click(selector);
      console.log(`✅ Clicked: ${selector}`);
    } catch (error) {
      console.error(`❌ Failed to click ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Type text
   */
  async type(selector: string, text: string, delay: number = 50): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    try {
      await this.page.type(selector, text, { delay });
      console.log(`✅ Typed in ${selector}`);
    } catch (error) {
      console.error(`❌ Failed to type in ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Get text content
   */
  async getText(selector: string): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');
    try {
      const text = await this.page.$eval(selector, (el) => el.textContent || '');
      return text.trim();
    } catch (error) {
      console.error(`❌ Failed to get text from ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple elements text
   */
  async getTexts(selector: string): Promise<string[]> {
    if (!this.page) throw new Error('Page not initialized');
    try {
      const texts = await this.page.$$eval(selector, (els) => 
        els.map((el) => (el.textContent || '').trim()).filter((t) => t.length > 0)
      );
      return texts;
    } catch (error) {
      console.error(`❌ Failed to get texts from ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Get attribute value
   */
  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    if (!this.page) throw new Error('Page not initialized');
    try {
      const value = await this.page.$eval(selector, (el, attr) => 
        el.getAttribute(attr), attribute
      );
      return value;
    } catch (error) {
      console.error(`❌ Failed to get attribute ${attribute} from ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Wait and retry
   */
  async waitAndRetry(
    fn: () => Promise<any>,
    retries: number = 3,
    delay: number = 2000
  ): Promise<any> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.log(`⏳ Retry ${i + 1}/${retries} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  /**
   * Random delay (for avoiding detection)
   */
  async randomDelay(minMs: number = 1000, maxMs: number = 3000): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Save job to database
   */
  async saveJob(job: JobListing): Promise<number | null> {
    try {
      const result = await query(
        `INSERT INTO jobs 
        (title, company, location, salary, description, url, source, posted_date, job_level, job_type, skills) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (url) DO NOTHING
        RETURNING id`,
        [
          job.title,
          job.company,
          job.location,
          job.salary,
          job.description,
          job.url,
          job.source,
          job.posted_date,
          job.job_level,
          job.job_type,
          job.skills ? JSON.stringify(job.skills) : null,
        ]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ Saved job: ${job.title} at ${job.company}`);
        return result.rows[0].id;
      }
      return null;
    } catch (error) {
      console.error(`❌ Failed to save job:`, error);
      throw error;
    }
  }

  /**
   * Save application
   */
  async saveApplication(jobId: number, coverLetter?: string): Promise<number> {
    try {
      const result = await query(
        `INSERT INTO applications 
        (job_id, status, cover_letter, source) 
        VALUES ($1, $2, $3, $4)
        RETURNING id`,
        [jobId, 'applied', coverLetter, this.source]
      );
      console.log(`✅ Application saved for job ID: ${jobId}`);
      return result.rows[0].id;
    } catch (error) {
      console.error(`❌ Failed to save application:`, error);
      throw error;
    }
  }

  /**
   * Check if already applied
   */
  async alreadyApplied(jobUrl: string): Promise<boolean> {
    try {
      const result = await query(
        `SELECT COUNT(*) as count FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE j.url = $1 AND a.source = $2`,
        [jobUrl, this.source]
      );
      return result.rows[0].count > 0;
    } catch (error) {
      console.error(`❌ Failed to check if already applied:`, error);
      throw error;
    }
  }

  /**
   * Extract salary range
   */
  protected extractSalary(salaryText: string): { min: number; max: number } | null {
    try {
      const numbers = salaryText.match(/\d+/g);
      if (!numbers || numbers.length === 0) return null;
      
      const salaries = numbers.map((n) => parseInt(n, 10));
      return {
        min: Math.min(...salaries),
        max: Math.max(...salaries),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Filter jobs based on criteria
   */
  protected filterJobs(jobs: JobListing[], filter: JobFilter): JobListing[] {
    return jobs.filter((job) => {
      // Check keywords
      const titleLower = job.title.toLowerCase();
      const descLower = job.description.toLowerCase();
      const hasKeyword = filter.keywords.some(
        (kw) => titleLower.includes(kw.toLowerCase()) || descLower.includes(kw.toLowerCase())
      );

      if (!hasKeyword) return false;

      // Check excluded keywords
      if (filter.excluded_keywords) {
        const hasExcluded = filter.excluded_keywords.some(
          (kw) => titleLower.includes(kw.toLowerCase()) || descLower.includes(kw.toLowerCase())
        );
        if (hasExcluded) return false;
      }

      // Check location
      if (filter.locations && filter.locations.length > 0) {
        const hasLocation = filter.locations.some(
          (loc) => job.location.toLowerCase().includes(loc.toLowerCase())
        );
        if (!hasLocation) return false;
      }

      // Check salary
      if (filter.min_salary || filter.max_salary) {
        const salary = this.extractSalary(job.salary || '');
        if (salary) {
          if (filter.min_salary && salary.min < filter.min_salary) return false;
          if (filter.max_salary && salary.max > filter.max_salary) return false;
        }
      }

      return true;
    });
  }

  /**
   * Abstract methods to be implemented by subclasses
   */
  abstract search(filters: JobFilter): Promise<JobListing[]>;
  abstract apply(job: JobListing): Promise<AgentApplyResult>;
  abstract login(): Promise<void>;
  abstract logout(): Promise<void>;
  abstract isLoggedIn(): Promise<boolean>;
}
