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

const axios = require('axios')

module.exports = {
  getTotalNewImpressions: async (req, projectTwitterUsername, hashtag = '') => {
    const impressionsPerMetricCount = 40 // estimated

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
    let totalNewImpressions = 0
    for (const tweet of tweets) {
      if (
        tweet.text.toLowerCase().includes(projectTwitterUsername.toLowerCase()) &&
        tweet.text.toLowerCase().includes(hashtag.toLowerCase())
      ) {
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
          totalNewImpressions += impressions
        }
      }
    }

    return totalNewImpressions
  },

  getProjectDetailsByProjectUsername: async (projectUsername) => {
    const projectsRef = collection(db, 'projects')
    const q = query(projectsRef, where('username', '==', projectUsername))
    let projectId = 0
    let projectDetails = {}
    const querySnapshot = await getDocs(q)
    querySnapshot.forEach((doc) => {
      projectId = doc.id
      projectDetails = doc.data()
    })

    return {
      projectId: projectId,
      ...projectDetails,
    }
  },
}
