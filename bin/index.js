#!/usr/bin/env node
'use strict';
const meow = require('meow');
const {pack} = require('../dist');

const cli = meow(`
	Usage
	  $ pixi-texturepacker <asset settings file>

	Examples
	  $ pixi-texturepacker assets.json
`);

pack(cli.input[0]);
