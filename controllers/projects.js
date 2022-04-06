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

const Web3 = require('web3')
const Provider = require('@truffle/hdwallet-provider')
const ethers = require('ethers')
const TokenManager = require('../../frontend/src/contracts/TokenManager.json')
const Weth = require('../../frontend/src/contracts/Weth.json')
const adminAddress = '0xdeb03050e0503b634102718a45c456fe49484500'
const fakePrivateKey =
  '4763cc2db21e2941a53aa316daf8e901c35ea2cc2f7f01dfbadd199fc4447273'
const infuraUrl = ''

module.exports = {
  getProjects: async (req, res, next) => {
    const querySnapshot = await getDocs(collection(db, 'projects'))
    const list = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    res.send(list)
  },
  getByProjectUnqiueName: async (req, res, next) => {
    const { name } = req.query
    const ref = collection(db, 'projects')
    const q = query(ref, where('name', '==', name))

    const querySnapshot = await getDocs(q)
    querySnapshot.forEach((doc) => {
      //   console.log(doc.ref) // how to convert query back to ref
      res.send({ id: doc.id, ...doc.data() })
    })
  },
  createProject: async (req, res, next) => {
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        ...projectsModel,
        ...req.body,
      })

      res.send({ id: docRef.id })
    } catch (e) {
      console.error('Error adding document: ', e)
      res.send({ status: 500 })
    }
  },
  getWhitelist: async (req, res, next) => {
    res.send({ status: 500 })
  },
  addToWhitelist: async (req, res, next) => {
    const { docId, email } = req.body
    const ref = doc(db, 'projects', docId)

    await updateDoc(ref, {
      whitelistEmail: arrayUnion(email),
    })

    res.send({ status: 200 })
  },
  removeFromWhiteList: async (req, res, next) => {
    const { docId, email } = req.body
    const ref = doc(db, 'projects', docId)

    await updateDoc(ref, {
      whitelistEmail: arrayRemove(email),
    })

    res.send({ status: 200 })
  },
  test: async (req, res, next) => {
    try {
      const provider = new Provider(fakePrivateKey, 'http://localhost:9545')
      const web3 = new Web3(provider)
      let networkId = await web3.eth.net.getId()

      const tokenManager = new web3.eth.Contract(
        TokenManager.abi,
        TokenManager.networks[networkId].address,
      )

      const receipt = await tokenManager.methods
        .transferFromContract(
          Weth.networks[networkId].address, // token address
          '0x0D702F81a299d8A068E1498433070CAa0319dB69', // depositor
          adminAddress, // transfer to this address
          ethers.utils.parseEther('0.005'),
        )
        .send({ from: adminAddress })
      console.log(`Transaction hash: ${receipt}`)

      res.send({ id: 123 })
    } catch (e) {
      console.error('error: ', e)
      res.send({ status: 500 })
    }
  },
}
