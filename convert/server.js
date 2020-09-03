const app = require('./app.js')

if (process.env.CONVERT_PORT == null || process.env.CONVERT_PORT.length == 0) { 
    throw new Error('CONVERT_PORT environment variable is required')
}

app.listen(process.env.CONVERT_PORT, () => { 
    console.log(`Listening on port ${process.env.CONVERT_PORT}`) 
})