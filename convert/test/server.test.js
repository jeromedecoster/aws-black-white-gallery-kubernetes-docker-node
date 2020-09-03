const expect = require('chai').expect

var port

describe('server.js', function () {

    beforeEach(function () {
        port = process.env.CONVERT_PORT
    })

    afterEach(function () {
        process.env.CONVERT_PORT = port
    })

    it('variable CONVERT_PORT must be defined', function (done) {
        try {
            delete process.env.CONVERT_PORT
            require('../server.js')
        } catch (err) {
            expect(process.env.CONVERT_PORT).to.be.undefined
            expect(err.message).to.include('CONVERT_PORT')
            expect(err.message).to.include('required')
            done()
        }
    })

    it('variable CONVERT_PORT cannot be blank', function (done) {
        try {
            process.env.CONVERT_PORT = ''
            require('../server.js')
        } catch (err) {
            expect(err.message).to.include('CONVERT_PORT')
            expect(err.message).to.include('required')
            done()
        }
    })
})