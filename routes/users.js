const router = require('express-promise-router')()
const UsersController = require('../controllers/users')

router.route('/get').get(UsersController.get)
router.route('/getByUsername').get(UsersController.getByUsername)
router.route('/getUserWithAllClaims').get(UsersController.getUserWithAllClaims)
router.route('/post').post(UsersController.post)
router.route('/updateUser').put(UsersController.updateUser)
router.route('/delete').get(UsersController.delete)

router.route('/calculateRewards').get(UsersController.calculateRewards)
router.route('/calculateCompetitionPoints').get(UsersController.calculateCompetitionPoints)

router.route('/getLuckyDrawTickets').get(UsersController.getLuckyDrawTickets)
router.route('/getLuckyDrawResult').get(UsersController.getLuckyDrawResult)

module.exports = router
