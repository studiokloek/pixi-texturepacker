import get from 'get-value';
import ora from 'ora';
import fs from 'fs-extra';
import defaults from 'object.defaults/mutable.js';
import {fileURLToPath} from 'url';

export async function readSettingsFrom(_file) {
  const spinner = ora(`Reading settings from ${_file}...`).start();

  let settings = {};

  const filePath = fileURLToPath(new URL(_file, import.meta.url));

  try {
    const data = await fs.readJSON(filePath);

    settings = get(data, 'sprites', {});
    
    settings = defaults(settings, {
      sourceDirectory: './assets/',
      scriptDirectory: './assets/converted/',
      targetDirectory: './assets/converted/',
      watch: false,
      watchDelay: 500,
      extrude: false,
      textureFormat: 'png',
      includeSizeInfo: false,
      includePNGExpressMetadata: false,
      directories: []
    });
  } catch {
    spinner.fail(`Could not load settings from ${_file}... (does it exist?)`);
    return settings;
  }

  const numberOfDirectories = settings.directories.length;

  if (numberOfDirectories) {
    spinner.succeed(`Found ${numberOfDirectories} directories to process...`);
  } else {
    spinner.fail(`Found no directories to process...`);
  }

  return settings;
}
