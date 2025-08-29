function hi() {
  console.log("Hello World!");
}
hi();
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
class PluginManager {
  constructor(_0x192c47) {
    this.directory = _0x192c47;
  }
  async getPluginFiles(_0x88669c) {
    const _0x247e44 = await fsp.readdir(_0x88669c);
    return _0x247e44.filter(_0x188f41 => _0x188f41.endsWith(".js")).map(_0x4bbebe => path.join(_0x88669c, _0x4bbebe));
  }
  async executePlugin(_0x12bb77, _0x1aaaf0) {
    try {
      const _0x3d3ce9 = await this.getPluginFiles(this.directory);
      for (const _0x4e7dd6 of _0x3d3ce9) {
        const _0x38c882 = require(_0x4e7dd6);
        if (Array.isArray(_0x38c882)) {
          const _0x1e3a7f = _0x38c882.find(_0xb09f4 => _0xb09f4.command.includes(_0x1aaaf0));
          if (_0x1e3a7f) {
            console.log("[❄ KANGO-XMD❄️] Loading plugin: " + _0x4e7dd6);
            await _0x1e3a7f.operate(_0x12bb77);
            delete require.cache[require.resolve(_0x4e7dd6)];
            console.log("[❄ KANGO-XMD❄] Plugin unloaded: " + _0x4e7dd6);
            return true;
          }
        }
      }
    } catch (_0x300779) {
      console.error("Error executing command: " + _0x1aaaf0, _0x300779);
    }
    return false;
  }
}
module.exports = PluginManager;