const usersModel = {
  name: '',
  twitterId: '',
  twitterUsername: '',
  twitterProfilePic: '',
  twitterProfilePicBackground: '',
  walletAddress: '',
  location: '',
  description: '',
  totalAmountEarned: 0, // virtual money
  totalAmountClaimed: 0, // sent from contract to user
  numRaffleTickets: 0, // for lucky giveaway
  numRaffleTicketsMax: 0, // once hit 5 cannot increment numRaffleTickets
}

module.exports = { usersModel }
