module.exports = async ({ github, context }) => {
  if (!process.env.DEBUG) {
    console.debug = () => {}
  }

  const username = 'duyet'
  const owner = context.repo.owner

  let repos = await github.rest.repos.listForUser({
    username: owner,
    type: 'owner',
    sort: 'created',
  })
  console.debug('Repos', repos)

  for (let repo of repos.data) {
    console.debug(`Checking repo`, repo)

    try {
      console.log(`Check if a user is a repository collaborator`)
      await github.rest.repos.checkCollaborator({
        owner,
        repo: repo.name,
        username,
      })
      console.log('ok')
    } catch (e) {
      if (e.status != 404) {
        console.log('Unexpected error, skip', e)
        continue
      }

      console.log(`${username} is not a collaborator for ${repo.full_name}`)
      console.log(`Inviting ${username} to ${repo.full_name} ...`)

      const status = await github.rest.repos.addCollaborator({
        owner: repo.owner.login,
        repo: repo.name,
        username,
      })

      console.log(`Invited ${status}`)
    }
  }
}
