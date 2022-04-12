const router = require('express').Router()
const passport = require('passport')

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
let CLIENT_URL =
  process.env.NODE_ENV !== 'production'
    ? 'http://localhost:3000/redirect'
    : 'https://www.openshill.com/redirect'

router.get('/login/success', (req, res) => {
  if (req.user) {
    res.status(200).json({
      success: true,
      message: 'successfull',
      user: req.user,
      //   cookies: req.cookies
    })
  } else {
    res.send('failed')
  }
})

router.get('/login/failed', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'failure',
  })
})

router.get('/logout', (req, res) => {
  req.logout()
  res.redirect(CLIENT_URL)
})

router.get('/twitter', passport.authenticate('twitter', { scope: ['profile'] }))

router.get(
  '/twitter/callback',
  passport.authenticate('twitter', {
    successRedirect: CLIENT_URL,
    failureRedirect: '/login/failed',
  }),
)

module.exports = router
