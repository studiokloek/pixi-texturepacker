const fs = require('fs-extra');
const set = require('set-value');
const globby = require('globby');

export function makeVariableSafe(value) {
  return value.replace(/(\W)/g, '_').replace(/_{2,}/g, '.').replace(/^_/, '').replace(/_$/, '');
}

export function kebabCase(value) {
  return value
    .replace(/([\da-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
    .toLowerCase();
}

export function getResolutionOfUrl(url, defaultValue) {
  const resolution = /@([\d.]+)x/.exec(url);

  if (resolution) {
    return Number.parseFloat(resolution[1]);
  }

  return defaultValue !== undefined ? defaultValue : 1;
}

export async function fixSpritesheetScaleMeta(jsonPath) {
  // get all generated json
  const paths = await globby(`${jsonPath}/*.json`);

  for (const filepath of paths) {
    // get resolution from filename
    const resolution = getResolutionOfUrl(filepath);

    // read contents of json
    const data = await fs.readJson(filepath);

    // set scale value to resolution
    set(data, 'meta.scale', resolution);

    // write contents back to file
    await fs.writeJson(filepath, data);
  }
}

