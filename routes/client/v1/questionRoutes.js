/**
 * questionRoutes.js
 * @description :: CRUD API routes for question
 */

const express = require('express');
const router = express.Router();
const questionController = require("../../../controller/client/v1/questionController")
const { PLATFORM } =  require("../../../constants/authConstant"); 
const auth = require("../../../middleware/auth");
const checkRolePermission = require('../../../middleware/checkRolePermission');

router.route("/client/api/v1/question/create").post(auth(PLATFORM.CLIENT),checkRolePermission,questionController.addQuestion);
router.route("/client/api/v1/question/list").post(auth(PLATFORM.CLIENT),checkRolePermission,questionController.findAllQuestion);
router.route("/client/api/v1/question/count").post(auth(PLATFORM.CLIENT),checkRolePermission,questionController.getQuestionCount);
router.route("/client/api/v1/question/:id").get(auth(PLATFORM.CLIENT),checkRolePermission,questionController.getQuestion);
router.route("/client/api/v1/question/update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,questionController.updateQuestion);    
router.route("/client/api/v1/question/partial-update/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,questionController.partialUpdateQuestion);
router.route("/client/api/v1/question/softDelete/:id").put(auth(PLATFORM.CLIENT),checkRolePermission,questionController.softDeleteQuestion);
router.route("/client/api/v1/question/softDeleteMany").put(auth(PLATFORM.CLIENT),checkRolePermission,questionController.softDeleteManyQuestion);
router.route("/client/api/v1/question/addBulk").post(auth(PLATFORM.CLIENT),checkRolePermission,questionController.bulkInsertQuestion);
router.route("/client/api/v1/question/updateBulk").put(auth(PLATFORM.CLIENT),checkRolePermission,questionController.bulkUpdateQuestion);
router.route("/client/api/v1/question/delete/:id").delete(auth(PLATFORM.CLIENT),checkRolePermission,questionController.deleteQuestion);
router.route("/client/api/v1/question/deleteMany").post(auth(PLATFORM.CLIENT),checkRolePermission,questionController.deleteManyQuestion);

module.exports = router;
