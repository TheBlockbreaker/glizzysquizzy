const client = require('./client')
const nanoid = require('nanoid')
console.error('USING CLIENT', client)
export const ensurePlayerExists = async (playerId, playerName) => {
  const player = {
    _type: 'player',
    _id: playerId,
    name: playerName
  }
  return client.createOrReplace(player)
}

export const fetchMatch = async matchSlug => {
  const match = await client.fetch(
    '*[_type == "match" && slug.current == $matchSlug && !(_id in path("drafts.**"))][0]',
    {
      matchSlug
    }
  )
  return match
}

export const ensurePlayerParticipation = async (player, match) => {
  if (match.players && match.players.some(pRef => pRef._ref === player._id)) {
    return Promise.resolve(true)
  }

  const playerRef = {_key: nanoid(), _type: 'reference', _ref: player._id}
  return client
    .patch(match._id)
    .setIfMissing({players: []})
    .append('players', [playerRef])
    .commit()
}

export const submitAnswer = async (match, playerId, questionKey, selectedChoiceKey) => {
  let indexOfExistingAnswer = -1
  match.answers.forEach((answer, index) => {
    if (answer.questionKey === questionKey && answer.player._ref == playerId) {
      indexOfExistingAnswer = index
    }
  })

  let position
  let operation
  if (indexOfExistingAnswer > -1) {
    operation = 'replace'
    position = `answers[${indexOfExistingAnswer}]`
  } else {
    operation = 'after'
    position = `answers[-1]`
  }

  const answer = {
    _key: nanoid(),
    _type: 'answer',
    player: {
      _type: 'reference',
      _ref: playerId
    },
    questionKey,
    selectedChoiceKey,
    submittedAt: new Date().toISOString()
  }

  return client
    .patch(match._id)
    .setIfMissing({answers: []})
    .insert(operation, position, [answer])
    .commit()
}
