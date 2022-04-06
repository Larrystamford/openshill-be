const router = require('express-promise-router')()
const WalletToUserController = require('../controllers/walletToUser')

router.route('/get').get(WalletToUserController.get)
router
  .route('/getUsernameByWalletAddress')
  .get(WalletToUserController.getUsernameByWalletAddress)
router
  .route('/getWalletAddressByUsername')
  .get(WalletToUserController.getWalletAddressByUsername)
router.route('/post').post(WalletToUserController.post)
router.route('/update').post(WalletToUserController.update)
router.route('/delete').post(WalletToUserController.delete)

module.exports = router
