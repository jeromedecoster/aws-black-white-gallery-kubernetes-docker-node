const expect = require('chai').expect
const request = require('supertest')
const path = require('path')

const JPG = path.resolve(__dirname, 'duck.jpg')
const PNG = path.resolve(__dirname, 'duck.png')
const TXT = path.resolve(__dirname, 'duck.txt')
const WEBP = path.resolve(__dirname, 'duck.webp')

const app = require('../app.js')

describe('app.js routes', function () {

    it('GET /', function (done) {
        request(app)
            .get('/')
            .expect(200)
            .end(function (err, res) {
                if (err) return done(err)
                expect(res.text).to.include('API')
                done()
            })
    })

    it('GET /healthcheck', function (done) {
        request(app)
            .get('/healthcheck')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
                if (err) return done(err)
                const data = JSON.parse(res.text)
                expect(data.uptime).to.not.be.NaN
                expect(data.uptime).to.be.above(0)
                done()
            })
    })
})

describe('app.js POST /greyscale', function () {

    it('no file', function (done) {
        request(app)
            .post('/greyscale')
            .expect(400)
            .end(function (err, res) {
                if (err) return done(err)
                expect(res.text).to.match(/file is required/i)
                done()
            })
    })

    it('first file error', function (done) {
        request(app)
            .post('/greyscale')
            .attach('file', TXT)
            .attach('file', PNG)
            .expect(400)
            .end(function (err, res) {
                if (err) return done(err)
                expect(res.text).to.match(/invalid format/i)
                done()
            })
    })

    it('first file ok', function (done) {
        request(app)
            .post('/greyscale')
            .attach('file', JPG)
            .attach('file', TXT)
            .expect(200)
            .end(function (err, res) {
                if (err) return done(err)
                expect(Buffer.isBuffer(res.body)).to.be.true
                expect(res.body[0]).to.be.equal(255)
                expect(res.body[1]).to.be.equal(216)
                expect(res.body[2]).to.be.equal(255)
                done()
            })
    })

    it('invalid format', function (done) {
        request(app)
            .post('/greyscale')
            .attach('file', TXT)
            .expect(400)
            .end(function (err, res) {
                if (err) return done(err)
                expect(res.text).to.match(/invalid format/i)
                done()
            })
    })
    

    it('jpg', function (done) {
        request(app)
            .post('/greyscale')
            .attach('file', JPG)
            .expect(200)
            .expect('Content-Type', /jpeg/)
            .end(function (err, res) {
                if (err) return done(err)
                expect(Buffer.isBuffer(res.body)).to.be.true
                expect(res.body[0]).to.be.equal(255)
                expect(res.body[1]).to.be.equal(216)
                expect(res.body[2]).to.be.equal(255)
                done()
            })
    })

    it('png', function (done) {
        request(app)
            .post('/greyscale')
            .attach('file', PNG)
            .expect(200)
            .expect('Content-Type', /png/)
            .end(function (err, res) {
                if (err) return done(err)
                expect(Buffer.isBuffer(res.body)).to.be.true
                expect(res.body[0]).to.be.equal(0x89)
                expect(res.body[1]).to.be.equal(0x50)
                expect(res.body[2]).to.be.equal(0x4E)
                done()
            })
    })

    it('webp', function (done) {
        request(app)
            .post('/greyscale')
            .attach('file', WEBP)
            .expect(200)
            .expect('Content-Type', /webp/)
            .end(function (err, res) {
                if (err) return done(err)
                expect(Buffer.isBuffer(res.body)).to.be.true
                expect(res.body[8]).to.be.equal(87)
                expect(res.body[9]).to.be.equal(69)
                expect(res.body[10]).to.be.equal(66)
                done()
            })
    })
})

