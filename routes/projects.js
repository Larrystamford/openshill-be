const router = require('express-promise-router')()
const ProjectsController = require('../controllers/projects')

router.route('/get').get(ProjectsController.getProjects)
router
  .route('/getByProjectUnqiueName')
  .get(ProjectsController.getByProjectUnqiueName)
router.route('/create').post(ProjectsController.createProject)
router.route('/getWhitelist').post(ProjectsController.addToWhitelist)
router.route('/addToWhitelist').post(ProjectsController.addToWhitelist)
router.route('/test').get(ProjectsController.test)

module.exports = router
