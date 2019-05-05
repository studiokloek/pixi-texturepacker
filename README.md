# pixi-texturepacker
Pack sprites for PixiJS using TexturePacker CLI.

# Installation
```
npm i @studiokloek/pixi-texturepacker --save-dev
```

# Usage
Create a `asset.json` file in the root of your project, like the one below:

```
{
  "sprites": {
    "sourceDirectory" : "./assets/sprites", 
    "targetDirectory" : "./converted/sprites/",
    "scriptDirectory" : "./script/app/assets/",
    "watch" : true,
    "watchDelay" : 2000,
    "directories": [
      "world/background"
      "world/player",
      "hud"
    ]
  }
}
```

# Requirements
A installation of TexturePacker CLI with a valid licence is required.

# Under development
This module is currently under development and not ready for production.
