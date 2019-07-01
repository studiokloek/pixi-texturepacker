import { makeVariableSafe } from './util';

const fs = require('fs-extra');
const get = require('get-value');
const set = require('set-value');
const globby = require('globby');
const pupa = require('pupa');
const uppercamelcase = require('uppercamelcase');
const camelcase = require('camelcase');
const path = require('path');

const loaderInfoTemplate = `export default {
  fileName : '{fileName}',
  numberOfParts : {numberOfParts},
  type: 'sprites'
};`;

const assetTemplate = `export const {assetName} = {assetData};`;

function convertPathToVariableName(filePath, basePath) {
  // forceer string
  filePath = `${filePath}`;

  // basepath er af halen, path splitsen en opschonen
  let parts = filePath.replace(`${basePath}/`, '').split('/').map(makeVariableSafe);

  // haal laatste onderdeel er af
  let lastPart = parts.pop();
  lastPart = lastPart.toUpperCase();

  // camelcase andere onderdelen
  parts = parts.map(camelcase);

  // haal titel elementen uit base path
  let titleParts = basePath.split('/');
  titleParts = titleParts.slice(titleParts.length - (titleParts.length === 1 ? 1 : 2));

  // eerste part wordt onderdeel van titel
  // if (parts.length > 0) {
  //   titleParts.push(parts.shift());
  // }

  titleParts.push('sprites');
  titleParts = uppercamelcase(titleParts.join('-'));

  if (parts.length > 0) {
    filePath = parts.join('.');
    filePath = filePath.replace(/(\W^\.)/g, '').replace(/\.{2,}/g, '.').replace(/^\./, '').replace(/\.$/, '');
    return [titleParts, filePath, lastPart].join('.');
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

function parseAssetData(allAssetData, assetPath, includeSizeInfo) {

  // bepaal base path
  const basePath = assetPath,
    parsedData = {};

  for (const assetData of allAssetData || []) {
    for (const framePath of Object.keys(assetData.frames)) {
      let assetInfo;
      if (includeSizeInfo) {
        // haal frame info op
        const frameInfo = assetData.frames[framePath];
        assetInfo = {
          id: framePath,
          width: frameInfo.sourceSize.w,
          height: frameInfo.sourceSize.h,
        };
      } else {
        assetInfo = framePath
      }

      // haal frame info op
      set(parsedData, convertPathToVariableName(framePath, basePath), assetInfo);
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

  const items = {};
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

function getScriptPath(assetPath, scriptDirectory) {
  const assetParts = assetPath.split('/'),
    assetName = assetParts.pop();

  if (assetParts.length < 2) {
    assetParts.push(assetName);
  }

  assetPath = assetParts.join('/');

  return `${path.join(scriptDirectory, assetPath)}/assets/sprites-${assetName}.ts`;
}


export async function generateCode(assetPath, settings, itemOptions) {
  const scriptDirectory = get(itemOptions, 'scriptDirectory', settings.scriptDirectory),
    includeSizeInfo = get(itemOptions, 'includeSizeInfo', settings.includeSizeInfo);

  // read all generated json
  const paths = await globby(`${path.join(settings.targetDirectory, assetPath)}/*[1-9]+.json`),
    actions = [];

  for (const filepath of paths) {
    actions.push(await fs.readJson(filepath));
  }


  // parse data to object
  const allAssetData = await Promise.all(actions),
    parsedAssetData = parseAssetData(allAssetData, assetPath, includeSizeInfo),
    loaderInfo = {
      fileName: assetPath,
      numberOfParts: getNumberOfParts(allAssetData)
    }

  const contents = generateContents(parsedAssetData, loaderInfo),
    scriptpath = getScriptPath(assetPath, scriptDirectory);

  await fs.outputFile(scriptpath, contents);
}
