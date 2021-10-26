import chalk from 'chalk';
import get from 'get-value';
import logSymbols from 'log-symbols';
import ora from 'ora';
import path from 'path';
import { generateCode } from './codegenerator';
import { packFolder } from './texturepacker';
import { fixSpritesheetJSON } from './util';

const isPacking = {},
  shouldPackAgain = {};

export async function packAll(directories, settings) {
  console.log(logSymbols.info, chalk.blue(`Start packing all items...`));

  for (const directory of directories) {
    await pack(directory, settings);
  }

  console.log(logSymbols.success, chalk.green(`Done packing all items...`));
}

export async function pack(directory, settings) {
  let itemPath, itemOptions;

  if (Array.isArray(directory)) {
    itemPath = directory[0];
    itemOptions = directory[1];
  } else {
    itemPath = directory;
  }

  const itemPathParts = itemPath.split('/'),
    directoryName = itemPathParts.pop();

  if (isPacking[itemPath]) {
    console.log(logSymbols.warning, chalk.yellow(`Allready packing, starting again afterwards...`));
    shouldPackAgain[itemPath] = true;
    return;
  }

  isPacking[itemPath] = true;

  const textureFormat = get(itemOptions, 'textureFormat', settings.textureFormat),
    options = {
      'sheet': `${path.join(settings.targetDirectory, itemPath, directoryName)}-{n1}{v}.${textureFormat}`,
      'data': `${path.join(settings.targetDirectory, itemPath, directoryName)}-{n1}{v}.json`,
      'replace': `^${directoryName}=${itemPath}`,
      'extrude': get(itemOptions, 'extrude', settings.extrude) ? '1' : '0',
      'texture-format': textureFormat,
      'max-size': get(itemOptions, 'maxSize', settings.maxSize),
    }

  const spinner = ora(`Packing ${itemPath}`).start();

  try {
    const success = await packFolder(`${path.join(settings.sourceDirectory, itemPath)}`, options);

    if (!success) {
      spinner.fail(`Error packing ${itemPath}`);

      return;
    }
  } catch (error) {
    spinner.fail(`Error packing ${itemPath}`);
    console.error(logSymbols.warning, error.message);

    return;
  }

  await fixSpritesheetJSON(`${path.join(settings.targetDirectory, itemPath)}`);

  await generateCode(itemPath, settings, itemOptions);

  isPacking[itemPath] = false;

  if (shouldPackAgain[itemPath]) {
    shouldPackAgain[itemPath] = false;
    spinner.warn(`Needs repacking, something changed while packing...`);
    await pack(directory, settings);
  } else {
    spinner.succeed(`Done packing ${itemPath}`);
  }
}
