const projectsModel = {
  username: '', // given hello world convert to hello-world (unique)
  twitterUsername: '',
  description: '', // the new 10k collection
  profilePicture: '', // https://dciv99su0d7r5.cloudfront.net/profile_pic_loco_5.png
  bannerPicture: '',
  totalLifeTimeDeposit: 0, // sum every deposit
  totalLifeTimeWithdraw: 0, // minus every withdraw
  projectCurrency: '', // WETH
  claims: [], // {claimingUser: "username", claimedAmount: 0.002, claimDate: "UTC string"}
  moneyPerThousandImpressions: 0,
}

module.exports = { projectsModel }
