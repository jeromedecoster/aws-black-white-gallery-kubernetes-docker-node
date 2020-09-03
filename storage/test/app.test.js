const expect = require('chai').expect
const request = require('supertest')
const path = require('path')

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

    it('GET /photos', function (done) {
        this.timeout(5000)
        request(app)
            .get('/photos')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
                if (err) return done(err)
                const data = JSON.parse(res.text)
                expect(data.length).to.not.be.NaN
                done()
            })
    })

    // it('POST /upload', function (done) {
    //     this.timeout(5000)
    //     request(app)
    //         .post('/upload')
    //         .attach('file', path.resolve(__dirname, 'duck.jpg'))
    //         .expect(200)
    //         .end(function (err, res) {
    //             if (err) return done(err)
    //             expect(res.text).to.match(/^https/)
    //             done()
    //         })
    // })
})