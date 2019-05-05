const get = require('get-value');
const set = require('set-value');
const globby = require('globby');
const pupa = require('pupa');
const uppercamelcase = require('uppercamelcase');
const fs = require('fs-extra');

const loaderInfoTemplate = `export const __LOADERINFO__ = {
  fileName : '{fileName}',
  numberOfParts : {numberOfParts},
  type: 'sprites'
};`;

const assetTemplate = `export const {assetName} = {assetData};`;

async function getDataFrom(path) {
  return await fs.readJson(path)
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
      numberOfRelatedPacks = get(firstItem, 'meta.related_multi_packs', { default: [] }).length;

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

function getSortedItems(_itemsData) {
  const itemsSortable = [];

  for (const assetName of Object.keys(_itemsData)) {
      if (_itemsData.hasOwnProperty(assetName)) {
        itemsSortable.push([assetName, _itemsData[assetName]]);
      }
  }

  itemsSortable.sort((a, b) => {
      const x = a[0],
          y = b[0];

      return x < y ? -1 : x > y ? 1 : 0;
  });


  const items =   {};
  for (const item of itemsSortable) {
    items[item[0]] = item[1];
  }

  return items;
}

function generateContents(parsedAssetData, loaderData) {
  let contents = '';

  // assets
  for (const assetName of Object.keys(parsedAssetData)) {
    const items = getSortedItems(parsedAssetData[assetName]);

    let itemsContent = JSON.stringify(items, null, 2);
    itemsContent = itemsContent.replace(/"([^(")"]+)":/g, "$1:");

    contents = `${contents}${pupa(assetTemplate, {
      assetName: assetName,
      assetData: itemsContent
    })}\n`;
  }

  // loader
  contents = `${contents}${pupa(loaderInfoTemplate, {
    fileName: loaderData.fileName,
    numberOfParts: loaderData.numberOfParts
  })}\n`;

  return contents;
}

export async function generateCode(path, settings, itemOptions) {

  const scriptDirectory = get(itemOptions, 'scriptDirectory', {default: settings.scriptDirectory});

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
    }

  const contents = generateContents(parsedAssetData, loaderInfo);
  await fs.outputFile(`${scriptDirectory}${path}/sprites.ts`, contents);
}
