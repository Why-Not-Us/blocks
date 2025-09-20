
var fetchCache = require('./../lib/fetch-cache')
var io = require('indian-ocean')
var _ = require('underscore')
var d3 = require('d3')

var e = _.escape

// Fetch and cache starred gists for a user
async function dlStarredGists(user, token = '', maxPages = 3) {
  // If token is provided, use /gists/starred for the authenticated user
  if (token) {
    var responses = []
    var page = 1
    var perPage = 100
    do {
      var url = `https://api.github.com/gists/starred?page=${page}&per_page=${perPage}`
      var response = await fetchCache(url, 'json', token)
      responses.push(response)
      page++
    } while (response.length === 100 && page <= maxPages)
    return _.flatten(responses)
      .map(gist => ({
        id: gist.id,
        description: gist.description,
        public: gist.public,
        owner: gist.owner ? gist.owner.login : null
      }))
      .filter(d => d.id)
      .filter((d) => !d.description?.match(/unlisted/i));
  } else {
    // No token, cannot fetch starred gists
    return [];
  }
}

// Get starred gists, cache to usercache/<username>-starred.csv
async function getStarredGists(user, token) {
  var path = __dirname + `/../usercache/${user}${token}-starred.csv`
  var cachedStarred = []
  var maxPages = 0
  try {
    cachedStarred = io.readDataSync(path)
    cachedStarred.forEach(d => d.public = d.public == 'true')
  } catch (e) {
    maxPages = 3
  }

  let starred = [];
  let error = null;
  try {
    starred = await dlStarredGists(user, token, maxPages)
  } catch (e) {
    error = e && e.message ? e.message : 'Unknown error';
  }
  var isId = {}
  starred.forEach(d => isId[d.id] = true)
  cachedStarred.forEach(d => isId[d.id] ? '' : starred.push(d))

  // download & save full list of starred gists after making request
  !(async function(){
    try {
      var currentStarred = await dlStarredGists(user, token)
      if (currentStarred.length > 0) io.writeData(path, currentStarred, d => d)
    } catch (e) {}
  })()

  return {starred, error, tokenMissing: !token};
}

async function dlGists(user, token='', maxPages=11){
  var responces = []
  var responce = null
  var page = 1
  var perPage = maxPages == 11 ? 100 : 10
  do {
    var url = `https://api.github.com/users/${user}/gists?page=${page}&per_page=${perPage}`
    var responce = await fetchCache(url, 'json', token)
    responces.push(responce)
    page++
  } while (responce.length == 100 && page < maxPages)

  return _.flatten(responces)
    .map(gist => ({
      id: gist.id,
      description: gist.description,
      public: gist.public
    }))
    .filter(d => d.id)
    .filter((d) => !d.description?.match(/unlisted/i));
}

async function getGists(user, token){
  var path = __dirname + '/../usercache/' + user + token + '.csv'

  var cachedGists = []
  var maxPages = 0
  try {
    cachedGists = io.readDataSync(path)
    cachedGists.forEach(d => d.public = d.public == 'true')
  } catch (e) {
    maxPages = 11
  }

  // misses gists if someone makes a 10+ gists between caches
  var gists = await dlGists(user, token, maxPages)

  var isId = {}
  gists.forEach(d => isId[d.id] = true)

  cachedGists.forEach(d => isId[d.id] ? '' : gists.push(d))

  // download & save full list of gists after making request 
  !(async function(){
    var currentGists = await dlGists(user, token)
    if (currentGists.length > 0) io.writeData(path, currentGists, d => d)
  })()

  return gists
}

