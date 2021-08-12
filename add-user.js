require('dotenv-flow').config();
const http = require('http')

const addUser = async () => {
  const args = process.argv.slice(2);

  const data = JSON.stringify({
    artist: args[0],
    pw: args[1],
    secret: args[2]
  })

  const options = {
    hostname: args[3],
    port: args[4],
    path: '/api/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }

  const req = http.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`)

    res.on('data', data => {
      const _res = JSON.parse(data);

      if (_res.type === 'success') return console.log('Successfully created user.');
      else return console.error(res.err);
    })
  })

  req.on('error', error => {
    console.error(error)
  })

  req.write(data)
  req.end()
}

addUser();
