const expect = require('chai').expect

var id
var secret
var bucket
var region
var port

describe('server.js', function () {

    beforeEach(function () {
        id = process.env.AWS_ACCESS_KEY_ID
        secret = process.env.AWS_SECRET_ACCESS_KEY
        bucket = process.env.AWS_S3_BUCKET
        region = process.env.AWS_REGION
        port = process.env.STORAGE_PORT
    })

    afterEach(function () {
        process.env.AWS_ACCESS_KEY_ID = id
        process.env.AWS_SECRET_ACCESS_KEY = secret
        process.env.AWS_S3_BUCKET = bucket
        process.env.AWS_REGION = region
        process.env.STORAGE_PORT = port
    })

    it('variable AWS_ACCESS_KEY_ID must be defined', function (done) {
        try {
            delete process.env.AWS_ACCESS_KEY_ID
            process.env.AWS_SECRET_ACCESS_KEY = 'secret'
            process.env.AWS_S3_BUCKET = 'bucket'
            process.env.AWS_REGION = 'region'
            process.env.STORAGE_PORT = 5000
            require('../server.js')
        } catch (err) {
            expect(process.env.AWS_ACCESS_KEY_ID).to.be.undefined
            expect(err.message).to.include('AWS_ACCESS_KEY_ID')
            expect(err.message).to.include('required')
            done()
        }
    })

    it('variable AWS_ACCESS_KEY_ID can not be blank', function (done) {
        try {
            process.env.AWS_ACCESS_KEY_ID = ''
            process.env.AWS_SECRET_ACCESS_KEY = 'secret'
            process.env.AWS_S3_BUCKET = 'bucket'
            process.env.AWS_REGION = 'region'
            process.env.STORAGE_PORT = 5000
            require('../server.js')
        } catch (err) {
            expect(err.message).to.include('AWS_ACCESS_KEY_ID')
            expect(err.message).to.include('required')
            done()
        }
    })

    it('variable AWS_SECRET_ACCESS_KEY must be defined', function (done) {
        try {
            process.env.AWS_ACCESS_KEY_ID = 'id'
            delete process.env.AWS_SECRET_ACCESS_KEY
            process.env.AWS_S3_BUCKET = 'bucket'
            process.env.AWS_REGION = 'region'
            process.env.STORAGE_PORT = 5000
            require('../server.js')
        } catch (err) {
            expect(process.env.AWS_SECRET_ACCESS_KEY).to.be.undefined
            expect(err.message).to.include('AWS_SECRET_ACCESS_KEY')
            expect(err.message).to.include('required')
            done()
        }
    })

    it('variable AWS_S3_BUCKET must be defined', function (done) {
        try {
            process.env.AWS_ACCESS_KEY_ID = 'id'
            process.env.AWS_SECRET_ACCESS_KEY = 'secret'
            delete process.env.AWS_S3_BUCKET
            process.env.AWS_REGION = 'region'
            process.env.STORAGE_PORT = 5000
            require('../server.js')
        } catch (err) {
            expect(process.env.AWS_S3_BUCKET).to.be.undefined
            expect(err.message).to.include('AWS_S3_BUCKET')
            expect(err.message).to.include('required')
            done()
        }
    })

    it('variable AWS_REGION must be defined', function (done) {
        try {
            process.env.AWS_ACCESS_KEY_ID = 'id'
            process.env.AWS_SECRET_ACCESS_KEY = 'secret'
            process.env.AWS_S3_BUCKET = 'bucket'
            delete process.env.AWS_REGION
            process.env.STORAGE_PORT = 5000
            require('../server.js')
        } catch (err) {
            expect(process.env.AWS_REGION).to.be.undefined
            expect(err.message).to.include('AWS_REGION')
            expect(err.message).to.include('required')
            done()
        }
    })

    it('variable STORAGE_PORT must be defined', function (done) {
        try {
            process.env.AWS_ACCESS_KEY_ID = 'id'
            process.env.AWS_SECRET_ACCESS_KEY = 'secret'
            process.env.AWS_S3_BUCKET = 'bucket'
            process.env.AWS_REGION = 'region'
            delete process.env.STORAGE_PORT
            require('../server.js')
        } catch (err) {
            expect(process.env.STORAGE_PORT).to.be.undefined
            expect(err.message).to.include('STORAGE_PORT')
            expect(err.message).to.include('required')
            done()
        }
    })
})
