/**
 * analysisService.js
 * @description :: Core business logic for AI analysis operations
 */

const axios = require('axios');
const Response = require('../model/response');
const Application = require('../model/application');
const AnalysisTasks = require('../model/analysisTasks');
const Question = require('../model/question');

/**
 * Generate AI analysis for individual interview response
 * This function is used by the worker thread
 */
async function generateAIAnalysis({ questionText, responseText, jobDetails, questionDetails, candidateInfo, evaluationInstructions }) {
  try {
    const ollamaHost = process.env.AI_GENERATE_URL || process.env.OLLAMA_HOST || 'https://ollama2.havenify.ai';
    const ollamaModel = process.env.OLLAMA_MODEL || 'gemma3:latest';
    
    // Ensure we have the correct API endpoint
    let ollamaApiUrl;
    if (!ollamaHost.includes('/api/generate')) {
      ollamaApiUrl = `${ollamaHost}/api/generate`;
    } else {
      ollamaApiUrl = ollamaHost;
    }

    console.log('🤖 Using API URL for analysis:', ollamaApiUrl);

    // Create intelligent prompt for analysis
    const analysisPrompt = createIntelligentPrompt({
      questionText,
      responseText,
      jobDetails,
      questionDetails,
      candidateInfo,
      evaluationInstructions
    });

    console.log('🤖 Calling AI service for analysis...');

    // Use axios with retry logic
    const maxRetries = 3;
    let lastError;
    let aiResponseText = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}: Calling Ollama API for response analysis`);
        
        const response = await axios.post(ollamaApiUrl, {
          model: ollamaModel,
          prompt: analysisPrompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 2500,
            top_p: 0.9,
            repeat_penalty: 1.1,
          }
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 120000
        });

        aiResponseText = response.data.response || '';
        
        if (!aiResponseText) {
          throw new Error('Empty response from Ollama');
        }

        console.log('✅ AI analysis API call successful');
        break; // Success, exit retry loop
        
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        // Don't retry on certain errors
        if (error.response?.status === 404) {
          throw new Error(`Ollama service not found at ${ollamaApiUrl}. Please ensure Ollama is running and accessible.`);
        }
        
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // If all retries failed
    if (!aiResponseText && lastError) {
      console.error('All AI analysis attempts failed:', lastError);
      throw lastError;
    }
    
    // Try to extract and parse JSON from AI response
    let aiAnalysis;
    try {
      const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.warn('⚠️ Failed to parse AI response, using fallback analysis');
      aiAnalysis = generateFallbackAnalysis(questionText, responseText, jobDetails);
    }

    // Ensure proper structure
    const finalAnalysis = standardizeAnalysisStructure(aiAnalysis);

    console.log('✅ AI analysis completed successfully');
    return finalAnalysis;

  } catch (error) {
    console.error('❌ AI analysis failed:', error);
    return generateFallbackAnalysis(questionText, responseText, jobDetails);
  }
}

/**
 * Generate overall AI analysis for complete interview
 * This function is used by the worker thread
 */
async function generateOverallAIAnalysis({ candidateProfile, jobProfile, responses, interviewMetadata }) {
  try {
    const ollamaHost = process.env.AI_GENERATE_URL || process.env.OLLAMA_HOST || 'https://ollama2.havenify.ai';
    const ollamaModel = process.env.OLLAMA_MODEL || 'gemma3:latest';
    
    // Ensure we have the correct API endpoint
    let ollamaApiUrl;
    if (!ollamaHost.includes('/api/generate')) {
      ollamaApiUrl = `${ollamaHost}/api/generate`;
    } else {
      ollamaApiUrl = ollamaHost;
    }

    console.log('🤖 Using API URL for overall analysis:', ollamaApiUrl);

    // Create comprehensive prompt for overall analysis
    const overallPrompt = createOverallAnalysisPrompt({
      candidateProfile,
      jobProfile,
      responses,
      interviewMetadata
    });

    console.log('🤖 Calling AI service for overall interview analysis...');

    // Use axios with retry logic
    const maxRetries = 3;
    let lastError;
    let aiResponseText = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}: Calling Ollama API for overall analysis`);
        
        const response = await axios.post(ollamaApiUrl, {
          model: ollamaModel,
          prompt: overallPrompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 3000,
            top_p: 0.9,
            repeat_penalty: 1.1,
          }
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 120000
        });

        aiResponseText = response.data.response || '';
        
        if (!aiResponseText) {
          throw new Error('Empty response from Ollama');
        }

        console.log('✅ AI overall analysis API call successful');
        break; // Success, exit retry loop
        
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        // Don't retry on certain errors
        if (error.response?.status === 404) {
          throw new Error(`Ollama service not found at ${ollamaApiUrl}. Please ensure Ollama is running and accessible.`);
        }
        
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // If all retries failed
    if (!aiResponseText && lastError) {
      console.error('All AI overall analysis attempts failed:', lastError);
      throw lastError;
    }
    
    // Try to extract and parse JSON from AI response
    let aiAnalysis;
    try {
      const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.warn('⚠️ Failed to parse AI response, using fallback analysis');
      aiAnalysis = generateFallbackOverallAnalysis(responses);
    }

    // Ensure proper structure
    const finalAnalysis = standardizeOverallAnalysisStructure(aiAnalysis);

    console.log('✅ AI overall analysis completed successfully');
    return finalAnalysis;

  } catch (error) {
    console.error('❌ AI overall analysis failed:', error);
    return generateFallbackOverallAnalysis(responses);
  }
}

