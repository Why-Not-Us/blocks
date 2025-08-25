var _ = require('underscore')
var polka = require('polka')

var about = require('./routes/about')
var user = require('./routes/user')
var block = require('./routes/block')
var raw = require('./routes/raw')
var static = require('./lib/static')
var fetchCache = require('./lib/fetch-cache')

var exec = require('await-exec')
var argv = require('minimist')(process.argv.slice(2))

var PORT = argv.port || 3002
var DEV = argv.dev

function createApp() {
  return polka()
    .use((req, res, next) => {
      if (req.query.cachebust) fetchCache.bust()
      next()
    })
    .get('/static/:file', (req, res) => {
      if (DEV) static = requireUncached('./lib/static')
      static(req, res)
    })
    .get('/cachebust', (req, res) => {
      fetchCache.bust()
      res.writeHead(301, {Location: '/'})
    })
    .get('/', (req, res) => {
      if (DEV) about = requireUncached('./routes/about')
      about(req, res)
    })
    .get('/:user', (req, res) => {
      if (DEV) user = requireUncached('./routes/user')
      user(req, res)
    })
    .get('/:user/:id', (req, res) => {
      if (DEV) block = requireUncached('./routes/block')
      block(req, res)
    })
    .get('/:user/raw/:id/:file?', (req, res) => {
      // redirect to add a slash
      if (!req.file && req.url.at(-1) != '/' && !req.url.includes('index.html')){
        res.statusCode = 302
        res.setHeader('Location', `${req.url}/`)
        res.end()
      } else {
        if (DEV) raw = requireUncached('./routes/raw')
        req.params.sha = undefined
        raw(req, res)
      }
    })
    .get('/:user/:id/raw/:sha/:file?', (req, res) => {
      if (!req.file && req.url.at(-1) != '/' && !req.url.includes('index.html')){
        // redirect to add a slash if file is missing and not index.html
        res.statusCode = 302
        res.setHeader('Location', `${req.url}/`)
        res.end()
      } else {
        if (DEV) raw = requireUncached('./routes/raw')
        raw(req, res) // req.params.sha points to specific gist revision
      }
    })
}

// Export for Vercel
module.exports = createApp().handler

// Local dev (node index.js)
if (!process.env.VERCEL) {
  const app = createApp()
  app.listen(PORT, err => {
    if (err) throw err
    console.log(`http://localhost:${PORT}`)
  })
}


function requireUncached(module){
  delete require.cache[require.resolve(module)]
  return require(module)
}

