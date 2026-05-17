import { BaseAgent } from './baseAgent';
import { JobListing, JobFilter, AgentApplyResult } from '../types/index';
import { config } from '../config/config';

export class BaytAgent extends BaseAgent {
  source = 'bayt' as const;
  private baseUrl = 'https://www.bayt.com';
  private email = config.jobBoards.bayt.email;
  private password = config.jobBoards.bayt.password;

  /**
   * Login to Bayt.com
   */
  async login(): Promise<void> {
    try {
      console.log('🔐 Logging into Bayt.com...');
      await this.initializeBrowser();
      await this.goto(`${this.baseUrl}/en/login`);
      await this.randomDelay(1000, 2000);

      // Fill email
      await this.type('input[name="email"]', this.email);
      await this.randomDelay(500, 1000);

      // Fill password
      await this.type('input[name="password"]', this.password);
      await this.randomDelay(500, 1000);

      // Click login button
      await this.click('button[type="submit"]');
      await this.randomDelay(3000, 5000);

      // Check if login successful
      const isLoggedIn = await this.isLoggedIn();
      if (isLoggedIn) {
        console.log('✅ Successfully logged into Bayt.com');
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('❌ Bayt login failed:', error);
      throw error;
    }
  }

  /**
   * Logout from Bayt.com
   */
  async logout(): Promise<void> {
    try {
      console.log('🚪 Logging out from Bayt.com...');
      if (await this.isLoggedIn()) {
        await this.click('button[data-test-id="profile-menu"]');
        await this.randomDelay(500, 1000);
        await this.click('a[href*="logout"]');
        await this.randomDelay(2000, 3000);
      }
      await this.closeBrowser();
      console.log('✅ Successfully logged out from Bayt.com');
    } catch (error) {
      console.error('❌ Bayt logout failed:', error);
      await this.closeBrowser();
    }
  }

  /**
   * Check if logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      const content = await this.page?.content();
      return !(content?.includes('Login') && content?.includes('register'));
    } catch (error) {
      console.error('❌ Failed to check login status:', error);
      return false;
    }
  }

  /**
   * Search for jobs on Bayt
   */
  async search(filters: JobFilter): Promise<JobListing[]> {
    try {
      console.log('🔍 Searching for jobs on Bayt.com...');
      const jobs: JobListing[] = [];

      // Build search URL
      const params = new URLSearchParams();
      params.append('keywords', filters.keywords.join(' '));
      if (filters.locations.length > 0) {
        params.append('country', filters.locations[0]);
      }

      const searchUrl = `${this.baseUrl}/en/jobs/search?${params.toString()}`;
      await this.goto(searchUrl);
      await this.randomDelay(2000, 3000);

      // Extract jobs from current page
      const jobElements = await this.getTexts('a[data-qa="jobTitle"]');
      
      for (let i = 0; i < jobElements.length; i++) {
        try {
          const jobTitle = jobElements[i];
          const jobCard = await this.page?.$(`a[data-qa="jobTitle"]:nth-of-type(${i + 1})`);
          const jobUrl = await jobCard?.evaluate((el: any) => el.href);

          if (!jobUrl || await this.alreadyApplied(jobUrl)) continue;

          // Get job details
          await jobCard?.click();
          await this.randomDelay(1000, 2000);

          const company = await this.getText('span[data-qa="jobCompanyName"]').catch(() => '');
          const location = await this.getText('span[data-qa="jobLocation"]').catch(() => '');
          const salary = await this.getText('span[data-qa="jobSalary"]').catch(() => '');
          const description = await this.getText('div[data-qa="jobDescription"]').catch(() => '');
          const jobLevel = await this.getText('span[data-qa="jobLevel"]').catch(() => '');

          const job: JobListing = {
            title: jobTitle,
            company,
            location,
            salary,
            description,
            url: jobUrl,
            source: 'bayt',
            posted_date: new Date(),
            job_level: jobLevel as any,
            job_type: 'full-time',
          };

          // Filter job
          const filtered = this.filterJobs([job], filters);
          if (filtered.length > 0) {
            const jobId = await this.saveJob(job);
            if (jobId) {
              jobs.push({ ...job, id: jobId });
            }
          }

          await this.randomDelay(500, 1000);
        } catch (error) {
          console.error('⚠️ Failed to process job:', error);
          continue;
        }
      }

      console.log(`✅ Found ${jobs.length} matching jobs on Bayt.com`);
      return jobs;
    } catch (error) {
      console.error('❌ Bayt search failed:', error);
      throw error;
    }
  }

  /**
   * Apply to a job on Bayt
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
          source: 'bayt',
        };
      }

      await this.goto(job.url);
      await this.randomDelay(1000, 2000);

      // Click apply button
      const applyButton = await this.page?.$('button[data-qa="applyButton"]');
      if (!applyButton) {
        throw new Error('Apply button not found');
      }

      await this.click('button[data-qa="applyButton"]');
      await this.randomDelay(2000, 3000);

      // Fill application form if needed
      const hasForm = await this.page?.$('form[data-qa="applicationForm"]');
      if (hasForm) {
        // Fill cover letter field if present
        const coverLetterField = await this.page?.$('textarea[name="coverLetter"]');
        if (coverLetterField) {
          await this.type('textarea[name="coverLetter"]', 'I am interested in this position.');
          await this.randomDelay(500, 1000);
        }

        // Submit form
        await this.click('button[type="submit"]');
        await this.randomDelay(2000, 3000);
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
        source: 'bayt',
      };
    } catch (error) {
      console.error('❌ Bayt apply failed:', error);
      return {
        success: false,
        jobId: job.id || 0,
        message: `Application failed: ${error}`,
        timestamp: new Date(),
        source: 'bayt',
      };
    }
  }
}
