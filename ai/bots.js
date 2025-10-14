export const bots = [
  {
    id: 'ava',
    name: 'Ava',
    image: require('../assets/images/users/user1.png'),
    personality: 'friendly'
  },
  {
    id: 'zane',
    name: 'Zane',
    image: require('../assets/images/users/user2.png'),
    personality: 'competitive'
  },
  {
    id: 'leo',
    name: 'Leo',
    image: require('../assets/images/users/user3.png'),
    personality: 'sarcastic'
  }
];

export function getRandomBot() {
  return bots[Math.floor(Math.random() * bots.length)];
}
