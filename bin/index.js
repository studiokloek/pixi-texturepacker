#!/usr/bin/env node
import meow from 'meow';
import { pack } from '../dist/index.js';

const cli = meow(`
	Usage
	  $ pixi-texturepacker <asset settings file>

	Examples
	  $ pixi-texturepacker assets.json
`, {
	importMeta: import.meta,
});

pack(cli.input[0]);
