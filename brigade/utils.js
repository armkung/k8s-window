const _ = requireGlobalModule('lodash/fp')
const { Job } = requireGlobalModule('brigadier')

const TASK_IMAGE = 'brigadecore/brigade-github-check-run'

const createChecks = (evt, project, env) => {
  const title = _.kebabCase(env.CHECK_TITLE)
  const startJob = new Job(`start-${title}`, TASK_IMAGE)
  startJob.env = {
    CHECK_PAYLOAD: evt.payload,
    ...env
  }

  const endJob = new Job(`end-${title}`, TASK_IMAGE)
  endJob.env = {
    CHECK_PAYLOAD: evt.payload,
    ...env
  }

  return {
    tasks: [
      startJob.name,
      endJob.name
    ],
    start: async (env) => {
      startJob.env = {
        ...startJob.env,
        ...env
      }
      return startJob.run()
    },
    end: async (env) => {
      endJob.env = {
        ...endJob.env,
        ...env
      }
      return endJob.run()
    }
  }
}

const runCommand = job => (cmd) => {
  job.tasks = _.pipe(
    _.split('\n'),
    _.map(_.trim),
    _.reject(_.isEmpty)
  )(cmd)
}

const createStep = (evt, project) => async (title, task) => {
  title = _.lowerCase(title)
  const checks = createChecks(evt, project, {
    CHECK_TITLE: _.upperFirst(title),
    CHECK_NAME: _.pipe(
      _.camelCase,
      _.upperFirst
    )(title)
  })

  try {
    await checks.start({
      CHECK_SUMMARY: `Start ${title}`
    })

    const result = await task()

    await checks.end({
      CHECK_CONCLUSION: 'success',
      CHECK_SUMMARY: `${title} completed`,
      CHECK_TEXT: result.toString()
    })
  } catch (err) {
    await checks.end({
      CHECK_CONCLUSION: 'failure',
      CHECK_SUMMARY: `${title} failed`,
      CHECK_TEXT: err.toString()
    })
  }

  return checks.tasks
}


module.exports = {
  createChecks,
  createStep,
  runCommand
}