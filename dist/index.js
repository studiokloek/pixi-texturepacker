'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const ora = require('ora');
const fs = require('fs-extra');
const get = require('get-value');

async function readSettingsFrom(_file) {
  const spinner = ora(`Reading settings from ${_file}...`).start();

  let settings = {};

  try {
    const data = await fs.readJSON(_file);

    settings = get(data, 'sprites', { default: {
      sourceDirectory: './assets/',
      scriptDirectory: './assets/converted/',
      targetDirectory: './assets/converted/',
      watch: false,
      watchDelay: 500,
      directories: []
    } });

  } catch (error) {
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

const util = require('util');
const execProcess = util.promisify(require('child_process').exec);

const baseOptions = {
  'format': 'pixijs4',
  'texture-format': 'png',
  'png-opt-level':0,
  'opt':'RGBA8888',
  'prepend-folder-name': true,
  'trim-sprite-names': true,

  'algorithm': 'MaxRects',
  'maxrects-heuristics': 'Best',
  'pack-mode': 'Best',
  'scale-mode': 'Smooth',

  'multipack': true,
  'force-identical-layout': true,
  'trim-mode': 'Trim',
  'alpha-handling': 'ClearTransparentPixels',
  'default-pivot-point': '0,0',
  'enable-rotation': true,
  'quiet': true,
  'extrude': '0',
  'variant': ['1:@2x', '0.5:']
};

async function packFolder(path, options) {
  const command = buildTexturePackerCommand(path, Object.assign(options, baseOptions));

  try {
    await execProcess(command);
  } catch(error) {
    if (error && error.stderr) {
      throw new Error(error.stderr);
    }

    return false;
  }

  return true;
}

function buildTexturePackerCommand(path, options) {
  options = options || {};

  const command = new TexturePackerCommand();
  command.addPath(`${path}`);
  Object.keys(options).forEach(option => {
    command.addOption(option, options[option]);
  });

  return command.build();
}

class TexturePackerCommand {
  constructor() {
    this.commands = [];
    this.path = '';
  }

  addPath(path) {
    this.path = path;
  }

  addOption(option, value) {
    this.commands.push({
      option: `--${this.kebabCase(option)}`,
      value
    });
  }

  build() {
    if (!this.path) {
      throw new Error('Must specify a path to process (image/directory)');
    }

    const options = this.commands
      .map(c => this.resolveValue(c.option, c.value))
      .join(' ');

    return `TexturePacker ${this.path} ${options}`;
  }

  resolveValue(option, value) {
    if (Array.isArray(value)) {
      return value.map(v => this.resolveValue(option, v)).join(' ');
    }

    if (value === true) {
      value = '';
    } else {
      value = ` ${value}`;
    }

    return `${option}${value}`;
  }

  // https://gist.github.com/nblackburn/875e6ff75bc8ce171c758bf75f304707
  kebabCase(text) {
    return text.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}

const get$1 = require('get-value');
const set = require('set-value');
const globby = require('globby');
const pupa = require('pupa');
const uppercamelcase = require('uppercamelcase');
const fs$1 = require('fs-extra');

const loaderInfoTemplate = `export const __LOADERINFO__ = {
  fileName : '{fileName}',
  numberOfParts : {numberOfParts},
  type: 'sprites'
};`;

const assetTemplate = `export const {assetName} = {assetData};`;

async function getDataFrom(path) {
  return await fs$1.readJson(path)
}

function convertPathToVariableName(path) {
  path = `${path}`;

  const parts = path.split('/');

  let titleParts = [],
    lastPart;

  lastPart = parts.pop();
  lastPart = lastPart.replace(/(\W)/g, '_').replace(/_{2,}/g, '.').replace(/^_/, '').replace(/_$/, '');
  lastPart = lastPart.toUpperCase();

  // onderdelen die pad zijn
  const numberOfPartsWithoutLast = parts.length,
    numberOfTitleParts = numberOfPartsWithoutLast > 1 ? 2 : 1;

  for (let i = 0; i < numberOfTitleParts; i++) {
    titleParts.push(parts.shift());
  }

  titleParts.push('sprites');
  titleParts = uppercamelcase(titleParts.join('-'));

  if (parts.length > 0) {
    path = parts.join('.');
    path = path.replace(/(\W^\.)/g, '').replace(/\.{2,}/g, '.').replace(/^\./, '').replace(/\.$/, '');

    return [titleParts, path, lastPart].join('.');
  }
  else {
    return [titleParts, lastPart].join('.');
  }
}

function getNumberOfParts(allDataItems) {
  if (allDataItems.length > 0) {
    const firstItem = allDataItems[0],
      numberOfRelatedPacks = get$1(firstItem, 'meta.related_multi_packs', { default: [] }).length;

    return numberOfRelatedPacks + 1;
  }

  return 0;
}

function parseAssetData(allAssetData) {
  const parsedData = {};
  for (const assetData of allAssetData || []) {
    for (const framePath of Object.keys(assetData.frames)) {
      set(parsedData, convertPathToVariableName(framePath), framePath);
    }
  }

  return parsedData;
}

function generateContents(parsedAssetData, loaderData) {
  let contents = '';

  // assets
  for (const assetName of Object.keys(parsedAssetData)) {
    var items = JSON.stringify(parsedAssetData[assetName], null, 2);
    items = items.replace(/"([^(")"]+)":/g, "$1:");

    contents = `${contents}${pupa(assetTemplate, {
      assetName: assetName,
      assetData: items
    })}\n`;
  }

  // loader
  contents = `${contents}${pupa(loaderInfoTemplate, {
    fileName: loaderData.fileName,
    numberOfParts: loaderData.numberOfParts
  })}\n`;

  return contents;
}

async function generateCode(path, settings, itemOptions) {

  const scriptDirectory = get$1(itemOptions, 'scriptDirectory', {default: settings.scriptDirectory});

  // read all generated json
  const paths = await globby(`${settings.targetDirectory}${path}/*[1-9]+.json`),
    actions = [];

  for (const path of paths) {
    actions.push(getDataFrom(path));
  }

  // parse data to object
  const allAssetData = await Promise.all(actions),
    parsedAssetData = parseAssetData(allAssetData),
    loaderInfo = {
      fileName: path,
      numberOfParts: getNumberOfParts(allAssetData)
    };

  const contents = generateContents(parsedAssetData, loaderInfo);
  await fs$1.outputFile(`${scriptDirectory}${path}/sprites.ts`, contents);
}

const ora$1 = require('ora');
const logSymbols = require('log-symbols');
const chalk = require('chalk');

const isPacking = {},
  shouldPackAgain = {};

async function packAll(directories, settings) {
  console.log(logSymbols.info, chalk.blue(`Start packing all items...`));

  for (const directory of directories) {
    await pack(directory, settings);
  }

  console.log(logSymbols.success, chalk.green(`Done packing all items...`));
}

async function pack(directory, settings) {
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

    const options = {
      'sheet': `${settings.targetDirectory}${itemPath}/${directoryName}-{n1}{v}.png`,
      'data': `${settings.targetDirectory}/${itemPath}/${directoryName}-{n1}{v}.json`,
      'replace': `${directoryName}=${itemPath}`,
    };

    const spinner = ora$1(`Packing ${itemPath}`).start();

    try {
      const success = await packFolder(`${settings.sourceDirectory}${itemPath}`, options);

      if (!success) {
        spinner.fail(`Error packing ${itemPath}`);

        return;
      }
    } catch (error) {
      spinner.fail(`Error packing ${itemPath}`);
      console.error(logSymbols.warning, error.message);

      return;
    }

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

const sane = require('sane');
const logSymbols$1 = require('log-symbols');
const chalk$1 = require('chalk');
const { debounce } = require('throttle-debounce');

function watch(directories, settings) {
  for (const directory of directories) {
    watchDirectory(directory, settings);
  }
}

function watchDirectory(directory, settings) {
  let itemPath, itemOptions = {};

  if (Array.isArray(directory)) {
    itemPath = directory[0];
    itemOptions = directory[1];
  } else {
    itemPath = directory;
  }

  if ((settings.watch !== true && itemOptions.watch !== true) || itemOptions.watch !== true) {
    return;
  }

  const delayedCallback = debounce(settings.watchDelay, () => {
    pack(directory, settings);
  });
  const watcher = sane(`${settings.sourceDirectory}${itemPath}`, {
    glob: ['**/*.png', '**/*.jpg']
  });

  watcher.on('ready', () => {
    console.log(logSymbols$1.info, chalk$1.blue(`Started watching ${itemPath} with a delay of ${settings.watchDelay / 1000}s`));
  });
  watcher.on('change', delayedCallback);
  watcher.on('add', delayedCallback);
  watcher.on('delete', delayedCallback);
}

const AssetFile = 'assets.json';

async function main(_file) {
  const settings = await readSettingsFrom(_file),
    directories = settings.directories;

  delete settings.directories;

  if (!settings || !directories) {
    return;
  }

  await packAll(directories, settings);

  watch(directories, settings);
}

function pack$1(_file) {
  main(_file || AssetFile);
}

exports.pack = pack$1;
//# sourceMappingURL=index.js.map
