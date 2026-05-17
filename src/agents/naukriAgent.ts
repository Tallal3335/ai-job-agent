import { BaseAgent } from './baseAgent';
import { JobListing, JobFilter, AgentApplyResult } from '../types/index';
import { config } from '../config/config';

export class NaukriAgent extends BaseAgent {
  source = 'naukri' as const;
  private baseUrl = 'https://www.naukri.com';
  private email = config.jobBoards.naukri.email;
  private password = config.jobBoards.naukri.password;

  /**
   * Login to Naukri.com
   */
  async login(): Promise<void> {
    try {
      console.log('🔐 Logging into Naukri.com...');
      await this.initializeBrowser();
      await this.goto(`${this.baseUrl}/naukri/user/login`);
      await this.randomDelay(1000, 2000);

      // Fill email
      await this.type('input[placeholder="Enter your email"]', this.email);
      await this.randomDelay(500, 1000);

      // Fill password
      await this.type('input[placeholder="Enter your password"]', this.password);
      await this.randomDelay(500, 1000);

      // Click login button
      await this.click('button[type="submit"]');
      await this.randomDelay(3000, 5000);

      // Check if login successful
      const isLoggedIn = await this.isLoggedIn();
      if (isLoggedIn) {
        console.log('✅ Successfully logged into Naukri.com');
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('❌ Naukri login failed:', error);
      throw error;
    }
  }

  /**
   * Logout from Naukri.com
   */
  async logout(): Promise<void> {
    try {
      console.log('🚪 Logging out from Naukri.com...');
      if (await this.isLoggedIn()) {
        await this.click('a[data-testid="nxp-logout"]');
        await this.randomDelay(2000, 3000);
      }
      await this.closeBrowser();
      console.log('✅ Successfully logged out from Naukri.com');
    } catch (error) {
      console.error('❌ Naukri logout failed:', error);
      await this.closeBrowser();
    }
  }

  /**
   * Check if logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      const content = await this.page?.content();
      return !(content?.includes('Login') && content?.includes('Sign up'));
    } catch (error) {
      console.error('❌ Failed to check login status:', error);
      return false;
    }
  }

  /**
   * Search for jobs on Naukri
   */
  async search(filters: JobFilter): Promise<JobListing[]> {
    try {
      console.log('🔍 Searching for jobs on Naukri.com...');
      const jobs: JobListing[] = [];

      // Build search URL
      const keywords = filters.keywords.join('-');
      const searchUrl = `${this.baseUrl}/jobs?k=${encodeURIComponent(keywords)}`;
      await this.goto(searchUrl);
      await this.randomDelay(2000, 3000);

      // Extract jobs from current page
      const jobElements = await this.page?.$$('article.jobCard');
      
      if (!jobElements) {
        console.log('⚠️ No jobs found');
        return jobs;
      }

      for (let i = 0; i < jobElements.length; i++) {
        try {
          const jobElement = jobElements[i];
          
          const jobTitle = await jobElement.$eval(
            'a.jobTitle',
            (el) => el.textContent || ''
          );
          const jobUrl = await jobElement.$eval(
            'a.jobTitle',
            (el: any) => el.href
          );

          if (!jobUrl || await this.alreadyApplied(jobUrl)) continue;

          const company = await jobElement.$eval(
            'a.companyName',
            (el) => el.textContent || ''
          ).catch(() => '');

          const location = await jobElement.$eval(
            'span.jobLocation',
            (el) => el.textContent || ''
          ).catch(() => '');

          const salary = await jobElement.$eval(
            'span.salary',
            (el) => el.textContent || ''
          ).catch(() => '');

          const experience = await jobElement.$eval(
            'span.experience',
            (el) => el.textContent || ''
          ).catch(() => '');

          const description = await jobElement.$eval(
            'span.jobSnippet',
            (el) => el.textContent || ''
          ).catch(() => '');

          const job: JobListing = {
            title: jobTitle.trim(),
            company: company.trim(),
            location: location.trim(),
            salary: salary.trim(),
            description: description.trim(),
            url: jobUrl,
            source: 'naukri',
            posted_date: new Date(),
            job_type: 'full-time',
            experience_years: this.extractExperience(experience),
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

      console.log(`✅ Found ${jobs.length} matching jobs on Naukri.com`);
      return jobs;
    } catch (error) {
      console.error('❌ Naukri search failed:', error);
      throw error;
    }
  }

  /**
   * Apply to a job on Naukri
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
          source: 'naukri',
        };
      }

      await this.goto(job.url);
      await this.randomDelay(1000, 2000);

      // Check for apply button
      const applyButton = await this.page?.$(
        'button:has-text("Apply")'
      ).catch(() => null);

      if (!applyButton) {
        // Try quick apply
        const quickApplyBtn = await this.page?.$(
          'button[data-testid="quickApply"]'
        );
        if (quickApplyBtn) {
          await this.click('button[data-testid="quickApply"]');
          await this.randomDelay(2000, 3000);
        } else {
          throw new Error('Apply button not found');
        }
      } else {
        await this.click('button:has-text("Apply")');
        await this.randomDelay(2000, 3000);
      }

      // Handle application modal if present
      const modal = await this.page?.$('div[role="dialog"]');
      if (modal) {
        // Fill any required fields in modal
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
        source: 'naukri',
      };
    } catch (error) {
      console.error('❌ Naukri apply failed:', error);
      return {
        success: false,
        jobId: job.id || 0,
        message: `Application failed: ${error}`,
        timestamp: new Date(),
        source: 'naukri',
      };
    }
  }

  /**
   * Extract experience years from text
   */
  private extractExperience(experienceText: string): number | undefined {
    try {
      const match = experienceText.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : undefined;
    } catch (error) {
      return undefined;
    }
  }
}
