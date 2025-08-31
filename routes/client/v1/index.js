/**
 * index.js
 * @description :: index route file of client platform.
 */

const express =  require("express")
const router =  express.Router()
router.use("/client/auth",require("./auth"));
router.use(require("./creditRoutes"));
router.use(require("./paymentRoutes"));
router.use(require("./planRoutes"));
router.use(require("./purchaseRoutes"));
router.use(require("./invitationsRoutes"));
router.use(require("./workspaceRoutes"));
router.use(require("./responseRoutes"));
router.use(require("./applicationRoutes"));
router.use(require("./questionRoutes"));
router.use(require("./jobRoutes"));
router.use(require("./recruiterRoutes"));
router.use(require("./userRoutes"));
router.use(require("./roleRoutes"));
router.use(require("./projectRouteRoutes"));
router.use(require("./routeRoleRoutes"));
router.use(require("./userRoleRoutes"));
router.use(require("./uploadRoutes"));

module.exports = router;
