// use for range queries to get latest 1 week etc

const projectClaims = {
  projectId: '',
  projectUsername: '',
  claimingUsername: '',
  claimedAmount: '',
  claimDate: '', // UTC String
  claimCurrency: '', // WETH / USD etc
  claimType: 'standard', // standard, lucky, competition
}

module.exports = { projectClaims }
