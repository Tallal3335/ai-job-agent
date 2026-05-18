import { BaytAgent } from '../agents/baytAgent';
import { NaukriAgent } from '../agents/naukriAgent';
import { GulftalentAgent } from '../agents/gulftalentAgent';
import { UpworkAgent } from '../agents/upworkAgent';
import { LinkedinAgent } from '../agents/linkedinAgent';
import { BaseAgent } from '../agents/baseAgent';
import { JobListing, JobFilter, JobSource, AgentApplyResult } from '../types/index';
import { query } from '../database/db';

export class AgentOrchestrator {
  private agents: Map<JobSource, BaseAgent> = new Map();
  private activeAgents: JobSource[] = [];

  constructor() {
    this.initializeAgents();
  }

  /**
   * Initialize all available agents
   */
  private initializeAgents(): void {
    console.log('🤖 Initializing job board agents...');
    
    if (process.env.BAYT_ENABLED !== 'false') {
      this.agents.set('bayt', new BaytAgent());
      this.activeAgents.push('bayt');
      console.log('✅ Bayt agent initialized');
    }

    if (process.env.NAUKRI_ENABLED !== 'false') {
      this.agents.set('naukri', new NaukriAgent());
      this.activeAgents.push('naukri');
      console.log('✅ Naukri agent initialized');
    }

    if (process.env.GULFTALENT_ENABLED !== 'false') {
      this.agents.set('gulftalent', new GulftalentAgent());
      this.activeAgents.push('gulftalent');
      console.log('✅ GulfTalent agent initialized');
    }

    if (process.env.UPWORK_ENABLED !== 'false') {
      this.agents.set('upwork', new UpworkAgent());
      this.activeAgents.push('upwork');
      console.log('✅ Upwork agent initialized');
    }

    if (process.env.LINKEDIN_ENABLED !== 'false') {
      this.agents.set('linkedin', new LinkedinAgent());
      this.activeAgents.push('linkedin');
      console.log('✅ LinkedIn agent initialized');
    }

    console.log(`🤖 Total agents initialized: ${this.activeAgents.length}`);
  }

  /**
   * Search for jobs across all active agents
   */
  async searchAcrossAllAgents(filter: JobFilter): Promise<Map<JobSource, JobListing[]>> {
    console.log('🔍 Starting multi-board job search...');
    const results = new Map<JobSource, JobListing[]>();
    const errors: Map<JobSource, Error> = new Map();

    for (const source of this.activeAgents) {
      try {
        const agent = this.agents.get(source);
        if (!agent) {
          console.warn(`⚠️ Agent for ${source} not found`);
          continue;
        }

        console.log(`🔍 Searching on ${source}...`);
        
        try {
          await agent.login();
          const jobs = await agent.search(filter);
          results.set(source, jobs);
          console.log(`✅ Found ${jobs.length} jobs on ${source}`);
        } finally {
          await agent.logout();
        }
      } catch (error) {
        console.error(`❌ Error searching on ${source}:`, error);
        errors.set(source, error as Error);
        results.set(source, []);
      }
    }

    // Log summary
    const totalJobs = Array.from(results.values()).reduce((sum, jobs) => sum + jobs.length, 0);
    console.log(`✅ Search complete! Found ${totalJobs} total jobs`);
    
    if (errors.size > 0) {
      console.warn(`⚠️ ${errors.size} sources had errors`);
    }

    return results;
  }

  /**
   * Search on specific job board
   */
  async searchOnBoard(source: JobSource, filter: JobFilter): Promise<JobListing[]> {
    const agent = this.agents.get(source);
    if (!agent) {
      throw new Error(`Agent for ${source} not found`);
    }

    try {
      console.log(`🔍 Searching on ${source}...`);
      await agent.login();
      const jobs = await agent.search(filter);
      console.log(`✅ Found ${jobs.length} jobs on ${source}`);
      return jobs;
    } finally {
      await agent.logout();
    }
  }

  /**
   * Apply to job on specific board
   */
  async applyToJob(source: JobSource, job: JobListing): Promise<AgentApplyResult> {
    const agent = this.agents.get(source);
    if (!agent) {
      throw new Error(`Agent for ${source} not found`);
    }

    try {
      console.log(`📝 Applying to job on ${source}...`);
      await agent.login();
      const result = await agent.apply(job);
      return result;
    } finally {
      await agent.logout();
    }
  }

