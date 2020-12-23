import { makeVariableSafe } from './util';

const findUp = require('find-up');
const fs = require('fs-extra');
const get = require('get-value');
const set = require('set-value');
const globby = require('globby');
const pupa = require('pupa');
const uppercamelcase = require('uppercamelcase');
const camelcase = require('camelcase');
const path = require('path');

const loaderInfoTemplate = `export default {
  assets: {assetsVariable},
  fileName : '{fileName}',
  numberOfParts : {numberOfParts},
  type: 'sprites'
};`;

const assetTemplate = `export const {assetName} = {assetData};`;

function convertPathToVariableName(filePath, basePath) {
  // forceer string
  filePath = `${filePath}`;

  // basepath er af halen, path splitsen en opschonen
  let parts = filePath.replace(`${basePath}/`, '').split('/').map(value => makeVariableSafe(value));

  // haal laatste onderdeel er af
  let lastPart = parts.pop();
  lastPart = lastPart.toUpperCase();

  // camelcase andere onderdelen
  parts = parts.map(part => camelcase(part));

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

async function getAssetMetaData(allAssetData, assetPath, settings, itemOptions) {
  const includeSizeInfo = get(itemOptions, 'includeSizeInfo', settings.includeSizeInfo),
  includePNGExpressMetadata = get(itemOptions, 'includePNGExpressMetadata', settings.includePNGExpressMetadata);

  const AssetMetaData = {}
  if (!includeSizeInfo && !includePNGExpressMetadata) {
    return AssetMetaData;
  }
  
  // check for PNGExpress meta data file?
  if (includePNGExpressMetadata) {
    try {
      const metaDataFile = await findUp('pngexpress-metadata.json', {cwd:path.join(settings.sourceDirectory, assetPath), type:'file'}) 
      
      if (metaDataFile) {
        const relativePath = `${path.relative(metaDataFile, path.join(settings.sourceDirectory, assetPath)).replace('../', '')}/`,
          metaFromFile = await fs.readJson(metaDataFile);

        for (const assetInfo of metaFromFile.assets) {
          for (const state of assetInfo.states) {            
            // get asset id, remove ducplicate part of path
            let id = assetPath + assetInfo.id.replace(relativePath, '');

            // remove starting slash
            id = (id[0] === '/') ? id.slice(1) : id;

            // add state
            id = state === 'default' ? id : id + state;

            const meta = {
              ...assetInfo,
            }

            delete meta.id;
            delete meta.states;

            AssetMetaData[id] = meta;
          }
        }

        return AssetMetaData;
      }
    } catch(error) { 
      console.log(error) 
    }
  }

  for (const textureInfo of allAssetData || []) {
    for (const textureFramePath of Object.keys(textureInfo.frames)) {
      const frameInfo = textureInfo.frames[textureFramePath];
      
      AssetMetaData[textureFramePath] = {
        id: textureFramePath,
        width: frameInfo.sourceSize.w,
        height: frameInfo.sourceSize.h,
      }  
    }
  }

  return AssetMetaData;
}

async function parseAssetData(allAssetData, assetPath, settings, itemOptions) {
  const AssetMetaData = await getAssetMetaData(allAssetData, assetPath, settings, itemOptions);

  // bepaal base path
  const basePath = assetPath,
    parsedData = {};

  for (const assetData of allAssetData || []) {
    for (const framePath of Object.keys(assetData.frames)) {
      // always use framepath as info
      let assetInfo = framePath;

      // get and set asset meta info
      if (AssetMetaData[framePath]) {
        assetInfo = {
          id: framePath,
          ...AssetMetaData[framePath]
        }
      }

      set(parsedData, convertPathToVariableName(framePath, basePath), assetInfo);
    }
  }

  return parsedData;
}

function getSortedItems(_itemsData) {
  const itemsSortable = [];

  for (const assetName of Object.keys(_itemsData)) {
    if (Object.prototype.hasOwnProperty.call(_itemsData, assetName)) {
      itemsSortable.push([assetName, _itemsData[assetName]]);
    }
  }

  itemsSortable.sort((a, b) => {
    const x = a[0],
      y = b[0];

    return x < y ? -1 : (x > y ? 1 : 0);
  });

  const items = {};
  for (const item of itemsSortable) {
    items[item[0]] = item[1];
  }

  return items;
}

function generateContents(parsedAssetData, loaderData) {
  let contents = '';

  const assetName = Object.keys(parsedAssetData)[0];
  const items = getSortedItems(parsedAssetData[assetName]);

  let itemsContent = JSON.stringify(items, undefined, 2);
  itemsContent = itemsContent.replace(/"([^"()]+)":/g, "$1:");

  contents = `${contents}${pupa(assetTemplate, {
    assetName: assetName,
    assetData: itemsContent
  })}\n`;

  // loader
  contents = `${contents}${pupa(loaderInfoTemplate, {
    assetsVariable: assetName,
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
  const scriptDirectory = get(itemOptions, 'scriptDirectory', settings.scriptDirectory);

  // read all generated json
  const paths = await globby(`${path.join(settings.targetDirectory, assetPath)}/*[0-9]+.json`),
    actions = [];

  for (const filepath of paths) {
    actions.push(fs.readJson(filepath));
  }

  // parse data to object
  const allTextureInfo = await Promise.all(actions);

  const parsedAssetData = await parseAssetData(allTextureInfo, assetPath, settings, itemOptions),
    loaderInfo = {
      fileName: assetPath,
      numberOfParts: getNumberOfParts(allTextureInfo)
    };

  const contents = generateContents(parsedAssetData, loaderInfo),
    scriptpath = getScriptPath(assetPath, scriptDirectory);

  await fs.outputFile(scriptpath, contents);
}
