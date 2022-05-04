const axios = require('axios')
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
const { luckyTweetsModel } = require('../models/luckyTweets')
const { usersModel } = require('../models/users')
const { userClaimsModel } = require('../models/userClaims')
const { projectClaimsModel } = require('../models/projectClaims')

const e = require('express')

function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min)
}

async function getLuckyDrawTickets(user) {
  const maxTicketsPerPerson = 5

  const result = await axios.get(
    `https://api.twitter.com/2/users/${user.twitterId}/tweets?exclude=retweets&max_results=10`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
      },
    },
  )
  const tweets = result.data.data

  let totalTickets = 0
  let uniqueFriendsTagged = new Set()
  //   const projectTwitterUsername = '@openshill_nft'
  const projectTwitterUsername = '@los_muertosNFT'

  for (const tweet of tweets) {
    // check if tweet had already collected rewards or not
    const ref = collection(db, 'luckyTweets')
    const q = query(ref, where('tweetId', '==', tweet.id))
    let tweetDocId = 0
    const querySnapshot = await getDocs(q)
    querySnapshot.forEach((doc) => {
      tweetDocId = doc.id
    })

    // check if the tweet is a reply to our project's tweet and if tweet was not calculated before
    if (tweetDocId === 0 && tweet.text.includes(projectTwitterUsername)) {
      const tweetTextArray = tweet.text.split(' ')
      let numFriendsTagged = 0
      for (const eachWord of tweetTextArray) {
        if (
          eachWord.includes('@') &&
          eachWord != projectTwitterUsername &&
          !uniqueFriendsTagged.has(eachWord)
        ) {
          numFriendsTagged += 1
          uniqueFriendsTagged.add(eachWord)
        }
      }
      totalTickets += Math.floor(numFriendsTagged / 3)

      // store lucky tweet id to avoid repeat calculation
      await addDoc(collection(db, 'luckyTweets'), {
        ...luckyTweetsModel,
        ...{ tweetId: tweet.id },
      })
    }
  }

  if (totalTickets > maxTicketsPerPerson) {
    totalTickets = maxTicketsPerPerson
  }

  // update number of raffle tickets that the user has
  const userRef = doc(db, 'users', user.id)
  const userSnap = await getDoc(userRef)
  if (
    !userSnap.data().numRaffleTicketsMax ||
    userSnap.data().numRaffleTicketsMax + totalTickets <= 5
  ) {
    await updateDoc(userRef, {
      numRaffleTickets: increment(totalTickets),
      numRaffleTicketsMax: increment(totalTickets),
    })
  } else if (
    userSnap.data().numRaffleTicketsMax < 5 &&
    userSnap.data().numRaffleTicketsMax + totalTickets > 5
  ) {
    const maxMoreTickets =
      maxTicketsPerPerson - userSnap.data().numRaffleTicketsMax
    let moreTickets = Math.min(maxMoreTickets, totalTickets)

    await updateDoc(userRef, {
      numRaffleTickets: increment(moreTickets),
      numRaffleTicketsMax: increment(moreTickets),
    })
  }

  const userSnap2 = await getDoc(userRef)
  return userSnap2.data().numRaffleTickets
}

function getLuckyDrawResult() {
  const percentile70low = 3
  const percentile70high = 10
  const percentile30low = 30
  const percentile30high = 50 // 50 usdc
  const percentileSplit = 80 // if less than 70 percent will go to the 70low and 70 high

  const percentChance = randomIntFromInterval(1, 100)
  const randomCents = Math.round(Math.random() * 100) / 100 // this sometimes gives 0.00999999 etc

  // 80 percent chance to get 3-10
  let finalPrize
  if (percentChance < percentileSplit) {
    finalPrize =
      randomIntFromInterval(percentile70low, percentile70high) + randomCents
  } else {
    finalPrize =
      randomIntFromInterval(percentile30low, percentile30high) + randomCents
  }

  return finalPrize
}

async function storeLuckyDrawResult(user, result, projectId, project) {
  // update project by id
  const projectRef = doc(db, 'projects', projectId)
  await updateDoc(projectRef, {
    claims: arrayUnion({
      claimingUser: user.twitterUsername,
      claimedAmount: result,
      claimDate: Date.now(),
    }),
  })

  // to query claims for range queries
  const projectClaimsRef = collection(db, 'projectClaims')
  await addDoc(projectClaimsRef, {
    ...projectClaimsModel,
    ...{
      projectId: projectId,
      projectUsername: project.username,
      claimingUsername: user.twitterUsername,
      claimedAmount: result,
      claimDate: Date.now(),
      claimCurrency: project.projectCurrency,
    },
  })

  const userClaimsRef = collection(db, 'userClaims')
  const q = query(
    userClaimsRef,
    where('projectId', '==', projectId),
    where('claimerUsername', '==', user.twitterUsername),
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
        claimerUsername: user.twitterUsername,
        totalAmountEarned: result,
        claimCurrency: project.projectCurrency,
        projectPicture: project.profilePicture,
        projectUserName: project.username,
      },
    })
  } else {
    const userClaimRef = doc(db, 'userClaims', userClaimId)
    await updateDoc(userClaimRef, {
      totalAmountEarned: increment(result),
    })
  }

  // update the user model
  const userRef = doc(db, 'users', user.id)
  await updateDoc(userRef, {
    totalAmountEarned: increment(result),
    numRaffleTickets: increment(-1),
  })

  const internalRef = doc(db, 'internal', 'vCvhxq2XsBUf4VCeCJU7')
  await updateDoc(internalRef, {
    totalVirtualClaim: increment(result),
  })
}

module.exports = {
  getLuckyDrawTickets,
  getLuckyDrawResult,
  storeLuckyDrawResult,
}
