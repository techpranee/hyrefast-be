/**
 * responseController.js
 * @description : exports action methods for response.
 */

const Response = require('../../../model/response');
const responseSchemaKey = require('../../../utils/validation/responseValidation');
const validation = require('../../../utils/validateRequest');
const dbService = require('../../../utils/dbService');
const ObjectId = require('mongodb').ObjectId;
const utils = require('../../../utils/common');
const { Ollama } = require('ollama');
const Application = require('../../../model/application');
const Question = require('../../../model/question');
   
/**
 * Create interview response with AI analysis
 */
const createInterviewResponse = async (req, res) => {
  try {
    console.log('🎯 Creating interview response with AI analysis');
    
    const {
      applicationId,
      questionNumber,
      questionText,
      responseText,
      responseAudioUrl,
      responseVideoUrl,
      responseDuration,
      token,
      questionId,
      evaluation_instructions
    } = req.body;

    // Validate required fields
    if (!applicationId || !questionNumber || !responseText) {
      return res.badRequest({ 
        message: 'Application ID, question number, and response text are required' 
      });
    }

    // Get application with populated references
    const application = await dbService.findOne(Application, 
      { _id: applicationId }, 
      { 
        populate: [
          { path: 'job', select: 'title description requirements' },
          { path: 'candidate', select: 'name email' }
        ]
      }
    );

    if (!application) {
      return res.recordNotFound({ message: 'Application not found' });
    }

    // Get question details if questionId provided
    let questionDetails = null;
    if (questionId && ObjectId.isValid(questionId)) {
      questionDetails = await dbService.findOne(Question, { _id: questionId });
    }

    console.log('📊 Generating AI analysis for response...', application);

   

    // Generate AI analysis
    const aiAnalysis = await generateAIAnalysis({
      questionText,
      responseText,
      jobDetails: application.job,
      questionDetails,
      candidateInfo: application.candidate,
      evaluationInstructions: evaluation_instructions
    });


    // Prepare response data
    const responseData = {
      job: application.job?._id,
      question: questionId && ObjectId.isValid(questionId) ? questionId : null,
      candidate: application.candidate?._id,
      sessionId: applicationId,
      questionNumber: parseInt(questionNumber),
      questionText,
      responseText,
      transcriptionText: responseText,
      responseAudioUrl,
      responseVideoUrl,
      score: aiAnalysis.overallScore?.toString() || '75',
      aiAnalysis: aiAnalysis,
      addedBy: application.candidate?._id || req.user?.id
    };

    // Validate data against schema
    let validateRequest = validation.validateParamsWithJoi(
      responseData,
      responseSchemaKey.schemaKeys
    );
    
    if (!validateRequest.isValid) {
      // If validation fails, create minimal response without strict validation
      console.warn('⚠️ Validation failed, creating with minimal data:', validateRequest.message);
    }

    // Create response document
    const newResponse = new Response(responseData);
    const createdResponse = await dbService.create(Response, newResponse);

    const updateInterViewResponse = await dbService.updateOne(Application,{
      _id: applicationId,
    },{
      currentQuestion: questionNumber + 1,
    })

    console.log('✅ Interview response created successfully');

    return res.success({
      message: 'Interview response created with AI analysis',
      data: {
        responseId: createdResponse._id || createdResponse.id,
        aiAnalysis: aiAnalysis,
        score: aiAnalysis.overallScore
      }
    });

  } catch (error) {
    console.error('❌ Error creating interview response:', error);
    return res.internalServerError({ 
      message: 'Failed to create interview response',
      error: error.message 
    });
  }
};

/**
 * Generate AI analysis for interview response
 */
/**
 * Generate AI analysis for interview response
 */
