/**
 * deleteDependent.js
 * @description :: exports deleteDependent service for project.
 */

let Response = require('../model/response');
let Application = require('../model/application');
let Question = require('../model/question');
let Job = require('../model/job');
let Recruiter = require('../model/recruiter');
let User = require('../model/user');
let PushNotification = require('../model/pushNotification');
let UserTokens = require('../model/userTokens');
let ActivityLog = require('../model/activityLog');
let Role = require('../model/role');
let ProjectRoute = require('../model/projectRoute');
let RouteRole = require('../model/routeRole');
let UserRole = require('../model/userRole');
let dbService = require('.//dbService');

const deleteResponse = async (filter) =>{
  try {
    let response  = await dbService.deleteMany(Response,filter);
    return response;
  } catch (error){
    throw new Error(error.message);
  }
};

const deleteApplication = async (filter) =>{
  try {
    let response  = await dbService.deleteMany(Application,filter);
    return response;
  } catch (error){
    throw new Error(error.message);
  }
};

const deleteQuestion = async (filter) =>{
  try {
    let response  = await dbService.deleteMany(Question,filter);
    return response;
  } catch (error){
    throw new Error(error.message);
  }
};

const deleteJob = async (filter) =>{
  try {
    let job = await dbService.findMany(Job,filter);
    if (job && job.length){
      job = job.map((obj) => obj.id);

      const applicationFilter = { $or: [{ job : { $in : job } }] };
      const applicationCnt = await dbService.deleteMany(Application,applicationFilter);

      let deleted  = await dbService.deleteMany(Job,filter);
      let response = { application :applicationCnt, };
      return response; 
    } else {
      return {  job : 0 };
    }

  } catch (error){
    throw new Error(error.message);
  }
};

const deleteRecruiter = async (filter) =>{
  try {
    let response  = await dbService.deleteMany(Recruiter,filter);
    return response;
  } catch (error){
    throw new Error(error.message);
  }
};

