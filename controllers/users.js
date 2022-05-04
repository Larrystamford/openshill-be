const db = require('../firebase-config')
const {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  setDoc,
  getDoc,
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
const { projectClaimsModel } = require('../models/projectClaims')
const {
  getLuckyDrawTickets,
  getLuckyDrawResult,
  storeLuckyDrawResult,
} = require('../service/luckydraw')

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
        // incase user try to hack fake money in
        totalAmountEarned: 0,
        totalAmountClaimed: 0,
      })

      res.send({ id: docRef.id })
    } catch (e) {
      console.error('Error adding document: ', e)
      res.send({ status: 500 })
    }
  },
  // update user wallet address
  // need to be careful not to let user update anything he wants
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
    // TODO
    // all these should be called in the backend when projectId is sent in
    // also need to add check of whether the user has the nft belonging to the project id
    // move to service folder
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
      // get lastest 10 tweets
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
        // update project by id
        const projectRef = doc(db, 'projects', projectId)
        await updateDoc(projectRef, {
          claims: arrayUnion({
            claimingUser: req.user.twitterUsername,
            claimedAmount: totalRewards,
            claimDate: Date.now(),
          }),
        })

        // to query claims for range queries
        const projectClaimsRef = collection(db, 'projectClaims')
        await addDoc(projectClaimsRef, {
          ...projectClaimsModel,
          ...{
            projectId: projectId,
            projectUsername: projectUsername,
            claimingUsername: req.user.twitterUsername,
            claimedAmount: totalRewards,
            claimDate: Date.now(),
            claimCurrency: projectCurrency,
          },
        })

        // update the user model
        const userRef = doc(db, 'users', req.user.id)
        await updateDoc(userRef, {
          totalAmountEarned: increment(totalRewards),
        })

        // check if user is first time collecting rewards from the project
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

  getLuckyDrawTickets: async (req, res, next) => {
    let numberOfTickets = 0
    if (req.user) {
      numberOfTickets = await getLuckyDrawTickets(req.user)
    }

    res.send({ numberOfTickets: numberOfTickets })
  },

  getLuckyDrawResult: async (req, res, next) => {
    // TODO: change to post request
    const { projectId } = req.query // twitterUsername of project

    let amountWon = 0
    if (req.user) {
      const ethUsdResponse = await axios.get(
        'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD',
      )
      usdPerEth = ethUsdResponse.data.USD

      amountWonInEth = getLuckyDrawResult() / usdPerEth

      const projectRef = doc(db, 'projects', projectId)
      const projectSnap = await getDoc(projectRef)
      await storeLuckyDrawResult(
        req.user,
        amountWonInEth,
        projectId,
        projectSnap.data(),
      )
    }

    res.send({ amountWon: amountWonInEth })
  },
}
