var path = require('path')
var fs = require('fs')
var glob = require('glob')
var findRoot = require('find-root')
var Minimatch = require('minimatch').Minimatch
var formatter = require('esformatter')

var ESFORMATTER_CONFIG = require(path.join(__dirname, 'rc', 'esformatter.json'))
var DEFAULT_IGNORE = [
  'node_modules/**',
  '.git/**',
  '**/*.min.js',
  '**/bundle.js'
]

var MULTI_NEWLINE_N = /((?:\n){3,})/g
var MULTI_NEWLINE_RN = /((?:\r\n){3,})/g

var EOL_SEMICOLON = /;(?=\r?\n)/g
var EOL_SEMICOLON_WITH_COMMENT = /;(?=\s*\/[\/\*][\s\w\*\/]*\r?\n)/g
var SOF_NEWLINES = /^(\r?\n)+/g

module.exports.transform = function (file) {
  file = file
    .replace(MULTI_NEWLINE_N, '\n\n')
    .replace(MULTI_NEWLINE_RN, '\r\n\r\n')

  var formatted = formatter.format(file, ESFORMATTER_CONFIG)
    .replace(EOL_SEMICOLON, '')
    .replace(EOL_SEMICOLON_WITH_COMMENT, '')
    .replace(SOF_NEWLINES, '')

  return formatted
}

module.exports.load = function (opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (!opts) opts = {}

  var root
  try {
    root = findRoot(process.cwd())
  } catch (e) {}

  var ignore = [].concat(DEFAULT_IGNORE) // globs to ignore

  if (root) {
    var packageOpts = require(path.join(root, 'package.json')).standard
    if (packageOpts) ignore = ignore.concat(packageOpts.ignore)
  }

  if (opts.ignore) ignore = ignore.concat(opts.ignore)

  ignore = ignore.map(function (pattern) {
    return new Minimatch(pattern)
  })

  glob(['**/*.js', '**/*.jsx'], {
    cwd: opts.cwd || process.cwd()
  }, function (err, files) {
    if (err) return cb(err)
    files = files.filter(function (file) {
      return !ignore.some(function (mm) {
        return mm.match(file)
      })
    }).map(function (f) {
      return { name: f, data: fs.readFileSync(f).toString() } // assume utf8
    })
    cb(null, files)
  })
}