/**
 * Create intelligent prompt for individual response analysis
 */
function createIntelligentPrompt({ questionText, responseText, jobDetails, questionDetails, candidateInfo, evaluationInstructions }) {
  return `You are an expert interview analyst. Analyze this candidate's response and provide a comprehensive evaluation.

CONTEXT:
- Job Title: ${jobDetails.title}
- Job Description: ${jobDetails.description}
- Question: ${questionText}
- Candidate Response: ${responseText}
- Candidate Name: ${candidateInfo.name}
- Experience Level: ${candidateInfo.experience}
- Skills: ${candidateInfo.skills?.join(', ') || 'Not specified'}
- Question Type: ${questionDetails.type}
- Evaluation Instructions: ${evaluationInstructions}

ANALYSIS REQUIREMENTS:
1. Technical accuracy and depth of knowledge
2. Communication clarity and articulation
3. Problem-solving approach and methodology
4. Relevance to job requirements
5. Examples and practical experience mentioned
6. Areas for improvement

Respond with a JSON object containing:
{
  "overall_score": 85,
  "technical_score": 80,
  "communication_score": 90,
  "relevance_score": 85,
  "strengths": ["Clear explanation", "Good examples", "Technical depth"],
  "weaknesses": ["Could provide more detail", "Missing specific framework knowledge"],
  "detailed_feedback": "Comprehensive analysis of the response...",
  "improvement_suggestions": ["Learn more about X", "Practice explaining Y"],
  "keywords_mentioned": ["React", "Node.js", "API"],
  "confidence_level": "high"
}

Provide scores out of 100 and be objective in your analysis.`;
}

/**
 * Create comprehensive prompt for overall interview analysis
 */
function createOverallAnalysisPrompt({ candidateProfile, jobProfile, responses, interviewMetadata }) {
  const responseSummary = responses.map((r, idx) => 
    `Q${idx + 1}: ${r.questionText}\nA${idx + 1}: ${r.responseText}\n`
  ).join('\n');

  return `You are an expert hiring manager. Analyze this candidate's complete interview performance and provide a comprehensive evaluation.

CANDIDATE PROFILE:
- Name: ${candidateProfile.name}
- Email: ${candidateProfile.email}
- Experience: ${candidateProfile.experience}
- Skills: ${candidateProfile.skills?.join(', ') || 'Not specified'}
- Location: ${candidateProfile.location}

JOB PROFILE:
- Title: ${jobProfile.title}
- Description: ${jobProfile.description}
- Requirements: ${jobProfile.requirements?.join(', ') || 'Not specified'}
- Location: ${jobProfile.location}

INTERVIEW RESPONSES:
${responseSummary}

METADATA:
- Total Questions: ${interviewMetadata.totalQuestions}
- Interview Completed: ${interviewMetadata.completedAt}

COMPREHENSIVE ANALYSIS REQUIREMENTS:
1. Overall candidate suitability for the role
2. Technical competency assessment
3. Communication and soft skills evaluation
4. Cultural fit and alignment with job requirements
5. Strengths and areas for development
6. Hiring recommendation with reasoning

Respond with a JSON object containing:
{
  "overall_score": 82,
  "technical_competency": 85,
  "communication_skills": 80,
  "cultural_fit": 78,
  "job_alignment": 88,
  "hiring_recommendation": "strong_consider",
  "recommendation_confidence": "high",
  "key_strengths": ["Strong technical background", "Clear communication", "Relevant experience"],
  "areas_for_development": ["Leadership experience", "Advanced frameworks"],
  "interview_summary": "Detailed summary of interview performance...",
  "next_steps": ["Technical deep dive", "Team fit interview"],
  "salary_bracket": "mid_to_senior",
  "onboarding_time": "2-3 months",
  "risk_factors": ["Limited team leadership"],
  "growth_potential": "high"
}

Use hiring_recommendation values: "strong_hire", "hire", "strong_consider", "consider", "no_hire"
Use recommendation_confidence values: "very_high", "high", "medium", "low"`;
}

/**
 * Standardize analysis structure for consistent output
 */
