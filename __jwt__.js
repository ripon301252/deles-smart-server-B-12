/**
 * 1. after login : server will create a jwt token
 * 2. store it in the client side (localstorage, http only cookies, in memory)
 * 3. For asking for sensitive data: send a request with jwt token in the header
 * 4. server will verify the token. if token is valid; then will provide the data
 * 
 * 
 * 

 * ------------------Access token vs Refresh token---------------------
 * 
 */



/**
 * 1st write = node
 * jwt Secret powershell command = require('crypto').randomBytes(64).toString('hex')
 */