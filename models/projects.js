const projectsModel = {
  uniqueName: '', // hello-world
  name: '', // Hello World
  brandUniqueId: '', // nike-1 or collection id
  description: '', // the new 10k collection
  contractFirstId: 1, // 1 - 10000 token id belongs to this project
  currentMintId: 1, // if its 10001, cannot mint anymore
  totalTokens: 10000, // required
  whitelistAddress: [], // early joiners etc
  whitelistEmail: [], // early joiners etc
  iconImage: '', // https://dciv99su0d7r5.cloudfront.net/profile_pic_loco_5.png
  rarity: {
    //   platinum: 1,
    //   gold: 9,
    //   silver: 50,
    //   bronze: 40
  },
  media: [
    // {
    //   imageLink: '',
    //   videoLink: '',
    //   modelLink: '',
    //   description: '', // gold class
    // },
  ],
  externalLinks: {
    opensea: '',
    instagram: '',
    twitter: '',
  },
  status: '', // active, end, etc
}

module.exports = { projectsModel }
