import { BaseAgent } from './baseAgent';
import { JobListing, JobFilter, AgentApplyResult } from '../types/index';
import { config } from '../config/config';

export class GulftalentAgent extends BaseAgent {
  source = 'gulftalent' as const;
  private baseUrl = 'https://www.gulftalent.com';
  private email = config.jobBoards.gulftalent.email;
  private password = config.jobBoards.gulftalent.password;

  /**
   * Login to GulfTalent.com
   */
  async login(): Promise<void> {
    try {
      console.log('🔐 Logging into GulfTalent.com...');
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
        console.log('✅ Successfully logged into GulfTalent.com');
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('❌ GulfTalent login failed:', error);
      throw error;
    }
  }

  /**
   * Logout from GulfTalent.com
   */
  async logout(): Promise<void> {
    try {
      console.log('🚪 Logging out from GulfTalent.com...');
      if (await this.isLoggedIn()) {
        await this.click('a[href*="logout"]');
        await this.randomDelay(2000, 3000);
      }
      await this.closeBrowser();
      console.log('✅ Successfully logged out from GulfTalent.com');
    } catch (error) {
      console.error('❌ GulfTalent logout failed:', error);
      await this.closeBrowser();
    }
  }

  /**
   * Check if logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      const content = await this.page?.content();
      return !(content?.includes('Login') || content?.includes('Sign In'));
    } catch (error) {
      console.error('❌ Failed to check login status:', error);
      return false;
    }
  }

  /**
   * Search for jobs on GulfTalent
   */
  async search(filters: JobFilter): Promise<JobListing[]> {
    try {
      console.log('🔍 Searching for jobs on GulfTalent.com...');
      const jobs: JobListing[] = [];

      // Build search URL
      const keywords = filters.keywords.join('+');
      const locations = filters.locations.join('+');
      const searchUrl = `${this.baseUrl}/en/jobs?keywords=${encodeURIComponent(keywords)}&country=${encodeURIComponent(locations)}`;
      
      await this.goto(searchUrl);
      await this.randomDelay(2000, 3000);

      // Extract jobs from current page
      const jobElements = await this.page?.$$('div.job-listing-item');
      
      if (!jobElements || jobElements.length === 0) {
        console.log('⚠️ No jobs found');
        return jobs;
      }

      for (let i = 0; i < jobElements.length; i++) {
        try {
          const jobElement = jobElements[i];
          
          const jobTitle = await jobElement.$eval(
            'h2.job-title',
            (el) => el.textContent || ''
          );

          const jobLink = await jobElement.$eval(
            'a.job-link',
            (el: any) => el.href
          );

          if (!jobLink || await this.alreadyApplied(jobLink)) continue;

          const company = await jobElement.$eval(
            'span.company-name',
            (el) => el.textContent || ''
          ).catch(() => '');

          const location = await jobElement.$eval(
            'span.job-location',
            (el) => el.textContent || ''
          ).catch(() => '');

          const salary = await jobElement.$eval(
            'span.salary',
            (el) => el.textContent || ''
          ).catch(() => '');

          const jobType = await jobElement.$eval(
            'span.job-type',
            (el) => el.textContent || ''
          ).catch(() => 'full-time');

          const description = await jobElement.$eval(
            'p.job-summary',
            (el) => el.textContent || ''
          ).catch(() => '');

          const postedDate = await jobElement.$eval(
            'span.posted-date',
            (el) => el.textContent || ''
          ).catch(() => new Date().toISOString());

          const job: JobListing = {
            title: jobTitle.trim(),
            company: company.trim(),
            location: location.trim(),
            salary: salary.trim(),
            description: description.trim(),
            url: jobLink,
            source: 'gulftalent',
            posted_date: new Date(postedDate),
            job_type: this.normalizeJobType(jobType),
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

      console.log(`✅ Found ${jobs.length} matching jobs on GulfTalent.com`);
      return jobs;
    } catch (error) {
      console.error('❌ GulfTalent search failed:', error);
      throw error;
    }
  }

  /**
   * Apply to a job on GulfTalent
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
          source: 'gulftalent',
        };
      }

      await this.goto(job.url);
      await this.randomDelay(1000, 2000);

      // Click apply button
      const applyButton = await this.page?.$('button.apply-button');
      if (!applyButton) {
        throw new Error('Apply button not found');
      }

      await this.click('button.apply-button');
      await this.randomDelay(2000, 3000);

      // Fill application form
      const formExists = await this.page?.$('form.application-form');
      if (formExists) {
        // Fill email if required
        const emailField = await this.page?.$('input[name="email"]');
        if (emailField) {
          await this.type('input[name="email"]', config.jobBoards.gulftalent.email);
          await this.randomDelay(500, 1000);
        }

        // Fill phone if required
        const phoneField = await this.page?.$('input[name="phone"]');
        if (phoneField) {
          await this.type('input[name="phone"]', '+1234567890');
          await this.randomDelay(500, 1000);
        }

        // Fill cover letter if required
        const coverLetterField = await this.page?.$('textarea[name="coverLetter"]');
        if (coverLetterField) {
          await this.type('textarea[name="coverLetter"]', 'I am interested in this position and believe my skills match the requirements.');
          await this.randomDelay(500, 1000);
        }

        // Submit form
        const submitBtn = await this.page?.$('button[type="submit"]');
        if (submitBtn) {
          await this.click('button[type="submit"]');
          await this.randomDelay(2000, 3000);
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
        source: 'gulftalent',
      };
    } catch (error) {
      console.error('❌ GulfTalent apply failed:', error);
      return {
        success: false,
        jobId: job.id || 0,
        message: `Application failed: ${error}`,
        timestamp: new Date(),
        source: 'gulftalent',
      };
    }
  }

  /**
   * Normalize job type
   */
  private normalizeJobType(jobType: string): string {
    const normalized = jobType.toLowerCase();
    if (normalized.includes('full')) return 'full-time';
    if (normalized.includes('part')) return 'part-time';
    if (normalized.includes('contract')) return 'contract';
    if (normalized.includes('freelance')) return 'freelance';
    return 'full-time';
  }
}
