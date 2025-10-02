const http = require('http');
const nodeStatic = require('node-static'); // Or any other static file server library

const file = new nodeStatic.Server('./', { cache: false }); // Disable internal caching

http.createServer(function (request, response) {
    request.addListener('end', function () {
        response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.setHeader('Pragma', 'no-cache');
        response.setHeader('Expires', '0');
        file.serve(request, response);
    }).resume();
}).listen(3000);

console.log('Server running on http://localhost:3000');