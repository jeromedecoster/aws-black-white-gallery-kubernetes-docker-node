const debug = require('debug')('website')
const FormData = require('form-data')
const nunjucks = require('nunjucks')
const express = require('express')
const multer = require('multer')
const got = require('got')


const CONVERT_HOST = process.env.CONVERT_HOST || (process.env.DOCKER_COMPOSE ? 'convert' : 'localhost')
const CONVERT_PORT = process.env.CONVERT_PORT || '4000'

debug('CONVERT_HOST + CONVERT_PORT:', `http://${CONVERT_HOST}:${CONVERT_PORT}`)

const STORAGE_HOST = process.env.STORAGE_HOST || (process.env.DOCKER_COMPOSE ? 'storage' : 'localhost')
const STORAGE_PORT = process.env.STORAGE_PORT || '5000'

debug('STORAGE_HOST + STORAGE_PORT:', `http://${STORAGE_HOST}:${STORAGE_PORT}`)

const app = express()

nunjucks.configure("views", {
    express: app,
    autoescape: false,
    noCache: true
})

app.set('view engine', 'njk')

const upload = multer({ storage: multer.memoryStorage() })

app.get('/', async (req, res) => {

    try {
        const result = await got.get(`http://${STORAGE_HOST}:${STORAGE_PORT}/photos`).json()
        debug('GET / result:', result)
        return res.render('index', {files:result} )

    } catch (err) {
        debug('GET / err:', err)
        return res.status(400).send(err.message)
    }
    
})

const getFormData = (buffer, filename) => {
    const fd = new FormData()
    // https://stackoverflow.com/a/43914175
    fd.append('file', buffer, filename)
    return fd
}

app.post('/upload', upload.single('file'), async (req, res) => {
    try {

        let body = getFormData(req.file.buffer, req.file.originalname)
        debug('POST /greyscale body:', body)
        let image = await got.post(`http://${CONVERT_HOST}:${CONVERT_PORT}/greyscale`, {body}).buffer()
        debug('POST /greyscale result image:', image)

        body = getFormData(image, req.file.originalname)
        debug('POST /upload body:', body)
        let result = await got.post(`http://${STORAGE_HOST}:${STORAGE_PORT}/upload`, {body})
        debug('POST /upload result image:', image)

        res.redirect('/')

    } catch (err) {
        return res.status(400).send(err.message)
    }
})

module.exports = app