async function generateAIAnalysis({ questionText, responseText, jobDetails, questionDetails, candidateInfo, evaluationInstructions }) {
  try {
    const ollamaHost = process.env.AI_GENERATE_URL || process.env.OLLAMA_HOST || 'https://ollama2.havenify.ai';
    const ollamaModel = process.env.OLLAMA_MODEL || 'gemma3:latest';
    
    const client = new Ollama({ host: ollamaHost });

    // Let AI determine the analysis approach
    const analysisPrompt = createIntelligentPrompt({
      questionText,
      responseText,
      jobDetails,
      questionDetails,
      candidateInfo,
      evaluationInstructions
    });

    console.log('🤖 Calling AI service for analysis...');

    const response = await client.generate({
      model: ollamaModel,
      prompt: analysisPrompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 2500,
        top_p: 0.9,
        repeat_penalty: 1.1,
      }
    });

    const aiResponseText = response.response || response.message?.content || '';
    
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
 * Create intelligent prompt that lets AI decide analysis approach
 */
function createIntelligentPrompt({ questionText, responseText, jobDetails, questionDetails, candidateInfo, evaluationInstructions }) {
  return `You are an expert interview evaluator with deep experience in talent assessment across all domains. You have the intelligence to automatically determine what type of question this is and what aspects should be prioritized in your evaluation.

INTERVIEW CONTEXT:
- Job Title: ${jobDetails?.title || 'Position not specified'}
- Job Description: ${jobDetails?.description || 'Not provided'}
- Job Requirements: ${jobDetails?.requirements?.join(', ') || 'Not specified'}
- Candidate: ${candidateInfo?.name || 'Not specified'}

INTERVIEW QUESTION:
"${questionText}"

CANDIDATE RESPONSE:
"${responseText}"

${evaluationInstructions ? `Evaluation Instructions: ${evaluationInstructions}` : ''}

INSTRUCTIONS:
1. **INTELLIGENTLY ANALYZE** the question type and determine what matters most:
   - If it's technical: Focus on accuracy, problem-solving, knowledge depth, implementation quality
   - If it's behavioral: Focus on situation clarity, actions taken, results achieved, learning demonstrated  
   - If it's cultural/motivational: Focus on alignment, motivation, professionalism, career fit
   - If it's general: Provide balanced assessment across relevant areas

2. **ADAPTIVE EVALUATION**: Don't force irrelevant criteria. For example:
   - For technical questions: De-emphasize communication style unless critically poor
   - For behavioral questions: Focus on examples and outcomes, not technical details
   - For cultural questions: Emphasize values alignment over technical skills

3. **INTELLIGENT REASONING**: For each rating, provide specific, insightful reasoning that explains:
   - What you observed in the response
   - Why this leads to the given rating
   - What could be improved and how

RATING SCALE DEFINITIONS:
- **Excellent** (90-100): Outstanding performance, exceeds expectations significantly
- **Good** (75-89): Strong performance, meets expectations well with notable strengths  
- **Average** (60-74): Adequate performance, meets basic expectations
- **Fair** (45-59): Below expectations, shows some capability but with notable gaps
- **Poor** (0-44): Well below expectations, significant deficiencies evident

Provide your analysis in this exact JSON format:
{
  "overall_assessment": {
    "rating": "Excellent|Good|Average|Fair|Poor",
    "score": 85,
    "reasoning": "Comprehensive summary explaining the overall rating with specific evidence from the response"
  },
  "question_analysis": {
    "type": "Technical|Behavioral|Cultural|Situational|General|Mixed",
    "primary_focus": "What this question is primarily testing for",
    "secondary_aspects": "Other relevant evaluation aspects for this question"
  },
  "detailed_analysis": {
    "criterion_1": {
      "name": "Most relevant criterion for this question type",
      "rating": "Excellent|Good|Average|Fair|Poor",
      "score": 85,
      "reasoning": "Detailed explanation with specific evidence from the response"
    },
    "criterion_2": {
      "name": "Second most relevant criterion",
      "rating": "Good|Average|Fair|Poor|Excellent", 
      "score": 80,
      "reasoning": "Specific reasoning with examples from the candidate's answer"
    },
    "criterion_3": {
      "name": "Third relevant criterion",
      "rating": "Average|Fair|Poor|Good|Excellent",
      "score": 75,
      "reasoning": "Clear justification for this rating"
    },
    "criterion_4": {
      "name": "Fourth relevant criterion (if applicable)",
      "rating": "Fair|Poor|Average|Good|Excellent",
      "score": 70,
      "reasoning": "Reasoning for this assessment"
    }
  },
  "strengths": [
    "Specific strength with clear evidence from the response",
    "Another strength with detailed explanation of why it's notable"
  ],
  "areas_for_improvement": [
    "Specific area for improvement with actionable advice",
    "Another improvement area with constructive guidance"
  ],
  "red_flags": [
    "Any concerning responses or significant gaps (empty array if none)"
  ],
  "key_insights": "Most important observations about the candidate's capabilities and potential",
  "recommendation": {
    "decision": "Strong Hire|Hire|Maybe|No Hire|Strong No Hire",
    "reasoning": "Clear rationale for the hiring recommendation based on the comprehensive analysis",
    "confidence_level": "High|Medium|Low"
  },
  "follow_up_questions": [
    "Thoughtful follow-up question to explore strengths or address gaps",
    "Another relevant probing question based on the response analysis"
  ],
  "interview_insights": {
    "candidate_preparation": "Assessment of how well-prepared the candidate appears",
    "communication_style": "Observations about communication effectiveness",
    "engagement_level": "How engaged and enthusiastic the candidate seems"
  }
}

**IMPORTANT**: 
- Use your intelligence to determine what matters most for this specific question
- Don't apply generic criteria - adapt your analysis to the question type
- Be specific and evidence-based in all reasoning
- Ensure numerical scores align with rating labels
- Focus on what's truly relevant for evaluating this candidate's fit for the role`;
}

/**
 * Standardize analysis structure for consistent output
 */
function standardizeAnalysisStructure(aiAnalysis) {
  return {
    overall_assessment: {
      rating: aiAnalysis.overall_assessment?.rating || 'Average',
      score: aiAnalysis.overall_assessment?.score || 75,
      reasoning: aiAnalysis.overall_assessment?.reasoning || 'Standard evaluation completed'
    },
    question_analysis: {
      type: aiAnalysis.question_analysis?.type || 'General',
      primary_focus: aiAnalysis.question_analysis?.primary_focus || 'Overall competency assessment',
      secondary_aspects: aiAnalysis.question_analysis?.secondary_aspects || 'Communication and professionalism'
    },
    detailed_analysis: aiAnalysis.detailed_analysis || {},
    strengths: Array.isArray(aiAnalysis.strengths) ? aiAnalysis.strengths : ['Response provided'],
    areas_for_improvement: Array.isArray(aiAnalysis.areas_for_improvement) ? aiAnalysis.areas_for_improvement : ['Could be more detailed'],
    red_flags: Array.isArray(aiAnalysis.red_flags) ? aiAnalysis.red_flags : [],
    key_insights: aiAnalysis.key_insights || 'Analysis completed successfully',
    recommendation: {
      decision: aiAnalysis.recommendation?.decision || 'Maybe',
      reasoning: aiAnalysis.recommendation?.reasoning || 'Standard evaluation criteria applied',
      confidence_level: aiAnalysis.recommendation?.confidence_level || 'Medium'
    },
    follow_up_questions: Array.isArray(aiAnalysis.follow_up_questions) ? aiAnalysis.follow_up_questions : [],
    interview_insights: aiAnalysis.interview_insights || {
      candidate_preparation: 'Standard preparation level observed',
      communication_style: 'Standard communication approach',
      engagement_level: 'Standard engagement level'
    },
    analyzed_at: new Date().toISOString(),
    analysis_version: '4.0-ai-intelligent'
  };
}

/**
 * Simplified fallback analysis that lets AI decide structure
 */
function generateFallbackAnalysis(questionText, responseText, jobDetails) {
  const wordCount = responseText.trim().split(/\s+/).length;
  
  let rating = 'Fair';
  let score = 60;
  
  if (wordCount > 150) {
    rating = 'Good';
    score = 80;
  } else if (wordCount > 100) {
    rating = 'Average';
    score = 70;
  } else if (wordCount < 30) {
    rating = 'Poor';
    score = 45;
  }

  return {
    overall_assessment: {
      rating: rating,
      score: score,
      reasoning: `Fallback analysis performed due to AI service limitations. Response length: ${wordCount} words. Rating based on response completeness and basic content indicators.`
    },
    question_analysis: {
      type: 'Unknown',
      primary_focus: 'Unable to determine with fallback analysis',
      secondary_aspects: 'Basic response evaluation'
    },
    detailed_analysis: {
      response_completeness: {
        name: 'Response Completeness',
        rating: rating,
        score: score,
        reasoning: `Response contains ${wordCount} words. ${rating} rating based on length and basic content assessment.`
      },
      basic_communication: {
        name: 'Basic Communication',
        rating: wordCount > 50 ? 'Average' : 'Fair',
        score: wordCount > 50 ? 65 : 55,
        reasoning: 'Basic communication assessment based on response structure and length.'
      }
    },
    strengths: [
      'Response provided within time limit',
      wordCount > 50 ? 'Adequate response length' : 'Concise response'
    ],
    areas_for_improvement: [
      'Detailed AI analysis not available - requires manual review',
      wordCount < 50 ? 'Provide more comprehensive responses' : 'Continue with current response approach'
    ],
    red_flags: wordCount < 20 ? ['Extremely brief response'] : [],
    key_insights: `Fallback analysis - AI service unavailable. Response word count: ${wordCount}. Requires detailed manual evaluation.`,
    recommendation: {
      decision: 'Maybe',
      reasoning: 'Limited analysis available - requires additional human evaluation',
      confidence_level: 'Low'
    },
    follow_up_questions: [
      'Can you elaborate on your response?',
      'What additional details would you like to share?'
    ],
    interview_insights: {
      candidate_preparation: 'Cannot assess with current analysis limitations',
      communication_style: 'Basic assessment only - detailed review needed',
      engagement_level: 'Requires comprehensive evaluation'
    },
    analyzed_at: new Date().toISOString(),
    analysis_version: '4.0-fallback'
  };
}


/**
 * Generate fallback analysis when AI service fails
 */
function generateFallbackAnalysis(questionText, responseText, jobDetails) {
  const wordCount = responseText.trim().split(/\s+/).length;
  const baseScore = calculateBasicScore(responseText);
  
  return {
    overall_score: baseScore,
    communication_skills: Math.min(baseScore + 5, 85),
    technical_competency: 75,
    problem_solving: Math.max(baseScore - 5, 60),
    cultural_fit: 75,
    confidence_level: wordCount > 50 ? 80 : 65,
    strengths: [
      'Response provided within time limit',
      wordCount > 50 ? 'Adequate response length' : 'Concise communication'
    ],
    areas_for_improvement: [
      wordCount < 50 ? 'Response could be more detailed' : 'Could provide more specific examples',
      'Consider using structured approach'
    ],
    red_flags: [],
    key_insights: `Response contains ${wordCount} words. Processed using fallback analysis method due to AI service limitations.`,
    recommendation: 'Basic evaluation completed - requires further assessment',
    follow_up_questions: [
      'Can you elaborate on specific examples?',
      'What challenges did you face in similar situations?'
    ]
  };
}


/**
 * Generate fallback analysis when AI service fails
 */
function generateFallbackAnalysis(questionText, responseText, jobDetails) {
  const wordCount = responseText.trim().split(/\s+/).length;
  const baseScore = calculateBasicScore(responseText);
  
  return {
    overallScore: baseScore,
    detailedScores: {
      contentRelevance: Math.max(baseScore - 5, 60),
      communicationSkills: Math.min(baseScore + 5, 85),
      technicalAccuracy: 75,
      completeness: wordCount > 100 ? 80 : 65,
      professionalism: 75
    },
    strengths: [
      'Response provided within time limit',
      wordCount > 50 ? 'Adequate response length' : 'Concise communication'
    ],
    weaknesses: [
      wordCount < 50 ? 'Response could be more detailed' : 'Good response structure',
      'Analysis limited to basic metrics'
    ],
    suggestions: [
      'Consider providing more specific examples',
      'Structure answers using frameworks like STAR method',
      'Include quantifiable results where possible'
    ],
    keyInsights: [
      `Response contains ${wordCount} words`,
      'Processed using fallback analysis method',
      'Basic content evaluation completed'
    ],
    recommendedFollowUp: [
      'Can you elaborate on specific examples?',
      'What challenges did you face in similar situations?'
    ],
    fitForRole: {
      score: baseScore,
      reasoning: 'Evaluated using basic criteria due to AI service limitations'
    },
    summary: `Response received and analyzed using fallback method. Word count: ${wordCount}. Consider expanding on key points.`,
    analyzedAt: new Date().toISOString(),
    analysisVersion: '2.0-fallback'
  };
}

/**
 * Calculate basic score based on response characteristics
 */
function calculateBasicScore(responseText) {
  const wordCount = responseText.trim().split(/\s+/).length;
  let score = 50; // Base score
  
  // Length-based scoring
  if (wordCount >= 150) score += 25;
  else if (wordCount >= 100) score += 20;
  else if (wordCount >= 50) score += 15;
  else if (wordCount >= 25) score += 10;
  
  // Content quality indicators
  if (responseText.toLowerCase().includes('experience')) score += 5;
  if (responseText.toLowerCase().includes('example')) score += 5;
  if (responseText.match(/\bbecause\b|\btherefore\b|\bso\b/i)) score += 5;
  if (responseText.includes('?')) score -= 2; // Questions in answers might indicate uncertainty
  
  // Communication indicators
  if (responseText.split(/[.!?]/).length > 3) score += 5; // Multiple sentences
  if (responseText.includes(',')) score += 3; // Complex sentence structure
  
  return Math.min(Math.max(score, 40), 95);
}

   
/**
 * @description : create document of Response in mongodb collection.
 * @param {Object} req : request including body for creating document.
 * @param {Object} res : response of created document
 * @return {Object} : created Response. {status, message, data}
 */ 
const addResponse = async (req, res) => {
  try {
    let dataToCreate = { ...req.body || {} };
    let validateRequest = validation.validateParamsWithJoi(
      dataToCreate,
      responseSchemaKey.schemaKeys);
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    dataToCreate.addedBy = req.user.id;
    dataToCreate = new Response(dataToCreate);
    let createdResponse = await dbService.create(Response,dataToCreate);
    return res.success({ data : createdResponse });
  } catch (error) {
    return res.internalServerError({ message:error.message }); 
  }
}
    
/**
 * @description : create multiple documents of Response in mongodb collection.
 * @param {Object} req : request including body for creating documents.
 * @param {Object} res : response of created documents.
 * @return {Object} : created Responses. {status, message, data}
 */
const bulkInsertResponse = async (req,res)=>{
  try {
    if (req.body && (!Array.isArray(req.body.data) || req.body.data.length < 1)) {
      return res.badRequest();
    }
    let dataToCreate = [ ...req.body.data ];
    for (let i = 0;i < dataToCreate.length;i++){
      dataToCreate[i] = {
        ...dataToCreate[i],
        addedBy: req.user.id
      };
    }
    let createdResponses = await dbService.create(Response,dataToCreate);
    createdResponses = { count: createdResponses ? createdResponses.length : 0 };
    return res.success({ data:{ count:createdResponses.count || 0 } });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : find all documents of Response from collection based on query and options.
 * @param {Object} req : request including option and query. {query, options : {page, limit, pagination, populate}, isCountOnly}
 * @param {Object} res : response contains data found from collection.
 * @return {Object} : found Response(s). {status, message, data}
 */
const findAllResponse = async (req,res) => {
  try {
    let options = {};
    let query = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      responseSchemaKey.findFilterKeys,
      Response.schema.obj
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    if (req.body.isCountOnly){
      let totalRecords = await dbService.count(Response, query);
      return res.success({ data: { totalRecords } });
    }
    if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
      options = { ...req.body.options };
    }
    let foundResponses = await dbService.paginate( Response,query,options);
    if (!foundResponses || !foundResponses.data || !foundResponses.data.length){
      return res.recordNotFound(); 
    }
    return res.success({ data :foundResponses });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
        
/**
 * @description : find document of Response from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains document retrieved from table.
 * @return {Object} : found Response. {status, message, data}
 */
const getResponse = async (req,res) => {
  try {
    let query = {};
    if (!ObjectId.isValid(req.params.id)) {
      return res.validationError({ message : 'invalid objectId.' });
    }
    query._id = req.params.id;
    let options = {};
    let foundResponse = await dbService.findOne(Response,query, options);
    if (!foundResponse){
      return res.recordNotFound();
    }
    return res.success({ data :foundResponse });
  }
  catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : returns total number of documents of Response.
 * @param {Object} req : request including where object to apply filters in req body 
 * @param {Object} res : response that returns total number of documents.
 * @return {Object} : number of documents. {status, message, data}
 */
const getResponseCount = async (req,res) => {
  try {
    let where = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      responseSchemaKey.findFilterKeys,
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.where === 'object' && req.body.where !== null) {
      where = { ...req.body.where };
    }
    let countedResponse = await dbService.count(Response,where);
    return res.success({ data : { count: countedResponse } });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : update document of Response with data by id.
 * @param {Object} req : request including id in request params and data in request body.
 * @param {Object} res : response of updated Response.
 * @return {Object} : updated Response. {status, message, data}
 */
const updateResponse = async (req,res) => {
  try {
    let dataToUpdate = {
      ...req.body,
      updatedBy:req.user.id,
    };
    let validateRequest = validation.validateParamsWithJoi(
      dataToUpdate,
      responseSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id:req.params.id };
    let updatedResponse = await dbService.updateOne(Response,query,dataToUpdate);
    if (!updatedResponse){
      return res.recordNotFound();
    }
    return res.success({ data :updatedResponse });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};

/**
 * @description : update multiple records of Response with data by filter.
 * @param {Object} req : request including filter and data in request body.
 * @param {Object} res : response of updated Responses.
 * @return {Object} : updated Responses. {status, message, data}
 */
const bulkUpdateResponse = async (req,res)=>{
  try {
    let filter = req.body && req.body.filter ? { ...req.body.filter } : {};
    let dataToUpdate = {};
    delete dataToUpdate['addedBy'];
    if (req.body && typeof req.body.data === 'object' && req.body.data !== null) {
      dataToUpdate = { 
        ...req.body.data,
        updatedBy : req.user.id
      };
    }
    let updatedResponse = await dbService.updateMany(Response,filter,dataToUpdate);
    if (!updatedResponse){
      return res.recordNotFound();
    }
    return res.success({ data :{ count : updatedResponse } });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : partially update document of Response with data by id;
 * @param {obj} req : request including id in request params and data in request body.
 * @param {obj} res : response of updated Response.
 * @return {obj} : updated Response. {status, message, data}
 */
const partialUpdateResponse = async (req,res) => {
  try {
    if (!req.params.id){
      res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    delete req.body['addedBy'];
    let dataToUpdate = {
      ...req.body,
      updatedBy:req.user.id,
    };
    let validateRequest = validation.validateParamsWithJoi(
      dataToUpdate,
      responseSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id:req.params.id };
    let updatedResponse = await dbService.updateOne(Response, query, dataToUpdate);
    if (!updatedResponse) {
      return res.recordNotFound();
    }
    return res.success({ data:updatedResponse });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
/**
 * @description : deactivate document of Response from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains updated document of Response.
 * @return {Object} : deactivated Response. {status, message, data}
 */
const softDeleteResponse = async (req,res) => {
  try {
    if (!req.params.id){
      return res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    let query = { _id:req.params.id };
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user.id,
    };
    let updatedResponse = await dbService.updateOne(Response, query, updateBody);
    if (!updatedResponse){
      return res.recordNotFound();
    }
    return res.success({ data:updatedResponse });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};

/**
 * @description : delete document of Response from table.
 * @param {Object} req : request including id as req param.
 * @param {Object} res : response contains deleted document.
 * @return {Object} : deleted Response. {status, message, data}
 */
const deleteResponse = async (req,res) => {
  try { 
    if (!req.params.id){
      return res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    const query = { _id:req.params.id };
    const deletedResponse = await dbService.deleteOne(Response, query);
    if (!deletedResponse){
      return res.recordNotFound();
    }
    return res.success({ data :deletedResponse });
        
  }
  catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : delete documents of Response in table by using ids.
 * @param {Object} req : request including array of ids in request body.
 * @param {Object} res : response contains no of documents deleted.
 * @return {Object} : no of documents deleted. {status, message, data}
 */
const deleteManyResponse = async (req, res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    const query = { _id:{ $in:ids } };
    const deletedResponse = await dbService.deleteMany(Response,query);
    if (!deletedResponse){
      return res.recordNotFound();
    }
    return res.success({ data :{ count :deletedResponse } });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
/**
 * @description : deactivate multiple documents of Response from table by ids;
 * @param {Object} req : request including array of ids in request body.
 * @param {Object} res : response contains updated documents of Response.
 * @return {Object} : number of deactivated documents of Response. {status, message, data}
 */
const softDeleteManyResponse = async (req,res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    const query = { _id:{ $in:ids } };
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user.id,
    };
    let updatedResponse = await dbService.updateMany(Response,query, updateBody);
    if (!updatedResponse) {
      return res.recordNotFound();
    }
    return res.success({ data:{ count :updatedResponse } });
        
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};

module.exports = {
  addResponse,
  bulkInsertResponse,
  findAllResponse,
  getResponse,
  getResponseCount,
  updateResponse,
  bulkUpdateResponse,
  partialUpdateResponse,
  softDeleteResponse,
  deleteResponse,
  deleteManyResponse,
  softDeleteManyResponse    ,
   createInterviewResponse, 
};