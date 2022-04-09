const TwitterStrategy = require('passport-twitter').Strategy
const passport = require('passport')
const _ = require('lodash/core')
require('dotenv').config()

const {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
} = require('firebase/firestore')

const { usersModel } = require('./models/users')
const db = require('./firebase-config')

passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callbackURL: '/v1/auth/twitter/callback',
    },
    async (token, tokenSecret, profile, cb) => {
      let ref = collection(db, 'users')
      const q = query(ref, where('twitterId', '==', profile.id))
      const querySnapshot = await getDocs(q)
      let existingDocId = ''
      let existingDoc = {}
      querySnapshot.forEach((doc) => {
        existingDocId = doc.id
        existingDoc = doc.data()
      })

      let user = {}
      if (_.isEmpty(existingDoc)) {
        const docRef = await addDoc(collection(db, 'users'), {
          ...usersModel,
          name: profile._json.name,
          twitterId: profile.id,
          twitterUsername: profile.username,
          twitterProfilePic: profile._json.profile_image_url_https,
          twitterProfilePicBackground: profile._json.profile_banner_url,
          walletsAddress: '',
          amountEarned: 0,
          amountClaimed: 0,
          location: profile._json.location,
          twitterDescription: profile._json.description,
        })
        const docSnap = await getDoc(docRef) // get snapshot, docSnap.data() get data, docSnap.id get id
        existingDocId = docSnap.id
      } else {
        const ref = doc(db, 'users', existingDocId)
        await updateDoc(ref, {
          name: profile._json.name,
          twitterId: profile.id,
          twitterUsername: profile.username,
          twitterProfilePic: profile._json.profile_image_url_https,
          twitterProfilePicBackground: profile._json.profile_banner_url,
          location: profile._json.location,
          twitterDescription: profile._json.description,
        })
      }

      ref = doc(db, 'users', existingDocId)
      const docSnap = await getDoc(ref)

      if (docSnap.exists()) {
        user = docSnap.data()
        user.id = docSnap.id
      } else {
        console.log('No such user!')
      }

      cb(null, user)
    },
  ),
)

passport.serializeUser((user, cb) => {
  cb(null, user.id) // serialize doc id
})

passport.deserializeUser(async (id, cb) => {
  const ref = doc(db, 'users', id)
  const docSnap = await getDoc(ref)
  let user = {}
  if (docSnap.exists()) {
    user = docSnap.data()
    user.id = id
  } else {
    console.log('No such user!')
  }
  cb(null, user)
})
