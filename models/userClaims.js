const userClaimsModel = {
  projectId: '', // project document id
  claimerUsername: '',
  claimCurrency: '',
  totalAmountEarned: 0, // virtual money
  totalAmountClaimed: 0, // sent from contract to user
  projectPicture: '',
  projectUserName: '',
  claimDate: '', // UTC String
  claimType: 'standard', // standard, lucky, competition
}

module.exports = { userClaimsModel }
