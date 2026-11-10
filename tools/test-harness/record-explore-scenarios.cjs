'use strict';

// record-explore.cjs のシナリオ。グループごとに scenario(name, fn, { slow }) を登録する関数を並べる。
module.exports = [
  require('./record-explore-zip.cjs'),
  require('./record-explore-records.cjs'),
  require('./record-explore-process.cjs')
].map(group => group.register);
