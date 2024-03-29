import { kebabCase } from './util';
import defaults from 'object.defaults/mutable.js';
import { promisify } from 'util';
import { exec } from 'child_process';
const execProcess = promisify(exec);

const baseOptions = {
  'format': 'pixijs4',
  'texture-format': 'png',
  'jpg-quality': 100,
  'max-size': 2048,
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
  'shape-padding': '2',
  'variant': ['1:@2x', '0.5:']
};

export async function packFolder(path, options, settings) {
  const command = buildTexturePackerCommand(path, defaults(options, baseOptions), settings);

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

const RESOLUTION_PREFIXES = {
  1: '',
  2: '@2x',
  3: '@3x',
  4: '@4x',
}

function buildTexturePackerCommand(path, options, settings) {
  options = options || {};
  settings = settings || {};

  if (options.extrude === '1') {
    options['shape-padding'] = 0;
  }

  if (options['texture-format'] === 'jpg') {
    options['alpha-handling'] = 'ReduceBorderArtifacts';
  }

  // determine variants
  if (Array.isArray(settings.resolutions) && typeof settings.originalResolution === 'number') {
    const variants = [];

    for (const resolution of settings.resolutions) {
      const prefix = RESOLUTION_PREFIXES[resolution];

      if (prefix !== undefined) {
        variants.push(`${resolution/settings.originalResolution}:${prefix}`);
      }
    }

    options['variant'] = variants;
  }

  const command = new TexturePackerCommand();
  command.addPath(`${path}`);
  for (const option of Object.keys(options)) {
    command.addOption(option, options[option]);
  }

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
      option: `--${kebabCase(option)}`,
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

    value = value === true ? '' : ` ${value}`;

    return `${option}${value}`;
  }
}
