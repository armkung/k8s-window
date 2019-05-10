global.requireGlobalModule = require
const _ = require('lodash/fp')
const { events, Job } = require('brigadier')
const { runCommand, createStep } = require('./brigade/utils')

const runCleanUpTask = async (task) => {
  const job = new Job('cleanup', 'armkung/deployer')

  runCommand(job)(
    _.pipe(
      _.flatten,
      _.map((name) => `
        kubectl delete secrets -n cd -l jobname=${name}
        kubectl delete pod -n cd -l jobname=${name}
      `),
      _.join('\n')
    )(task)
  )

  await job.run()
}

const runIgnoreTask = async (evt, project) => {
  const job = new Job('delete', 'armkung/deployer')

  runCommand(job)(`
    brig -n cd build delete ${evt.buildID} --force
    kubectl delete secrets -n cd -l jobname=delete
  `)
  
  await job.run()
}

const runMainTask = async (evt, project) => {
  console.log('evt', evt)
  console.log('project', project)

  const deployVendors = new Job('deploy-vendors', 'armkung/deployer')
  const deployApp = new Job('deploy-app', 'armkung/deployer')
  
  const runStep = createStep(evt, project)

  const deployVendorsTask = await runStep('Deploy vendors', async () => {
    runCommand(deployVendors)(`
      cd /src/k8s/vendors
      skaffold deploy > /dev/null
    `)
    return deployVendors.run()
  })

  const deployAppTask = await runStep('Deploy app', async () => {
    runCommand(deployApp)(`
      cd /src/k8s/vendors
      skaffold deploy > /dev/null
    `)
    return deployApp.run()
  })

  await runCleanUpTask([
    deployVendorsTask,
    deployAppTask
  ])
}


events.on('exec', async (evt) => {
  // const job = new Job('deploy-vendors', 'armkung/deployer')
  // console.log(job)
  await runCleanUpTask([
    ['start-deploy-vendors', 'end-deploy-vendors'],
    ['start-deploy-app', 'end-deploy-app']
  ])
})

events.on('check_suite:requested', runMainTask)
events.on('check_suite:rerequested', runMainTask)
events.on('check_suite:completed', runIgnoreTask)
events.on('check_suite', runIgnoreTask)

events.on('pull_request:assigned', runIgnoreTask)
events.on('pull_request:closed', runIgnoreTask)
events.on('pull_request:edited', runIgnoreTask)
events.on('pull_request:labeled', runIgnoreTask)
events.on('pull_request:locked', runIgnoreTask)
events.on('pull_request:opened', runIgnoreTask)
events.on('pull_request:ready_for_review', runIgnoreTask)
events.on('pull_request:reopened', runIgnoreTask)
events.on('pull_request:review_request_removed', runIgnoreTask)
events.on('pull_request:review_requested', runIgnoreTask)
events.on('pull_request:unassigned', runIgnoreTask)
events.on('pull_request:unlabeled', runIgnoreTask)
events.on('pull_request:unlocked', runIgnoreTask)
events.on('pull_request', runIgnoreTask)
