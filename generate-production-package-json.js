'use strict'

const fs = require('fs')
let rawdata = fs.readFileSync('package.json')
let config = JSON.parse(rawdata)
config.scripts = {}
config.scripts.start = 'node index.js'
delete config.devDependencies
fs.writeFileSync('dist/package.json', JSON.stringify(config))
