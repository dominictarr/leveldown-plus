
var tape = require('tape')
var pull = require('pull-stream')

var LevelDown = require('leveldown')
var LDP = require('../')

var rmrf = require('rimraf')

rmrf.sync('/tmp/test-leveldown')
var db = LDP(LevelDown('/tmp/test-leveldown'), {})
var live = []
db.open(function () {
  pull(
    db.stream({live: true, gte: 'foo', lte: 'foo~'}),
    pull.drain(function (op) {
      live.push(op)
    })
  )

  db.batch([{key: 'foo', value: 'bar', type: 'put'}], function (err) {
    console.log(live)
    db.batch([{key: 'foo2', value: 'bar', type: 'put'}], function (err) {
      console.log(live)
      pull(db.stream({gt: 'a'}), pull.log())
    })
  })
})
