const app = require('./app.js')

// check required ENV vars
const VARS = [
    'AWS_ACCESS_KEY_ID', 
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET',
    'AWS_REGION',
    'STORAGE_PORT'
]
for (var name of VARS) {
    if (process.env[name] == null || process.env[name].length == 0) { 
        throw new Error(`${name} environment variable is required`)
    }
}

app.listen(process.env.STORAGE_PORT, () => { 
    console.log(`Listening on port ${process.env.STORAGE_PORT}`) 
})