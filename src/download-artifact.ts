import * as core from '@actions/core'
import * as artifact from '@actions/artifact'
import * as os from 'os'
import {resolve} from 'path'
import {Inputs, Outputs} from './constants'

async function run(): Promise<void> {
  let ifNoArtifact = ''
  try {
    const name = core.getInput(Inputs.Name, {required: false})
    const path = core.getInput(Inputs.Path, {required: false})
    ifNoArtifact =
      core.getInput(Inputs.IfNoArtifact, {required: false}) || 'fail'

    let resolvedPath
    // resolve tilde expansions, path.replace only replaces the first occurrence of a pattern
    if (path.startsWith(`~`)) {
      resolvedPath = resolve(path.replace('~', os.homedir()))
    } else {
      resolvedPath = resolve(path)
    }
    core.debug(`Resolved path is ${resolvedPath}`)

    const artifactClient = artifact.create()
    if (!name) {
      // download all artifacts
      core.info('No artifact name specified, downloading all artifacts')
      core.info(
        'Creating an extra directory for each artifact that is being downloaded'
      )
      const downloadResponse = await artifactClient.downloadAllArtifacts(
        resolvedPath
      )
      core.info(`There were ${downloadResponse.length} artifacts downloaded`)
      for (const artifact of downloadResponse) {
        core.info(
          `Artifact ${artifact.artifactName} was downloaded to ${artifact.downloadPath}`
        )
      }
    } else {
      // download a single artifact
      core.info(`Starting download for ${name}`)
      const downloadOptions = {
        createArtifactFolder: false
      }
      const downloadResponse = await artifactClient.downloadArtifact(
        name,
        resolvedPath,
        downloadOptions
      )
      core.info(
        `Artifact ${downloadResponse.artifactName} was downloaded to ${downloadResponse.downloadPath}`
      )
    }
    // output the directory that the artifact(s) was/were downloaded to
    // if no path is provided, an empty string resolves to the current working directory
    core.setOutput(Outputs.DownloadPath, resolvedPath)
    core.info('Artifact download has finished successfully')
  } catch (err) {
    const {message} = err as Error
    switch (ifNoArtifact) {
      case 'warn':
        core.warning(message)
        break
      case 'ignore':
        core.info(message)
        break
      case 'fail':
      default:
        core.setFailed(message)
    }
  }
}

run()
