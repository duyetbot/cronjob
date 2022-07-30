module.exports = async ({ github, context }) => {
  if (!process.env.DEBUG) {
    console.debug = () => {}
  }

  const username = process.env.USER_NAME || 'duyet'
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
      console.log(`Check if ${username} is a repository collaborator ${repo.full_name}`)
      await github.rest.repos.checkCollaborator({
        owner,
        repo: repo.name,
        username,
      })
      console.log(' -> Yes')
    } catch (e) {
      if (e.status != 404) {
        console.log(' -> Unexpected error, skip')
        console.debug(e)
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
