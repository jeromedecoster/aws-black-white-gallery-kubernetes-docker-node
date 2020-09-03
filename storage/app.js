const debug = require('debug')('storage')
const express = require('express')
const multer = require('multer')
const AWS = require('aws-sdk')

const app = express()

var upload = multer({ storage: multer.memoryStorage() })

debug('credentials',AWS.config.credentials)

const s3 = new AWS.S3({})

app.get('/', (req, res) => {
    res.send('storage API')
})

app.get('/healthcheck', (req, res) => {
    res.json({ uptime: process.uptime() })
})

app.get('/photos', async (req, res) => {
    const params = { Bucket: process.env.AWS_S3_BUCKET }
    try {

        const result =  await s3.listObjectsV2(params).promise()
        debug('result', result)
        // sort by newest first
        const sorted = result.Contents.sort((a, b) => b.LastModified - a.LastModified)
        // sorted.reverse()
        debug('sorted', sorted)
        let arr = []
        for (var content of sorted) {
            arr.push(`https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${content.Key}`)
        } 
        
        return res.json(arr)
    } catch(err) {
        return res.status(400).send(`Error: ${err.message}`)
    }
    
    
})

// curl --request POST --form "file=@test/duck.jpg" --form "name=duck.jpg" --silent http://localhost:5000/upload
app.post('/upload', upload.any(), async (req, res) => {
    debug('req.files:', req.files)
    if (req.files == undefined || req.files.length == 0) {
        return res.status(400).send('Field file is required')
    }
    const file = req.files.find(e => e.fieldname == 'file')
    debug('file:', file)
    
    const params = {
        ContentType: 'image',
        Bucket: process.env.AWS_S3_BUCKET,
        Key: file.originalname,
        Body: file.buffer,
        ACL : 'public-read'
    }
    
    try {
        const result =  await s3.upload(params).promise()
        debug('result:', result)
        return res.send(result.Location)
    } catch(err) {
        return res.status(400).send(`Error: ${err.message}`)
    }
})

module.exports = app