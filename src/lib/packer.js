const ora = require('ora');
const logSymbols = require('log-symbols');
const chalk = require('chalk');
const path = require('path');
const get = require('get-value');

import { packFolder } from './texturepacker';
import { generateCode } from './codegenerator';
import { fixSpritesheetScaleMeta, removeGeneratedAssets } from './util';

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
    directoryName = itemPathParts.pop(),
    targetPath = `${path.join(settings.targetDirectory, itemPath)}`;

  if (isPacking[itemPath]) {
    console.log(logSymbols.warning, chalk.yellow(`Allready packing, starting again afterwards...`));
    shouldPackAgain[itemPath] = true;
    return;
  }

  isPacking[itemPath] = true;

  const textureFormat = get(itemOptions, 'textureFormat', settings.textureFormat),
  onlyGenerateCode = get(itemOptions, 'onlyGenerateCode', settings.onlyGenerateCode),
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

  
  await fixSpritesheetScaleMeta(targetPath);

  await generateCode(itemPath, settings, itemOptions);
  
  // remove generated assets?
  if (onlyGenerateCode === true) {
    await removeGeneratedAssets(targetPath);
  }
  
  isPacking[itemPath] = false;

  if (shouldPackAgain[itemPath]) {
    shouldPackAgain[itemPath] = false;
    spinner.warn(`Needs repacking, something changed while packing...`);
    await pack(directory, settings);
  } else {
    spinner.succeed(`Done packing ${itemPath}`);
  }
}
