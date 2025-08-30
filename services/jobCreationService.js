const Job = require('../models/job');
const Question = require('../models/question');

class JobCreationService {
  async createJobWithQuestions(jobData, userId, workspaceId) {
    try {
      const questionIds = [];
      
      // Create questions first if they exist
      if (jobData.questions && jobData.questions.length > 0) {
        for (const questionData of jobData.questions) {
          const question = new Question({
            title: questionData.title,
            question_type: questionData.question_type || 'video',
            evaluation_instructions: questionData.evaluation_instructions,
            timeLimit: questionData.timeLimit || 120,
            allowRetry: questionData.allowRetry || false,
            tags: questionData.tags || [],
            order: questionData.order || 1,
            addedBy: userId,
            workspace: workspaceId
          });
          
          const savedQuestion = await question.save();
          questionIds.push(savedQuestion._id);
        }
      }

      // Process interview links
      const interviewLinks = [];
      if (jobData.interviewLinks && jobData.interviewLinks.length > 0) {
        for (const linkData of jobData.interviewLinks) {
          interviewLinks.push({
            name: linkData.name || `Interview Link ${interviewLinks.length + 1}`,
            enabled: linkData.enabled !== undefined ? linkData.enabled : true,
            maxUses: linkData.maxUses || 'Unlimited',
            currentUses: 0,
            expiresAt: linkData.expiresAt ? new Date(linkData.expiresAt) : null,
            requireVerification: linkData.requireVerification !== undefined ? linkData.requireVerification : true,
            isActive: true
          });
        }
      } else {
        // Create default interview link if none provided
        interviewLinks.push({
          name: 'Main Interview Link',
          enabled: true,
          maxUses: 'Unlimited',
          currentUses: 0,
          expiresAt: null,
          requireVerification: true,
          isActive: true
        });
      }

      // Create job with question references and interview links
      const jobPayload = {
        title: jobData.jobTitle,
        description: jobData.jobDescription,
        location: jobData.location,
        employment_type: jobData.employmentType,
        requirements: jobData.requirements || [],
        salary: jobData.salaryRange,
        last_date: jobData.applicationDeadline ? new Date(jobData.applicationDeadline) : null,
        publicationStatus: jobData.publicationStatus || 'draft',
        interviewLinks: interviewLinks,
        questions: questionIds,
        addedBy: userId,
        workspace: workspaceId
      };

      const job = new Job(jobPayload);
      const savedJob = await job.save();
      
      // Populate questions for response
      await savedJob.populate('questions');
      
      return {
        success: true,
        data: {
          job: savedJob,
          interviewLinks: savedJob.interviewLinks.map(link => ({
            id: link.linkId,
            name: link.name,
            url: `${process.env.BASE_URL || 'http://localhost:3000'}/interview/${link.linkId}`,
            enabled: link.enabled,
            maxUses: link.maxUses,
            currentUses: link.currentUses,
            expiresAt: link.expiresAt,
            requireVerification: link.requireVerification,
            isActive: link.isActive
          }))
        }
      };
    } catch (error) {
      console.error('Job creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Method to add additional interview links to existing job
  async addInterviewLink(jobId, linkData, userId) {
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      const newLink = job.addInterviewLink(linkData);
      await job.save();

      return {
        success: true,
        data: {
          id: newLink.linkId,
          name: newLink.name,
          url: `${process.env.BASE_URL || 'http://localhost:3000'}/interview/${newLink.linkId}`,
          enabled: newLink.enabled,
          maxUses: newLink.maxUses,
          currentUses: newLink.currentUses,
          expiresAt: newLink.expiresAt,
          requireVerification: newLink.requireVerification,
          isActive: newLink.isActive
        }
      };
    } catch (error) {
      console.error('Add interview link error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Method to validate and use interview link
  async validateInterviewLink(linkId) {
    try {
      const job = await Job.findOne({ 
        'interviewLinks.linkId': linkId,
        isDeleted: false,
        isActive: true 
      }).populate('questions');

      if (!job) {
        return { success: false, error: 'Interview link not found' };
      }

      const isValid = job.isLinkValid(linkId);
      if (!isValid) {
        return { success: false, error: 'Interview link is expired or disabled' };
      }

      // Increment usage count
      job.incrementLinkUsage(linkId);
      await job.save();

      const link = job.interviewLinks.find(l => l.linkId === linkId);

      return {
        success: true,
        data: {
          job: {
            id: job._id,
            title: job.title,
            description: job.description,
            location: job.location,
            employment_type: job.employment_type,
            questions: job.questions
          },
          link: {
            id: link.linkId,
            name: link.name,
            requireVerification: link.requireVerification,
            currentUses: link.currentUses,
            maxUses: link.maxUses
          }
        }
      };
    } catch (error) {
      console.error('Validate interview link error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = JobCreationService;
