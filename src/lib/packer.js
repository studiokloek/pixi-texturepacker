import chalk from 'chalk';
import get from 'get-value';
import logSymbols from 'log-symbols';
import ora from 'ora';
import path from 'path';
import { packFolder } from './texturepacker';
import { fixSpritesheetJSON, removeGeneratedAssets } from './util';
import { checkCodeExists, generateCode } from './codegenerator';

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

  const {path: itemPath, ...itemOptions} = directory;

  const reportPackDone = async function (directory, settings, itemPath) {
    isPacking[itemPath] = false;

    if (shouldPackAgain[itemPath]) {
      shouldPackAgain[itemPath] = false;
      spinner.warn(`Needs repacking, something changed while packing...`);
      await pack(directory, settings);
    } else {
      spinner.succeed(`Done packing ${itemPath}`);
    }
  };

  const itemPathParts = itemPath.split('/'),
    directoryName = itemPathParts.pop(),
    targetPath = `${path.join(settings.targetDirectory, itemPath)}`;

  if (isPacking[itemPath]) {
    console.log(logSymbols.warning, chalk.yellow(`Already packing, starting again afterwards...`));
    shouldPackAgain[itemPath] = true;
    return;
  }

  isPacking[itemPath] = true;

  const textureFormat = get(itemOptions, 'textureFormat', settings.textureFormat),
    onlyGenerateCode = get(itemOptions, 'onlyGenerateCode', settings.onlyGenerateCode),
    packerOptions = {
      sheet: `${path.join(
        settings.targetDirectory,
        itemPath,
        directoryName,
      )}-{n1}{v}.${textureFormat}`,
      data: `${path.join(settings.targetDirectory, itemPath, directoryName)}-{n1}{v}.json`,
      replace: `^${directoryName}=${itemPath}`,
      extrude: get(itemOptions, 'extrude', settings.extrude) ? '1' : '0',
      'texture-format': textureFormat,
      'max-size': get(itemOptions, 'maxSize', settings.maxSize),
    };

  const spinner = ora(`Packing ${itemPath}`).start();

  // if we only need to generate code, first check if it exists so we can skip building textures
  if (onlyGenerateCode === true) {
    const codeExists = await checkCodeExists(itemPath, settings);

    if (codeExists === true) {
      await reportPackDone(directory, settings, itemPath);
      return;
    }
  }

  try {
    const success = await packFolder(`${path.join(settings.sourceDirectory, itemPath)}`, packerOptions, settings);

    if (!success) {
      spinner.fail(`Error packing ${itemPath}`);

      return;
    }
  } catch (error) {
    spinner.fail(`Error packing ${itemPath}`);
    console.error(logSymbols.warning, error.message);

    return;
  }

  await fixSpritesheetJSON(`${path.posix.join(settings.targetDirectory, itemPath)}`);

  await generateCode(itemPath, settings, itemOptions);

  // remove generated assets?
  if (onlyGenerateCode === true) {
    await removeGeneratedAssets(targetPath);
  }

  await reportPackDone(directory, settings, itemPath);
}