function generateHTML(user, gists){
  var title =  `blocks by ${e(user)}`
  var titleURL =  `<a href='/'>blocks</a> by  ${e(user)}`

  return `<!DOCTYPE html>
  <meta charset='utf-8'>
  <link rel="icon" href="data:;base64,iVBORw0KGgo=">
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <link rel='stylesheet' href='/static/style.css'>
  <title>${title}</title>
  <div class='username'>${titleURL}</div>

  <div class="tab-bar">
    <button id="tab-my-blocks" class="tab active">My Blocks</button>
    <button id="tab-starred-blocks" class="tab">Starred Blocks</button>
  </div>

  <div id='gist-list'>
  ${gists.filter(d => d && d.id).map(gist => `
    <a class="block-thumb ${gist.public ? '' : 'block-private'}"
      style="background-position: center; background-image:url('https://gist.githubusercontent.com/${user}/${gist.id}/raw/thumbnail.png')"
      href="/${user}/${gist.id}">
      <p>${gist.public ? '' : '🔒 '}${e(gist.description || gist.id.substr(0, 20))}</p>
    </a>
  `).join(' ')}
  </div>

  <div id='starred-list' style='display:none'></div>

  <script>
    const tabMy = document.getElementById('tab-my-blocks');
    const tabStarred = document.getElementById('tab-starred-blocks');
    const gistList = document.getElementById('gist-list');
    const starredList = document.getElementById('starred-list');

    tabMy.onclick = function() {
      tabMy.classList.add('active');
      tabStarred.classList.remove('active');
      gistList.style.display = '';
      starredList.style.display = 'none';
    };
      tabStarred.onclick = async function() {
        tabStarred.classList.add('active');
        tabMy.classList.remove('active');
        gistList.style.display = 'none';
        starredList.style.display = '';
        if (!starredList.innerHTML) {
          starredList.innerHTML = '<p>Loading...</p>';
          // Get token from URL if present
          const urlParams = new URLSearchParams(window.location.search);
          const token = urlParams.get('token');
          let apiUrl = '/${user}/starred';
          if (token) apiUrl += '?token=' + encodeURIComponent(token);
          const res = await fetch(apiUrl);
          const result = await res.json();
          starredList.innerHTML = '';
          if (result.error) {
            starredList.innerHTML = '<p>Error loading starred blocks: ' + result.error + '</p>';
            return;
          }
          if (result.tokenMissing) {
            starredList.innerHTML = '<p>You must provide a GitHub token to view starred gists.</p>';
            return;
          }
          if (!result.starred || !result.starred.length) {
            starredList.innerHTML = '<p>No starred blocks found for this user.</p>';
            return;
          }
          result.starred.forEach(gist => {
            const owner = gist.owner ? gist.owner : '';
            const desc = gist.description || gist.id.substr(0, 20);
            const priv = gist.public ? '' : 'block-private';
            const lock = gist.public ? '' : '🔒 ';
            const a = document.createElement('a');
            a.className = 'block-thumb ' + priv;
            a.href = '/' + owner + '/' + gist.id;
            a.style.backgroundPosition = 'center';
            a.style.backgroundImage = "url('https://gist.githubusercontent.com/" + owner + "/" + gist.id + "/raw/thumbnail.png')";
            const p = document.createElement('p');
            p.textContent = lock + (owner ? owner + ': ' : '') + desc;
            a.appendChild(p);
            starredList.appendChild(a);
          });
        }
      };
  </script>
  `
}

module.exports = async function get(req, res, next) {
  var user = req.params.user
  var token = req.query.token || ''
  var gists = await getGists(req.params.user, token)

  // redirect if user doesn't exist and there's a gist id with their user name
  // /397f1b0905400b83fcea4008fb4ccdb1 -> /1wheel/397f1b0905400b83e4008fb4ccdb1
  if (!gists.length){
    var url = `https://api.github.com/gists/${user}`
    var gist = await fetchCache(url, 'json')

    if (gist && gist.owner){
      res.writeHead(301, {Location: `/${gist.owner.login}/${user}`})
      return res.end('')
    }
  }

  var html = generateHTML(user, gists)
  res.writeHead(200, {'Content-Type': 'text/html'})
  res.end(html)
}

// Export getStarredGists for API use
module.exports.getStarredGists = getStarredGists
