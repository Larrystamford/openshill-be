const express = require('express')
const cors = require('cors')

const cookieSession = require('cookie-session')
const passportSetup = require('./passport')
const passport = require('passport')
const auth = require('./routes/auth')

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const app = express()

app.use(express.json())
// app.use(express.urlencoded({ extended: true }))
app.use(
  cookieSession({
    name: 'session',
    keys: ['generateprivatekeys'],
    maxAge: 300 * 24 * 60 * 60 * 100,
  }),
)
app.use(passport.initialize())
app.use(passport.session())

const originURL =
  process.env.NODE_ENV !== 'production'
    ? 'http://localhost:3000'
    : 'https://www.openshill.com'

app.use(
  cors({
    origin: originURL,
    credentials: true,
    methods: 'GET,POST,PUT,DELETE',
  }),
)

app.get('/', async (req, res) => {
  res.send({ v1: 'usa version' })
})
app.use('/v1/users', require('./routes/users'))
app.use('/v1/auth', require('./routes/auth'))
app.use('/v1/projects', require('./routes/projects'))
app.use('/v1/walletToUser', require('./routes/walletToUser'))

const port = process.env.PORT || 5000
app.listen(port, () => console.log('Running on port 5000'))
