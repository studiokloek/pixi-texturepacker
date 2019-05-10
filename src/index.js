import { readSettingsFrom } from './lib/settings';
import { watch } from './lib/watcher';
import { packAll } from './lib/packer';

const AssetFile = 'assets.json';

async function main(_file) {
  const settings = await readSettingsFrom(_file),
    directories = settings.directories;

  delete settings.directories;

  if (!settings || !directories) {
    return;
  }

  await packAll(directories, settings);

  await watch(directories, settings);
}

export function pack(_file) {
  main(_file || AssetFile);
}
