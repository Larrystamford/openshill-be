const router = require('express-promise-router')()
const ProjectsController = require('../controllers/projects')

router.route('/getProjects').get(ProjectsController.getProjects)
router
  .route('/getByProjectByUserName')
  .get(ProjectsController.getByProjectByUserName)
router.route('/getTopUserClaims').get(ProjectsController.getTopUserClaims)
router
  .route('/getCompoundCompetitonClaims')
  .get(ProjectsController.getCompoundCompetitonClaims)
router
  .route('/getIndividualCompetitonClaims')
  .get(ProjectsController.getIndividualCompetitonClaims)
router.route('/createProject').get(ProjectsController.createProject) // TODO: change to post request when bug figured out
router.route('/getWhitelist').post(ProjectsController.addToWhitelist)
router.route('/addToWhitelist').post(ProjectsController.addToWhitelist)
router.route('/updateProject').put(ProjectsController.updateProject)
// router.route('/test').get(ProjectsController.test)

module.exports = router
