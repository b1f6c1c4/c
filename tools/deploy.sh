#!/usr/bin/env node

const config = require('../src/config');
const { spawnSync } = require('child_process');
spawnSync('/usr/bin/env', config.deploy);
