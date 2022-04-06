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
} = require('firebase/firestore')
const { walletToUserModel } = require('../models/walletToUser')

module.exports = {
  get: async (req, res, next) => {
    const querySnapshot = await getDocs(collection(db, 'walletToUser'))
    const list = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    res.send(list)
  },
  getUsernameByWalletAddress: async (req, res, next) => {
    const { walletAddress } = req.query
    const ref = collection(db, 'walletToUser')
    const q = query(ref, where('walletAddress', '==', walletAddress))
    const querySnapshot = await getDocs(q)

    querySnapshot.forEach((doc) => {
      //   console.log(doc.ref) // how to convert query back to ref
      res.send({ id: doc.id, ...doc.data() })
    })

    res.send({ username: '' }) // if first time seeing wallet, no username yet
  },
  getWalletAddressByUsername: async (req, res, next) => {
    const { username } = req.query
    const ref = collection(db, 'walletToUser')
    const q = query(ref, where('username', '==', username))
    const querySnapshot = await getDocs(q)

    querySnapshot.forEach((doc) => {
      //   console.log(doc.ref) // how to convert query back to ref
      res.send({ id: doc.id, ...doc.data() })
    })

    res.send({ walletAddress: '' }) // if first time seeing username
  },
  post: async (req, res, next) => {
    try {
      const docRef = await addDoc(collection(db, 'walletToUser'), {
        ...walletToUserModel,
        ...req.body,
      })

      res.send({ id: docRef.id })
    } catch (e) {
      console.error('Error adding document: ', e)
      res.send({ status: 500 })
    }
  },
  update: async (req, res, next) => {
    // await setDoc(
    //   doc(db, 'users', 'wNKcw9PCzh2pPtyWWLtc'),
    //   {
    //     first: 'Lee',
    //     hello: 'ok',
    //   },
    //   { merge: true },
    // )
    const ref = doc(db, 'walletToUser', 'wNKcw9PCzh2pPtyWWLtc')
    await updateDoc(ref, {
      first: 'hey',
    })
    res.send({ msg: 'Updated' })
  },
  delete: async (req, res, next) => {
    await deleteDoc(doc(db, 'walletToUser', 'Kj1NHGArIJWUjZSoVUTi'))
    res.send({ msg: 'Deleted' })
  },
}