const deleteUser = async (filter) =>{
  try {
    let user = await dbService.findMany(User,filter);
    if (user && user.length){
      user = user.map((obj) => obj.id);

      const responseFilter = { $or: [{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const responseCnt = await dbService.deleteMany(Response,responseFilter);

      const applicationFilter = { $or: [{ user : { $in : user } },{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const applicationCnt = await dbService.deleteMany(Application,applicationFilter);

      const questionFilter = { $or: [{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const questionCnt = await dbService.deleteMany(Question,questionFilter);

      const jobFilter = { $or: [{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const jobCnt = await dbService.deleteMany(Job,jobFilter);

      const recruiterFilter = { $or: [{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const recruiterCnt = await dbService.deleteMany(Recruiter,recruiterFilter);

      const userFilter = { $or: [{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const userCnt = await dbService.deleteMany(User,userFilter);

      const userTokensFilter = { $or: [{ userId : { $in : user } },{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const userTokensCnt = await dbService.deleteMany(UserTokens,userTokensFilter);

      const roleFilter = { $or: [{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const roleCnt = await dbService.deleteMany(Role,roleFilter);

      const projectRouteFilter = { $or: [{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const projectRouteCnt = await dbService.deleteMany(ProjectRoute,projectRouteFilter);

      const routeRoleFilter = { $or: [{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const routeRoleCnt = await dbService.deleteMany(RouteRole,routeRoleFilter);

      const userRoleFilter = { $or: [{ userId : { $in : user } },{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const userRoleCnt = await dbService.deleteMany(UserRole,userRoleFilter);

      let deleted  = await dbService.deleteMany(User,filter);
      let response = {
        response :responseCnt,
        application :applicationCnt,
        question :questionCnt,
        job :jobCnt,
        recruiter :recruiterCnt,
        user :userCnt + deleted,
        userTokens :userTokensCnt,
        role :roleCnt,
        projectRoute :projectRouteCnt,
        routeRole :routeRoleCnt,
        userRole :userRoleCnt,
      };
      return response; 
    } else {
      return {  user : 0 };
    }

  } catch (error){
    throw new Error(error.message);
  }
};

const deletePushNotification = async (filter) =>{
  try {
    let response  = await dbService.deleteMany(PushNotification,filter);
    return response;
  } catch (error){
    throw new Error(error.message);
  }
};

const deleteUserTokens = async (filter) =>{
  try {
    let response  = await dbService.deleteMany(UserTokens,filter);
    return response;
  } catch (error){
    throw new Error(error.message);
  }
};

const deleteActivityLog = async (filter) =>{
  try {
    let response  = await dbService.deleteMany(ActivityLog,filter);
    return response;
  } catch (error){
    throw new Error(error.message);
  }
};

const deleteRole = async (filter) =>{
  try {
    let role = await dbService.findMany(Role,filter);
    if (role && role.length){
      role = role.map((obj) => obj.id);

      const routeRoleFilter = { $or: [{ roleId : { $in : role } }] };
      const routeRoleCnt = await dbService.deleteMany(RouteRole,routeRoleFilter);

      const userRoleFilter = { $or: [{ roleId : { $in : role } }] };
      const userRoleCnt = await dbService.deleteMany(UserRole,userRoleFilter);

      let deleted  = await dbService.deleteMany(Role,filter);
      let response = {
        routeRole :routeRoleCnt,
        userRole :userRoleCnt,
      };
      return response; 
    } else {
      return {  role : 0 };
    }

  } catch (error){
    throw new Error(error.message);
  }
};

const deleteProjectRoute = async (filter) =>{
  try {
    let projectroute = await dbService.findMany(ProjectRoute,filter);
    if (projectroute && projectroute.length){
      projectroute = projectroute.map((obj) => obj.id);

      const routeRoleFilter = { $or: [{ routeId : { $in : projectroute } }] };
      const routeRoleCnt = await dbService.deleteMany(RouteRole,routeRoleFilter);

      let deleted  = await dbService.deleteMany(ProjectRoute,filter);
      let response = { routeRole :routeRoleCnt, };
      return response; 
    } else {
      return {  projectroute : 0 };
    }

  } catch (error){
    throw new Error(error.message);
  }
};

const deleteRouteRole = async (filter) =>{
  try {
    let response  = await dbService.deleteMany(RouteRole,filter);
    return response;
  } catch (error){
    throw new Error(error.message);
  }
};

const deleteUserRole = async (filter) =>{
  try {
    let response  = await dbService.deleteMany(UserRole,filter);
    return response;
  } catch (error){
    throw new Error(error.message);
  }
};

const countResponse = async (filter) =>{
  try {
    const responseCnt =  await dbService.count(Response,filter);
    return { response : responseCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

const countApplication = async (filter) =>{
  try {
    const applicationCnt =  await dbService.count(Application,filter);
    return { application : applicationCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

const countQuestion = async (filter) =>{
  try {
    const questionCnt =  await dbService.count(Question,filter);
    return { question : questionCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

const countJob = async (filter) =>{
  try {
    let job = await dbService.findMany(Job,filter);
    if (job && job.length){
      job = job.map((obj) => obj.id);

      const applicationFilter = { $or: [{ job : { $in : job } }] };
      const applicationCnt =  await dbService.count(Application,applicationFilter);

      let response = { application : applicationCnt, };
      return response; 
    } else {
      return {  job : 0 };
    }
  } catch (error){
    throw new Error(error.message);
  }
};

const countRecruiter = async (filter) =>{
  try {
    const recruiterCnt =  await dbService.count(Recruiter,filter);
    return { recruiter : recruiterCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

const countUser = async (filter) =>{
  try {
    let user = await dbService.findMany(User,filter);
    if (user && user.length){
      user = user.map((obj) => obj.id);

      const responseFilter = { $or: [{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const responseCnt =  await dbService.count(Response,responseFilter);

      const applicationFilter = { $or: [{ user : { $in : user } },{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const applicationCnt =  await dbService.count(Application,applicationFilter);

      const questionFilter = { $or: [{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const questionCnt =  await dbService.count(Question,questionFilter);

      const jobFilter = { $or: [{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const jobCnt =  await dbService.count(Job,jobFilter);

      const recruiterFilter = { $or: [{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const recruiterCnt =  await dbService.count(Recruiter,recruiterFilter);

      const userFilter = { $or: [{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const userCnt =  await dbService.count(User,userFilter);

      const userTokensFilter = { $or: [{ userId : { $in : user } },{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const userTokensCnt =  await dbService.count(UserTokens,userTokensFilter);

      const roleFilter = { $or: [{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const roleCnt =  await dbService.count(Role,roleFilter);

      const projectRouteFilter = { $or: [{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const projectRouteCnt =  await dbService.count(ProjectRoute,projectRouteFilter);

      const routeRoleFilter = { $or: [{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const routeRoleCnt =  await dbService.count(RouteRole,routeRoleFilter);

      const userRoleFilter = { $or: [{ userId : { $in : user } },{ addedBy : { $in : user } },{ updatedBy : { $in : user } }] };
      const userRoleCnt =  await dbService.count(UserRole,userRoleFilter);

      let response = {
        response : responseCnt,
        application : applicationCnt,
        question : questionCnt,
        job : jobCnt,
        recruiter : recruiterCnt,
        user : userCnt,
        userTokens : userTokensCnt,
        role : roleCnt,
        projectRoute : projectRouteCnt,
        routeRole : routeRoleCnt,
        userRole : userRoleCnt,
      };
      return response; 
    } else {
      return {  user : 0 };
    }
  } catch (error){
    throw new Error(error.message);
  }
};

const countPushNotification = async (filter) =>{
  try {
    const pushNotificationCnt =  await dbService.count(PushNotification,filter);
    return { pushNotification : pushNotificationCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

const countUserTokens = async (filter) =>{
  try {
    const userTokensCnt =  await dbService.count(UserTokens,filter);
    return { userTokens : userTokensCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

const countActivityLog = async (filter) =>{
  try {
    const activityLogCnt =  await dbService.count(ActivityLog,filter);
    return { activityLog : activityLogCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

const countRole = async (filter) =>{
  try {
    let role = await dbService.findMany(Role,filter);
    if (role && role.length){
      role = role.map((obj) => obj.id);

      const routeRoleFilter = { $or: [{ roleId : { $in : role } }] };
      const routeRoleCnt =  await dbService.count(RouteRole,routeRoleFilter);

      const userRoleFilter = { $or: [{ roleId : { $in : role } }] };
      const userRoleCnt =  await dbService.count(UserRole,userRoleFilter);

      let response = {
        routeRole : routeRoleCnt,
        userRole : userRoleCnt,
      };
      return response; 
    } else {
      return {  role : 0 };
    }
  } catch (error){
    throw new Error(error.message);
  }
};

const countProjectRoute = async (filter) =>{
  try {
    let projectroute = await dbService.findMany(ProjectRoute,filter);
    if (projectroute && projectroute.length){
      projectroute = projectroute.map((obj) => obj.id);

      const routeRoleFilter = { $or: [{ routeId : { $in : projectroute } }] };
      const routeRoleCnt =  await dbService.count(RouteRole,routeRoleFilter);

      let response = { routeRole : routeRoleCnt, };
      return response; 
    } else {
      return {  projectroute : 0 };
    }
  } catch (error){
    throw new Error(error.message);
  }
};

const countRouteRole = async (filter) =>{
  try {
    const routeRoleCnt =  await dbService.count(RouteRole,filter);
    return { routeRole : routeRoleCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

const countUserRole = async (filter) =>{
  try {
    const userRoleCnt =  await dbService.count(UserRole,filter);
    return { userRole : userRoleCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

const softDeleteResponse = async (filter,updateBody) =>{  
  try {
    const responseCnt =  await dbService.updateMany(Response,filter);
    return { response : responseCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

const softDeleteApplication = async (filter,updateBody) =>{  
  try {
    const applicationCnt =  await dbService.updateMany(Application,filter);
    return { application : applicationCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

const softDeleteQuestion = async (filter,updateBody) =>{  
  try {
    const questionCnt =  await dbService.updateMany(Question,filter);
    return { question : questionCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

const softDeleteJob = async (filter,updateBody) =>{  
  try {
    let job = await dbService.findMany(Job,filter, { id:1 });
    if (job.length){
      job = job.map((obj) => obj.id);

      const applicationFilter = { '$or': [{ job : { '$in' : job } }] };
      const applicationCnt = await dbService.updateMany(Application,applicationFilter,updateBody);
      let updated = await dbService.updateMany(Job,filter,updateBody);

      let response = { application :applicationCnt, };
      return response;
    } else {
      return {  job : 0 };
    }
  } catch (error){
    throw new Error(error.message);
  }
};

const softDeleteRecruiter = async (filter,updateBody) =>{  
  try {
    const recruiterCnt =  await dbService.updateMany(Recruiter,filter);
    return { recruiter : recruiterCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

const softDeleteUser = async (filter,updateBody) =>{  
  try {
    let user = await dbService.findMany(User,filter, { id:1 });
    if (user.length){
      user = user.map((obj) => obj.id);

      const responseFilter = { '$or': [{ addedBy : { '$in' : user } },{ updatedBy : { '$in' : user } }] };
      const responseCnt = await dbService.updateMany(Response,responseFilter,updateBody);

      const applicationFilter = { '$or': [{ user : { '$in' : user } },{ addedBy : { '$in' : user } },{ updatedBy : { '$in' : user } }] };
      const applicationCnt = await dbService.updateMany(Application,applicationFilter,updateBody);

      const questionFilter = { '$or': [{ addedBy : { '$in' : user } },{ updatedBy : { '$in' : user } }] };
      const questionCnt = await dbService.updateMany(Question,questionFilter,updateBody);

      const jobFilter = { '$or': [{ addedBy : { '$in' : user } },{ updatedBy : { '$in' : user } }] };
      const jobCnt = await dbService.updateMany(Job,jobFilter,updateBody);

      const recruiterFilter = { '$or': [{ addedBy : { '$in' : user } },{ updatedBy : { '$in' : user } }] };
      const recruiterCnt = await dbService.updateMany(Recruiter,recruiterFilter,updateBody);

      const userFilter = { '$or': [{ addedBy : { '$in' : user } },{ updatedBy : { '$in' : user } }] };
      const userCnt = await dbService.updateMany(User,userFilter,updateBody);

      const userTokensFilter = { '$or': [{ userId : { '$in' : user } },{ addedBy : { '$in' : user } },{ updatedBy : { '$in' : user } }] };
      const userTokensCnt = await dbService.updateMany(UserTokens,userTokensFilter,updateBody);

      const roleFilter = { '$or': [{ addedBy : { '$in' : user } },{ updatedBy : { '$in' : user } }] };
      const roleCnt = await dbService.updateMany(Role,roleFilter,updateBody);

      const projectRouteFilter = { '$or': [{ addedBy : { '$in' : user } },{ updatedBy : { '$in' : user } }] };
      const projectRouteCnt = await dbService.updateMany(ProjectRoute,projectRouteFilter,updateBody);

      const routeRoleFilter = { '$or': [{ addedBy : { '$in' : user } },{ updatedBy : { '$in' : user } }] };
      const routeRoleCnt = await dbService.updateMany(RouteRole,routeRoleFilter,updateBody);

      const userRoleFilter = { '$or': [{ userId : { '$in' : user } },{ addedBy : { '$in' : user } },{ updatedBy : { '$in' : user } }] };
      const userRoleCnt = await dbService.updateMany(UserRole,userRoleFilter,updateBody);
      let updated = await dbService.updateMany(User,filter,updateBody);

      let response = {
        response :responseCnt,
        application :applicationCnt,
        question :questionCnt,
        job :jobCnt,
        recruiter :recruiterCnt,
        user :userCnt + updated,
        userTokens :userTokensCnt,
        role :roleCnt,
        projectRoute :projectRouteCnt,
        routeRole :routeRoleCnt,
        userRole :userRoleCnt,
      };
      return response;
    } else {
      return {  user : 0 };
    }
  } catch (error){
    throw new Error(error.message);
  }
};

const softDeletePushNotification = async (filter,updateBody) =>{  
  try {
    const pushNotificationCnt =  await dbService.updateMany(PushNotification,filter);
    return { pushNotification : pushNotificationCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

const softDeleteUserTokens = async (filter,updateBody) =>{  
  try {
    const userTokensCnt =  await dbService.updateMany(UserTokens,filter);
    return { userTokens : userTokensCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

const softDeleteActivityLog = async (filter,updateBody) =>{  
  try {
    const activityLogCnt =  await dbService.updateMany(ActivityLog,filter);
    return { activityLog : activityLogCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

const softDeleteRole = async (filter,updateBody) =>{  
  try {
    let role = await dbService.findMany(Role,filter, { id:1 });
    if (role.length){
      role = role.map((obj) => obj.id);

      const routeRoleFilter = { '$or': [{ roleId : { '$in' : role } }] };
      const routeRoleCnt = await dbService.updateMany(RouteRole,routeRoleFilter,updateBody);

      const userRoleFilter = { '$or': [{ roleId : { '$in' : role } }] };
      const userRoleCnt = await dbService.updateMany(UserRole,userRoleFilter,updateBody);
      let updated = await dbService.updateMany(Role,filter,updateBody);

      let response = {
        routeRole :routeRoleCnt,
        userRole :userRoleCnt,
      };
      return response;
    } else {
      return {  role : 0 };
    }
  } catch (error){
    throw new Error(error.message);
  }
};

const softDeleteProjectRoute = async (filter,updateBody) =>{  
  try {
    let projectroute = await dbService.findMany(ProjectRoute,filter, { id:1 });
    if (projectroute.length){
      projectroute = projectroute.map((obj) => obj.id);

      const routeRoleFilter = { '$or': [{ routeId : { '$in' : projectroute } }] };
      const routeRoleCnt = await dbService.updateMany(RouteRole,routeRoleFilter,updateBody);
      let updated = await dbService.updateMany(ProjectRoute,filter,updateBody);

      let response = { routeRole :routeRoleCnt, };
      return response;
    } else {
      return {  projectroute : 0 };
    }
  } catch (error){
    throw new Error(error.message);
  }
};

const softDeleteRouteRole = async (filter,updateBody) =>{  
  try {
    const routeRoleCnt =  await dbService.updateMany(RouteRole,filter);
    return { routeRole : routeRoleCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

const softDeleteUserRole = async (filter,updateBody) =>{  
  try {
    const userRoleCnt =  await dbService.updateMany(UserRole,filter);
    return { userRole : userRoleCnt };
  } catch (error){
    throw new Error(error.message);
  }
};

module.exports = {
  deleteResponse,
  deleteApplication,
  deleteQuestion,
  deleteJob,
  deleteRecruiter,
  deleteUser,
  deletePushNotification,
  deleteUserTokens,
  deleteActivityLog,
  deleteRole,
  deleteProjectRoute,
  deleteRouteRole,
  deleteUserRole,
  countResponse,
  countApplication,
  countQuestion,
  countJob,
  countRecruiter,
  countUser,
  countPushNotification,
  countUserTokens,
  countActivityLog,
  countRole,
  countProjectRoute,
  countRouteRole,
  countUserRole,
  softDeleteResponse,
  softDeleteApplication,
  softDeleteQuestion,
  softDeleteJob,
  softDeleteRecruiter,
  softDeleteUser,
  softDeletePushNotification,
  softDeleteUserTokens,
  softDeleteActivityLog,
  softDeleteRole,
  softDeleteProjectRoute,
  softDeleteRouteRole,
  softDeleteUserRole,
};