  /**
   * Auto-apply to all matching jobs
   */
  async autoApplyToAllMatches(filter: JobFilter): Promise<Map<JobSource, AgentApplyResult[]>> {
    console.log('🤖 Starting auto-apply process...');
    const results = new Map<JobSource, AgentApplyResult[]>();

    // Search across all boards
    const searchResults = await this.searchAcrossAllAgents(filter);

    // Apply to each matching job
    for (const [source, jobs] of searchResults.entries()) {
      const applyResults: AgentApplyResult[] = [];

      for (const job of jobs) {
        try {
          const result = await this.applyToJob(source as JobSource, job);
          applyResults.push(result);

          if (result.success) {
            console.log(`✅ Applied to: ${job.title} at ${job.company}`);
          } else {
            console.log(`⚠️ Failed to apply: ${result.message}`);
          }
        } catch (error) {
          console.error(`❌ Error applying to job:`, error);
          applyResults.push({
            success: false,
            jobId: job.id || 0,
            message: `Error: ${error}`,
            timestamp: new Date(),
            source: source as JobSource,
          });
        }
      }

      results.set(source as JobSource, applyResults);
    }

    // Log summary
    const totalApplications = Array.from(results.values()).reduce(
      (sum, apps) => sum + apps.length,
      0
    );
    const successfulApplications = Array.from(results.values()).reduce(
      (sum, apps) => sum + apps.filter((a) => a.success).length,
      0
    );

    console.log(`✅ Auto-apply complete!`);
    console.log(`   Total applications: ${totalApplications}`);
    console.log(`   Successful: ${successfulApplications}`);
    console.log(`   Failed: ${totalApplications - successfulApplications}`);

    return results;
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    totalJobsFound: number;
    totalApplicationsSubmitted: number;
    successRate: number;
    bySource: Record<string, any>;
  }> {
    try {
      // Get total jobs
      const jobsResult = await query('SELECT COUNT(*) as count FROM jobs');
      const totalJobs = jobsResult.rows[0]?.count || 0;

      // Get total applications
      const appsResult = await query('SELECT COUNT(*) as count FROM applications');
      const totalApplications = appsResult.rows[0]?.count || 0;

      // Get successful applications
      const successResult = await query(
        "SELECT COUNT(*) as count FROM applications WHERE status = 'applied'"
      );
      const successfulApplications = successResult.rows[0]?.count || 0;

      // Get stats by source
      const sourceStatsResult = await query(`
        SELECT source, COUNT(*) as count 
        FROM jobs 
        GROUP BY source
      `);

      const bySource: Record<string, any> = {};
      for (const row of sourceStatsResult.rows) {
        bySource[row.source] = {
          jobsFound: row.count,
        };
      }

      // Add application count per source
      const appStatsResult = await query(`
        SELECT a.source, COUNT(*) as count 
        FROM applications a
        GROUP BY a.source
      `);

      for (const row of appStatsResult.rows) {
        if (bySource[row.source]) {
          bySource[row.source].applicationsSubmitted = row.count;
        }
      }

      const successRate =
        totalApplications > 0
          ? Math.round((successfulApplications / totalApplications) * 100)
          : 0;

      return {
        totalJobsFound: totalJobs,
        totalApplicationsSubmitted: totalApplications,
        successRate,
        bySource,
      };
    } catch (error) {
      console.error('❌ Failed to get statistics:', error);
      throw error;
    }
  }

  /**
   * Get active agents
   */
  getActiveAgents(): JobSource[] {
    return this.activeAgents;
  }

  /**
   * Enable/disable agent
   */
  setAgentActive(source: JobSource, active: boolean): void {
    if (active && !this.activeAgents.includes(source)) {
      this.activeAgents.push(source);
      console.log(`✅ Enabled ${source} agent`);
    } else if (!active && this.activeAgents.includes(source)) {
      this.activeAgents = this.activeAgents.filter((s) => s !== source);
      console.log(`✅ Disabled ${source} agent`);
    }
  }

  /**
   * Cleanup all agents
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up agents...');
    for (const agent of this.agents.values()) {
      try {
        await agent.closeBrowser();
      } catch (error) {
        console.error('Error cleaning up agent:', error);
      }
    }
    console.log('✅ Cleanup complete');
  }
}

// Export singleton instance
export const orchestrator = new AgentOrchestrator();
