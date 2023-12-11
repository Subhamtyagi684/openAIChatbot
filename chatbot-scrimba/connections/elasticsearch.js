/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
var elasticsearch = require('@elastic/elasticsearch')
const dotenv = require('dotenv')
dotenv.config()

const domain = process.env.ELASTICURL;

// ConnectionError: connect ECONNREFUSED 127.0.0.1:9200
let client = new elasticsearch.Client({
	node: domain,
	auth: {
		username: process.env.ELASTICUSER,
		password: process.env.ELASTICPASSWORD
	},
    tls: {
        rejectUnauthorized: false
    }
})
// run()
async function getIndices() {
	try {
		// NOTE: we are using the destructuring assignment
		const { body } = await client.cat.indices({
			format: 'json'
		})
		console.log(body)
	} catch (err) {
		// NOTE: we are checking the `statusCode` property
		if (err.statusCode === 400) {
			console.log('Bad request')
		} else {
			console.log(err)
		}
	}
}
// getIndices()
module.exports = client 