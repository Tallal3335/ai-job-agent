import { BaseAgent } from './baseAgent';
import { JobListing, JobFilter, AgentApplyResult } from '../types/index';
import { config } from '../config/config';

export class LinkedinAgent extends BaseAgent {
  source = 'linkedin' as const;
  private baseUrl = 'https://www.linkedin.com';
  private email = config.jobBoards.linkedin.email;
  private password = config.jobBoards.linkedin.password;

  /**
   * Login to LinkedIn
   */
  async login(): Promise<void> {
    try {
      console.log('🔐 Logging into LinkedIn...');
      await this.initializeBrowser();
      await this.goto(`${this.baseUrl}/login`);
      await this.randomDelay(1000, 2000);

      // Fill email
      await this.type('input[name="session_key"]', this.email);
      await this.randomDelay(500, 1000);

      // Fill password
      await this.type('input[name="session_password"]', this.password);
      await this.randomDelay(500, 1000);

      // Click login button
      await this.click('button[type="submit"]');
      await this.randomDelay(3000, 5000);

      // Check if login successful
      const isLoggedIn = await this.isLoggedIn();
      if (isLoggedIn) {
        console.log('✅ Successfully logged into LinkedIn');
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('❌ LinkedIn login failed:', error);
      throw error;
    }
  }

  /**
   * Logout from LinkedIn
   */
  async logout(): Promise<void> {
    try {
      console.log('🚪 Logging out from LinkedIn...');
      if (await this.isLoggedIn()) {
        // Click profile menu
        await this.click('button[aria-label="Me"]');
        await this.randomDelay(500, 1000);
        
        // Click sign out
        await this.click('a[data-test-id="global-nav-me-sign-out-btn"]');
        await this.randomDelay(2000, 3000);
      }
      await this.closeBrowser();
      console.log('✅ Successfully logged out from LinkedIn');
    } catch (error) {
      console.error('❌ LinkedIn logout failed:', error);
      await this.closeBrowser();
    }
  }

  /**
   * Check if logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      const content = await this.page?.content();
      return !(content?.includes('Log in') && !content?.includes('/feed'));
    } catch (error) {
      console.error('❌ Failed to check login status:', error);
      return false;
    }
  }

  /**
   * Search for jobs on LinkedIn
   */
  async search(filters: JobFilter): Promise<JobListing[]> {
    try {
      console.log('🔍 Searching for jobs on LinkedIn...');
      const jobs: JobListing[] = [];

      // Build search URL
      const keywords = filters.keywords.join(' ');
      const location = filters.locations.length > 0 ? filters.locations[0] : '';
      const searchUrl = `${this.baseUrl}/jobs/search/?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}`;
      
      await this.goto(searchUrl);
      await this.randomDelay(2000, 3000);

      // Scroll to load more jobs
      await this.page?.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await this.randomDelay(1000, 2000);

      // Extract jobs from current page
      const jobElements = await this.page?.$$('div[data-job-id]');
      
      if (!jobElements || jobElements.length === 0) {
        console.log('⚠️ No jobs found');
        return jobs;
      }

      for (let i = 0; i < Math.min(jobElements.length, 20); i++) {
        try {
          const jobElement = jobElements[i];
          
          // Get job ID
          const jobId = await jobElement.evaluate((el: any) => el.getAttribute('data-job-id'));
          
          // Click job to expand details
          await jobElement.click();
          await this.randomDelay(500, 1000);

          // Extract job details
          const jobTitle = await this.page?.$eval(
            'h2[data-test-id="job-title"]',
            (el) => el.textContent || ''
          ).catch(() => '');

          const company = await this.page?.$eval(
            'a[data-test-id="job-card-company-name"]',
            (el) => el.textContent || ''
          ).catch(() => '');

          const location = await this.page?.$eval(
            'span[data-test-id="job-card-location"]',
            (el) => el.textContent || ''
          ).catch(() => '');

          const description = await this.page?.$eval(
            'div[class*="description"]',
            (el) => el.textContent || ''
          ).catch(() => '');

          const jobUrl = `${this.baseUrl}/jobs/view/${jobId}`;

          if (!jobUrl || await this.alreadyApplied(jobUrl)) continue;

          const job: JobListing = {
            title: jobTitle.trim(),
            company: company.trim(),
            location: location.trim(),
            description: description.trim(),
            url: jobUrl,
            source: 'linkedin',
            posted_date: new Date(),
            job_type: 'full-time',
          };

          // Filter job
          const filtered = this.filterJobs([job], filters);
          if (filtered.length > 0) {
            const savedJobId = await this.saveJob(job);
            if (savedJobId) {
              jobs.push({ ...job, id: savedJobId });
            }
          }

          await this.randomDelay(500, 1000);
        } catch (error) {
          console.error('⚠️ Failed to process job:', error);
          continue;
        }
      }

      console.log(`✅ Found ${jobs.length} matching jobs on LinkedIn`);
      return jobs;
    } catch (error) {
      console.error('❌ LinkedIn search failed:', error);
      throw error;
    }
  }

  /**
   * Apply to a job on LinkedIn
   */
  async apply(job: JobListing): Promise<AgentApplyResult> {
    try {
      console.log(`📝 Applying to job: ${job.title} at ${job.company}`);

      // Check if already applied
      if (await this.alreadyApplied(job.url)) {
        console.log('⚠️ Already applied to this job');
        return {
          success: false,
          jobId: job.id || 0,
          message: 'Already applied',
          timestamp: new Date(),
          source: 'linkedin',
        };
      }

      await this.goto(job.url);
      await this.randomDelay(1000, 2000);

      // Find and click easy apply button
      const easyApplyBtn = await this.page?.$('button[aria-label*="Easy Apply"]');
      if (!easyApplyBtn) {
        throw new Error('Easy Apply button not found');
      }

      await this.click('button[aria-label*="Easy Apply"]');
      await this.randomDelay(2000, 3000);

      // Handle application modal
      let formCompleted = false;
      let attemptCount = 0;
      const maxAttempts = 5;

      while (!formCompleted && attemptCount < maxAttempts) {
        try {
          // Look for next button or submit button
          const nextBtn = await this.page?.$('button:has-text("Next")');
          const submitBtn = await this.page?.$('button:has-text("Review your application")');
          const confirmBtn = await this.page?.$('button[aria-label="Submit application"]');

          if (nextBtn) {
            await this.click('button:has-text("Next")');
            await this.randomDelay(1000, 2000);
          } else if (submitBtn) {
            await this.click('button:has-text("Review your application")');
            await this.randomDelay(1000, 2000);
          } else if (confirmBtn) {
            await this.click('button[aria-label="Submit application"]');
            await this.randomDelay(2000, 3000);
            formCompleted = true;
          } else {
            // Try to submit with Enter key
            await this.page?.keyboard.press('Enter');
            await this.randomDelay(1000, 2000);
            formCompleted = true;
          }

          attemptCount++;
        } catch (error) {
          console.error('⚠️ Error navigating form:', error);
          attemptCount++;
        }
      }

      // Save application
      const jobId = job.id || (await this.saveJob(job)) || 0;
      if (jobId) {
        await this.saveApplication(jobId);
      }

      console.log('✅ Successfully applied to job');
      return {
        success: true,
        jobId,
        applicationId: jobId,
        message: 'Application submitted',
        timestamp: new Date(),
        source: 'linkedin',
      };
    } catch (error) {
      console.error('❌ LinkedIn apply failed:', error);
      return {
        success: false,
        jobId: job.id || 0,
        message: `Application failed: ${error}`,
        timestamp: new Date(),
        source: 'linkedin',
      };
    }
  }
}
