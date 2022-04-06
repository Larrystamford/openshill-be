const router = require('express-promise-router')()
const UsersController = require('../controllers/users')

router.route('/get').get(UsersController.get)
router.route('/getByUsername').get(UsersController.getByUsername)
router.route('/post').post(UsersController.post)
router.route('/update').post(UsersController.update)
router.route('/delete').get(UsersController.delete)

module.exports = router