function standardizeAnalysisStructure(aiAnalysis) {
  return {
    overall_score: aiAnalysis.overall_score || 0,
    technical_score: aiAnalysis.technical_score || 0,
    communication_score: aiAnalysis.communication_score || 0,
    relevance_score: aiAnalysis.relevance_score || 0,
    strengths: aiAnalysis.strengths || [],
    weaknesses: aiAnalysis.weaknesses || [],
    detailed_feedback: aiAnalysis.detailed_feedback || 'Analysis completed',
    improvement_suggestions: aiAnalysis.improvement_suggestions || [],
    keywords_mentioned: aiAnalysis.keywords_mentioned || [],
    confidence_level: aiAnalysis.confidence_level || 'medium',
    analysis_timestamp: new Date().toISOString()
  };
}

/**
 * Standardize overall analysis structure
 */
function standardizeOverallAnalysisStructure(aiAnalysis) {
  return {
    overall_score: aiAnalysis.overall_score || 0,
    technical_competency: aiAnalysis.technical_competency || 0,
    communication_skills: aiAnalysis.communication_skills || 0,
    cultural_fit: aiAnalysis.cultural_fit || 0,
    job_alignment: aiAnalysis.job_alignment || 0,
    hiring_recommendation: aiAnalysis.hiring_recommendation || 'consider',
    recommendation_confidence: aiAnalysis.recommendation_confidence || 'medium',
    key_strengths: aiAnalysis.key_strengths || [],
    areas_for_development: aiAnalysis.areas_for_development || [],
    interview_summary: aiAnalysis.interview_summary || 'Interview analysis completed',
    next_steps: aiAnalysis.next_steps || [],
    salary_bracket: aiAnalysis.salary_bracket || 'mid_level',
    onboarding_time: aiAnalysis.onboarding_time || '1-2 months',
    risk_factors: aiAnalysis.risk_factors || [],
    growth_potential: aiAnalysis.growth_potential || 'medium',
    analysis_timestamp: new Date().toISOString()
  };
}

/**
 * Generate fallback analysis when AI service fails
 */
function generateFallbackAnalysis(questionText, responseText, jobDetails) {
  const responseLength = responseText?.length || 0;
  const basicScore = calculateBasicScore(responseText);
  
  return {
    overall_score: basicScore,
    technical_score: Math.max(0, basicScore - 10),
    communication_score: responseLength > 100 ? basicScore : Math.max(0, basicScore - 20),
    relevance_score: basicScore,
    strengths: ['Response provided'],
    weaknesses: ['Unable to perform detailed analysis'],
    detailed_feedback: 'Fallback analysis - AI service unavailable',
    improvement_suggestions: ['Please try again later'],
    keywords_mentioned: [],
    confidence_level: 'low',
    analysis_timestamp: new Date().toISOString(),
    fallback: true
  };
}

/**
 * Generate fallback overall analysis
 */
function generateFallbackOverallAnalysis(responses) {
  const avgScore = responses.length > 0 ? 
    responses.reduce((sum, r) => sum + (r.aiAnalysis?.overall_score || 50), 0) / responses.length : 50;
  
  return {
    overall_score: Math.round(avgScore),
    technical_competency: Math.round(avgScore * 0.9),
    communication_skills: Math.round(avgScore * 1.1),
    cultural_fit: Math.round(avgScore),
    job_alignment: Math.round(avgScore * 0.95),
    hiring_recommendation: avgScore >= 70 ? 'consider' : 'strong_consider',
    recommendation_confidence: 'low',
    key_strengths: ['Interview completed'],
    areas_for_development: ['Detailed analysis pending'],
    interview_summary: 'Fallback analysis - AI service unavailable',
    next_steps: ['Retry analysis when service available'],
    salary_bracket: 'mid_level',
    onboarding_time: '1-2 months',
    risk_factors: ['Analysis incomplete'],
    growth_potential: 'medium',
    analysis_timestamp: new Date().toISOString(),
    fallback: true
  };
}

/**
 * Calculate basic score based on response characteristics
 */
function calculateBasicScore(responseText) {
  if (!responseText) return 0;
  
  const length = responseText.length;
  const wordCount = responseText.split(/\s+/).length;
  
  let score = 0;
  
  // Length-based scoring
  if (length > 500) score += 30;
  else if (length > 200) score += 20;
  else if (length > 50) score += 10;
  
  // Word count scoring
  if (wordCount > 100) score += 30;
  else if (wordCount > 50) score += 20;
  else if (wordCount > 20) score += 10;
  
  // Complexity indicators
  if (responseText.includes('.') && responseText.includes(',')) score += 10;
  if (/[A-Z]/.test(responseText)) score += 5;
  if (responseText.split('.').length > 3) score += 10;
  
  return Math.min(score, 80); // Cap at 80 for basic analysis
}

module.exports = {
  generateAIAnalysis,
  generateOverallAIAnalysis,
  standardizeAnalysisStructure,
  standardizeOverallAnalysisStructure,
  generateFallbackAnalysis,
  generateFallbackOverallAnalysis
};
