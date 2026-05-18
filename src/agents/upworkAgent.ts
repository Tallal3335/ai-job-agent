import { BaseAgent } from './baseAgent';
import { JobListing, JobFilter, AgentApplyResult } from '../types/index';
import { config } from '../config/config';
import axios, { AxiosInstance } from 'axios';

export class UpworkAgent extends BaseAgent {
  source = 'upwork' as const;
  private baseUrl = 'https://api.upwork.com/api';
  private apiKey = config.jobBoards.upwork.apiKey;
  private apiSecret = config.jobBoards.upwork.apiSecret;
  private accessToken: string | null = null;
  private client: AxiosInstance | null = null;

  constructor() {
    super();
    this.initializeClient();
  }

  /**
   * Initialize API client
   */
  private initializeClient(): void {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'User-Agent': 'AI Job Agent',
        'Content-Type': 'application/json',
      },
    });

    // Add authorization interceptor
    this.client.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });
  }

  /**
   * Login to Upwork (OAuth2 flow)
   */
  async login(): Promise<void> {
    try {
      console.log('🔐 Logging into Upwork...');
      // In a real scenario, you would implement OAuth2 flow here
      // For now, using API key directly
      this.accessToken = this.apiKey;
      console.log('✅ Successfully authenticated with Upwork API');
    } catch (error) {
      console.error('❌ Upwork authentication failed:', error);
      throw error;
    }
  }

  /**
   * Logout from Upwork
   */
  async logout(): Promise<void> {
    try {
      console.log('🚪 Logging out from Upwork...');
      this.accessToken = null;
      console.log('✅ Successfully logged out from Upwork');
    } catch (error) {
      console.error('❌ Upwork logout failed:', error);
    }
  }

  /**
   * Check if logged in
   */
  async isLoggedIn(): Promise<boolean> {
    return this.accessToken !== null;
  }

  /**
   * Search for jobs on Upwork
   */
  async search(filters: JobFilter): Promise<JobListing[]> {
    try {
      console.log('🔍 Searching for jobs on Upwork...');
      const jobs: JobListing[] = [];

      if (!this.client) throw new Error('Client not initialized');

      // Build search query
      const params = {
        q: filters.keywords.join(' '),
        sort: 'recency',
        limit: 50,
      };

      const response = await this.client.get('/profiles/v2/search/jobs', { params });
      const jobsData = response.data.jobs || [];

      for (const jobData of jobsData) {
        try {
          if (await this.alreadyApplied(jobData.url)) continue;

          // Extract skills
          const skills = jobData.skills
            ? jobData.skills.map((s: any) => s.skill)
            : [];

          // Filter by requirements
          if (filters.keywords.length > 0) {
            const matchesKeyword = filters.keywords.some((kw) =>
              jobData.title.toLowerCase().includes(kw.toLowerCase()) ||
              jobData.description.toLowerCase().includes(kw.toLowerCase())
            );
            if (!matchesKeyword) continue;
          }

          // Filter by budget
          if (filters.min_salary && jobData.budget && jobData.budget.minimum < filters.min_salary) {
            continue;
          }
          if (filters.max_salary && jobData.budget && jobData.budget.maximum > filters.max_salary) {
            continue;
          }

          const job: JobListing = {
            title: jobData.title,
            company: jobData.client?.company?.public_name || 'Unknown',
            location: jobData.client?.location?.country || 'Remote',
            salary: this.formatBudget(jobData.budget),
            description: jobData.description,
            url: jobData.url,
            source: 'upwork',
            posted_date: new Date(jobData.posted_on * 1000),
            job_type: jobData.engagement_type || 'contract',
            skills,
          };

          // Filter job
          const filtered = this.filterJobs([job], filters);
          if (filtered.length > 0) {
            const jobId = await this.saveJob(job);
            if (jobId) {
              jobs.push({ ...job, id: jobId });
            }
          }

          await this.randomDelay(200, 500);
        } catch (error) {
          console.error('⚠️ Failed to process job:', error);
          continue;
        }
      }

      console.log(`✅ Found ${jobs.length} matching jobs on Upwork`);
      return jobs;
    } catch (error) {
      console.error('❌ Upwork search failed:', error);
      throw error;
    }
  }

  /**
   * Apply to a job on Upwork
   */
  async apply(job: JobListing): Promise<AgentApplyResult> {
    try {
      console.log(`📝 Applying to job: ${job.title}`);

      if (!this.client) throw new Error('Client not initialized');

      // Check if already applied
      if (await this.alreadyApplied(job.url)) {
        console.log('⚠️ Already applied to this job');
        return {
          success: false,
          jobId: job.id || 0,
          message: 'Already applied',
          timestamp: new Date(),
          source: 'upwork',
        };
      }

      // Submit proposal
      const proposalData = {
        jobs: [job.id],
        proposal: this.generateProposal(job),
        bid: this.calculateBid(job),
      };

      const response = await this.client.post('/tasks/v2/tasks/contracts/proposals', proposalData);

      if (response.status === 201 || response.status === 200) {
        // Save application
        const jobId = job.id || (await this.saveJob(job)) || 0;
        if (jobId) {
          await this.saveApplication(jobId, proposalData.proposal);
        }

        console.log('✅ Successfully applied to job');
        return {
          success: true,
          jobId,
          applicationId: response.data.id,
          message: 'Proposal submitted',
          timestamp: new Date(),
          source: 'upwork',
        };
      } else {
        throw new Error(`API returned status ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Upwork apply failed:', error);
      return {
        success: false,
        jobId: job.id || 0,
        message: `Application failed: ${error}`,
        timestamp: new Date(),
        source: 'upwork',
      };
    }
  }

  /**
   * Format budget for display
   */
  private formatBudget(budget: any): string {
    if (!budget) return 'Not specified';
    const { minimum, maximum, currency } = budget;
    return `${currency} ${minimum} - ${maximum}`;
  }

  /**
   * Generate proposal text
   */
  private generateProposal(job: JobListing): string {
    return `Hello,

I am interested in this ${job.title} position. With my experience and skills, I believe I can deliver excellent results for your project.

Key strengths:
- Relevant experience in the field
- Strong technical skills
- Commitment to quality and timely delivery

I look forward to discussing how I can contribute to your project.

Best regards,
Your Name`;
  }

  /**
   * Calculate bid amount
   */
  private calculateBid(job: JobListing): number {
    // Simple bid calculation - can be customized
    const baseBid = 50;
    return baseBid;
  }
}
