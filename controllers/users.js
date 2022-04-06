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
const { usersModel } = require('../models/users')

module.exports = {
  get: async (req, res, next) => {
    const querySnapshot = await getDocs(collection(db, 'users'))
    const list = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    res.send(list)
  },
  getByUsername: async (req, res, next) => {
    const { username } = req.query
    const ref = collection(db, 'users')
    const q = query(ref, where('username', '==', username))

    const querySnapshot = await getDocs(q)
    querySnapshot.forEach((doc) => {
      //   console.log(doc.ref) // how to convert query back to ref
      console.log(doc.data)
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
  update: async (req, res, next) => {
    try {
      const { docId, newDataObject } = req.body
      const ref = doc(db, 'users', docId)
      await updateDoc(ref, newDataObject)

      res.send({ status: 200 })
    } catch {
      console.error('Error: ', e)
      res.send({ status: 500 })
    }
  },
  delete: async (req, res, next) => {
    await deleteDoc(doc(db, 'users', req.query.id))
    res.send({ msg: 'Deleted' })
  },
}
