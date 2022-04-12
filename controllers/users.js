const db = require('../firebase-config')
const {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  setDoc,
  updateDoc,
  doc,
  query,
  where,
  arrayUnion,
  arrayRemove,
  increment,
} = require('firebase/firestore')
const { usersModel } = require('../models/users')
const { tweetsModel } = require('../models/tweets')
const { userClaimsModel } = require('../models/userClaims')
const { internalModel } = require('../models/internal')

const axios = require('axios')

module.exports = {
  get: async (req, res, next) => {
    const querySnapshot = await getDocs(collection(db, 'users'))
    const list = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    res.send(list)
  },
  getUserWithAllClaims: async (req, res, next) => {
    if (req.user) {
      const userClaimsRef = collection(db, 'userClaims')
      const q = query(
        userClaimsRef,
        where('claimerUsername', '==', req.user.twitterUsername),
      )
      let projectClaims = []
      const querySnapshot = await getDocs(q)
      querySnapshot.forEach((doc) => {
        projectClaims.push(doc.data())
      })

      res.send({ status: 200, data: req.user, projectClaims: projectClaims })
    } else {
      res.send({ status: 404 })
    }
  },
  getByUsername: async (req, res, next) => {
    const { username } = req.query
    const ref = collection(db, 'users')
    const q = query(ref, where('username', '==', username))

    const querySnapshot = await getDocs(q)
    querySnapshot.forEach((doc) => {
      //   console.log(doc.ref) // how to convert query back to ref
      res.send({ id: doc.id, ...doc.data() })
    })
    res.send({ id: '' })
  },
  post: async (req, res, next) => {
    try {
      const docRef = await addDoc(collection(db, 'users'), {
        ...usersModel,
        ...req.body,
      })

      res.send({ id: docRef.id })
    } catch (e) {
      console.error('Error adding document: ', e)
      res.send({ status: 500 })
    }
  },
  updateUser: async (req, res, next) => {
    try {
      const { walletAddress } = req.body

      if (req.user) {
        const ref = doc(db, 'users', req.user.id)
        await updateDoc(ref, { walletAddress: walletAddress })
        res.send({ status: 201 })
      } else {
        res.send({ status: 401 })
      }
    } catch {
      res.send({ status: 500 })
    }
  },
  delete: async (req, res, next) => {
    await deleteDoc(doc(db, 'users', req.query.id))
    res.send({ msg: 'Deleted' })
  },
  calculateRewards: async (req, res, next) => {
    const {
      twitterUsername,
      projectId,
      projectCurrency,
      projectUsername,
      moneyPerThousandImpressions,
      projectPicture,
    } = req.query // twitterUsername of project
    const impressionsPerMetricCount = 40 // estimated

    if (req.user) {
      const result = await axios.get(
        `https://api.twitter.com/2/users/${req.user.twitterId}/tweets?exclude=retweets&tweet.fields=public_metrics&max_results=10`,
        {
          headers: {
            Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
          },
        },
      )
      const tweets = result.data.data

      let totalImpressions = 0
      for (const tweet of tweets) {
        if (tweet.text.includes(twitterUsername)) {
          const metric_count = Math.max(
            tweet.public_metrics.like_count,
            tweet.public_metrics.retweet_count,
            tweet.public_metrics.reply_count,
            tweet.public_metrics.quote_count,
          )

          let impressions = impressionsPerMetricCount * metric_count

          // check if tweet had already collected rewards or not
          const ref = collection(db, 'tweets')
          const q = query(ref, where('tweetId', '==', tweet.id))
          let tweetImpressionsCounted = 0
          let tweetDocId = 0
          const querySnapshot = await getDocs(q)
          querySnapshot.forEach((doc) => {
            tweetDocId = doc.id
            tweetImpressionsCounted = doc.data().impressionsCounted
          })

          if (tweetImpressionsCounted === 0) {
            // tweet not collected before
            await addDoc(collection(db, 'tweets'), {
              ...tweetsModel,
              ...{ tweetId: tweet.id, impressionsCounted: impressions },
            })
          } else {
            impressions -= tweetImpressionsCounted
            if (impressions > 0 && tweetDocId) {
              const tweetRef = doc(db, 'tweets', tweetDocId)
              await updateDoc(tweetRef, {
                impressionsCounted: increment(impressions),
              })
            }
          }

          if (impressions > 0) {
            totalImpressions += impressions
          }
        }
      }

      const totalRewards =
        (totalImpressions / 1000) * moneyPerThousandImpressions

      if (totalRewards) {
        const projectRef = doc(db, 'projects', projectId)
        await updateDoc(projectRef, {
          claims: arrayUnion({
            claimingUser: req.user.twitterUsername,
            claimedAmount: totalRewards,
            claimDate: Date.now(),
          }),
        })

        const userRef = doc(db, 'users', req.user.id)
        await updateDoc(userRef, {
          totalAmountEarned: increment(totalRewards),
        })

        // check if tweet had already collected rewards or not
        const userClaimsRef = collection(db, 'userClaims')
        const q = query(
          userClaimsRef,
          where('projectId', '==', projectId),
          where('claimerUsername', '==', req.user.twitterUsername),
        )
        let userClaimId = 0
        const querySnapshot = await getDocs(q)
        querySnapshot.forEach((doc) => {
          userClaimId = doc.id
        })

        if (!userClaimId) {
          // first time claiming for this project
          await addDoc(collection(db, 'userClaims'), {
            ...userClaimsModel,
            ...{
              projectId: projectId,
              claimerUsername: req.user.twitterUsername,
              totalAmountEarned: totalRewards,
              claimCurrency: projectCurrency,
              projectPicture: projectPicture,
              projectUserName: projectUsername,
            },
          })
        } else {
          const userClaimRef = doc(db, 'userClaims', userClaimId)
          await updateDoc(userClaimRef, {
            totalAmountEarned: increment(totalRewards),
          })
        }

        const internalRef = doc(db, 'internal', 'vCvhxq2XsBUf4VCeCJU7')
        await updateDoc(internalRef, {
          totalVirtualClaim: increment(totalRewards),
        })
      }

      res.send({ status: 200, rewards: totalRewards })
    } else {
      res.send({ status: 404 })
    }
  },
}
