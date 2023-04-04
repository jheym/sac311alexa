const axios = require("axios")
const Alexa = require('ask-sdk-core');
/** //TODO: Get this working on a lambda environment
 * This function gets an OAuth token for use with the Salesforce API.
 * It returns a new token and should be used in every request to the Salesforce API.
 * Be sure to have a valid .env file containing the following variables:
 * SF_AUTH_URL, SF_USERNAME, SF_PASSWORD, SF_CLIENT_ID, SF_CLIENT_SECRET
 * 
 * @returns OAuth bearer token
 */
async function getOAuthToken() {
	const res = await axios.post(process.env.SF_AUTH_URL, {
		grant_type: "password",
		username: process.env.SF_USERNAME,
		password: process.env.SF_PASSWORD,
		client_id: process.env.SF_CLIENT_ID,
		client_secret: process.env.SF_CLIENT_SECRET
	},
		{
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept-Encoding': 'application/json'
			} // Important for password grant type
		});
	return res.data.access_token;
}

/**
 * This function should be able to make any query to the SF API. Just pass in
 * the SOQL query you want to use. No URL encoding required.
 * @param {string} query 
 * @param {string} token
 * @returns http response from SF API
 */
async function querySFDB(query, token) {
	const url = encodeURI(`${process.env.SALESFORCE_URL}/query/?q=${query}`)
	try {
		const res = await axios.get(url, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept-Encoding': 'application/json'
			}
		});
		return res;
	} catch (error) {
		if (!error.response) {
			throw new Error(`querySFDB Error: ${error.message}`);
		} else {
			return error.response // return the 4xx response regardless
		}
	}
}

/**
 * Returns true if the user has a home address set in their Alexa app and has
 * given permission for the skill to access it.
 * @param {Object} handlerInput 
 * @returns 
 */
async function isHomeAddressAvailable(handlerInput) {
	const { deviceId } = handlerInput.requestEnvelope.context.System.device;
	const { apiEndpoint, apiAccessToken } = handlerInput.requestEnvelope.context.System;
	const url = `${apiEndpoint}/v1/devices/${deviceId}/settings/address`;
				try {
					let res = await axios.get(url, {
						headers: {
							'Host': `api.amazonalexa.com`,
							'Authorization': `Bearer ${apiAccessToken}`,
							'Accept': 'application/json',
						}
					});
				
					if (res.status === 200 && res.data.addressLine1.length > 0)
						return true;
					else
						return false;
	
				} catch (error) {
					return false;
				}
}

async function getHomeAddress(handlerInput) {
	const { deviceId } = requestEnvelope.context.System.device;
	const { apiEndpoint, apiAccessToken } = requestEnvelope.context.System;
	const url = `${apiEndpoint}/v1/devices/${deviceId}/settings/address`;
	try {
		let res = await axios.get(url, {
			headers: {
				'Host': `api.amazonalexa.com`,
				'Authorization': `Bearer ${apiAccessToken}`,
				'Accept': 'application/json',
			}
		});
	
		if (res.status === 200)
			return res.data;
		else
			return null;
	} catch (error) {
		if (error.response.status === 403) {
			console.log('The user has not given permission to access their full address.')
			return null;
		}
		else if (error.response.status) {
			console.log('Error retrieving address from device API: ', error.status, error.message);
			return null;
		}
		else 
			return null;
	}
}

/**
 * Checks whether the user has given permission for the skill to access their geolocation.
 * @param {Object} handlerInput 
 * @returns 
 */
function isGeolocationAvailable(handlerInput) {
	const isGeoSupported = handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Geolocation;
	if (isGeoSupported) {
		const geoObject = handlerInput.requestEnvelope.context.Geolocation;
		const ACCURACY_THRESHOLD = 100; // accuracy of 100 meters required
		if (geoObject && geoObject.coordinate && geoObject.coordinate.accuracyInMeters < ACCURACY_THRESHOLD )
			return true;
		else
			return false;
	} else {
		return false;
	}
}

function getGeolocation(handlerInput) {
	const geoObject = handlerInput.requestEnvelope.context.Geolocation;
	if (geoObject && geoObject.coordinate)
		return geoObject
	else
		return null;
}


// Stores the asked question in a session attribute for yes and no intent handlers
function setQuestion(handlerInput, questionAsked) {
	const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
	sessionAttributes.questionAsked = questionAsked;
	handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

function incFailCounter(handlerInput) {
	const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
	if (sessionAttributes.failCounter) {
		sessionAttributes.failCounter += 1;
	} else {
		sessionAttributes.failCounter = 1;
	}
	handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

function clearFailCounter(handlerInput) {
	const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
	delete sessionAttributes.failCounter;
	handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

/**
 * Clear the slot values of the given intent.
 * @param {Object} intent 
 * @returns {Object} Intent with cleared slot values
 */
function clearSlots(intent) {
	for (let key in intent.slots)
		delete intent.slots[key].value;
	return intent;
}

/** 
 * Function to clear the context. Used when the user wants to do another task in the same session.
 * Example call in Abandoned vehicle, after output statement is created, before it is returned.
 * call with: 
 * index.clearContext(handlerInput, requestEnvelope.request.intent)
 */
function clearContext(handlerInput, currentIntent) {
	const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
	delete sessionAttributes[currentIntent.name];
}

function getDummySlots(handlerInput, intentName) {
	const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
	const { attributesManager } = handlerInput;
	const slots = sessionAttributes[intentName].slots;
	let dummySlots = {};
	for (let k in slots) {
		dummySlots[k] = {
			name: k,
			value: 'dummy'
		};
	}
	return dummySlots;
}

function createIntentFromSlots(intentName, slots) {
	return {
			name: intentName,
			confirmationStatus: 'NONE',
			slots: slots
	};
}

function switchIntent(handlerInput, intentName) {
	const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
	
	if (!(intentName in sessionAttributes))
		throw new Error(`switchIntent Error: Intent ${intentName} not found in session attributes. Intent must have already been invoked previously.`);
	
	const { attributesManager, responseBuilder } = handlerInput;
	let dummySlots = JSON.parse(JSON.stringify(sessionAttributes[intentName].slots));
	const updatedIntent = JSON.parse(JSON.stringify(sessionAttributes[intentName]));
	
	for (let k in updatedIntent.slots)
		updatedIntent.slots[k].value = 'dummy';
	
	sessionAttributes.hasDummyValues = true;
	attributesManager.setSessionAttributes(sessionAttributes);
	return updatedIntent
}

/**
 * Gets the highest scoring address candidate from the ArcGIS world geocoder.
 * The returned address will be used to query the sac311gis API for more details.
 * TODO: Find out which return address we should be using from the response.
 * @param {string} address 
 * @returns {Promise<string|boolean>} Returns the address if found, otherwise false.
 */
async function getWorldAddressCandidate(address) {
	if (!address) {
		throw new Error('Address parameter is required.');
	}

	try {
		const response = await axios.get(process.env.WORLD_GEOCODER_URL, {
			params: {
				address: address,
				outFields: '*',
				f: 'pjson',
				maxLocations: 10
			}
		});
		const candidates = response.data.candidates;
		let chosenCandidate = null;
		for (let candidate of candidates) {
			if (candidate.score === 100) {
				chosenCandidate = candidate;
				break;
			}
			if (candidate.score >= 80 && (!chosenCandidate || candidate.score > chosenCandidate.score)) {
				chosenCandidate = candidate;
			}
		}
		//chosenCandidate = getInternalAddressCandidate(chosenCandidate);
		return chosenCandidate ? chosenCandidate : false;
	} catch (error) {
		console.error(`Failed to find suitable address. ResponseCode: ${error.response.status}, ResponseData: ${JSON.stringify(error.response.data)}`);
		throw new Error(`Failed to find suitable address. ${error.message}`);
	}
}

/**
 * Gets the highest scoring address candidate from the ArcGIS world geocoder.
 * The returned address will be used to query the sac311gis API for more details.
 * TODO: Find out which return address we should be using from the response.
 * @param {string} address 
 * @returns {Promise<string|boolean>} Returns the address if found, otherwise false.
 */
async function getWorldAddressResponse(address) {
	if (!address) {
		throw new Error('Address parameter is required.');
	}

	try {
		const response = await axios.get(process.env.WORLD_GEOCODER_URL, {
			params: {
				address: address,
				outFields: '*',
				f: 'pjson',
				maxLocations: 10
			}
		});
		return response
	} catch (error) {
		if (!error.response) {
			throw new Error(`World Address Geocoder Error: ${error.message}`);
		} else {
			return error.response // return the 4xx response regardless
		}
	}
}

/**
 * Takes a candidate object from world gis to compare against sac311 gis
 * Returns a candidate object or false if no suitable candidate
 * Automatically accepts a candidate if score equal to 100
 * @param {object} potentialCandidate
 * @returns {Promise<string|boolean>} Returns the address if found, otherwise false.
*/
async function getInternalAddressCandidate(potentialCandidate) {
	if (!potentialCandidate) {
		throw new Error('No Candidate was found.');
	}

	try {
		const response = await axios.get(process.env.INTERNAL_GEOCODER_URL, {
			params: {
				Street: potentialCandidate.attributes.ShortLabel,
				City: potentialCandidate.attributes.City,
				ZIP: potentialCandidate.attributes.Postal,
				SingleLine: potentialCandidate.attributes.ShortLabel,
				outFields: '*',
				outSR: 4326,
				f: 'pjson'
			}
		});
		const candidates = response.data.candidates;
		let chosenCandidate = null;
		for (let candidate of candidates) {
			if (candidate.score === 100) {
				chosenCandidate = candidate;
				break;
			}
			if (candidate.score >= 85 && (!chosenCandidate || candidate.score > chosenCandidate.score)) {
				chosenCandidate = candidate;
			}
		}
		return chosenCandidate ? chosenCandidate : false;
	} catch (error) {
		console.error(`Failed to find suitable address. ResponseCode: ${error.response.status}, ResponseData: ${JSON.stringify(error.response.data)}`);
		throw new Error(`Failed to find suitable address. ${error.message}`);
	}
}

async function getInternalAddressResponse(candidate) {
	if (!candidate) {
		throw new Error('No Candidate was found.');
	}

	try {
		const response = await axios.get(process.env.INTERNAL_GEOCODER_URL, {
			params: {
				Street: candidate.attributes.ShortLabel,
				City: candidate.attributes.City,
				ZIP: candidate.attributes.Postal,
				SingleLine: candidate.attributes.ShortLabel,
				outFields: '*',
				outSR: 4326,
				f: 'pjson'
			}
		});
		return response
	} catch (error) {
		if (!error.response) {
			throw new Error(`World Address Geocoder Error: ${error.message}`);
		} else {
			return error.response // return the 4xx response regardless
		}
	}
}

/**
 * This function takes a latitude and longitude and returns object containing information about the location
 * @param {float} latitude 
 * @param {float} longitude 
 * @returns location data object
 */
async function reverseGeocode(latitude, longitude) {
	const url = `https://utility.arcgis.com/usrsvcs/servers/3f594920d25340bcb7108f137a28cda1/rest/services/World/GeocodeServer/reverseGeocode?location=${longitude},${latitude}&distance=500&f=json`;
	try {
		const res = await axios.get(url, {
			headers : {
				'Content-Type': 'application/json',
				'Accept-Encoding': 'application/json',
			}
		});
		if (!res.status === 200) return null;
		return res.data;
	} catch (error) {
		console.error(error);
		return false;
	}
}

async function openCase() {
	const sfUrl = `https://saccity--qa.sandbox.my.salesforce.com/services/data/v57.0/sobjects/Case`;
	const token = await getOAuthToken();

	//Create a case body with axios
	const headers = {
		'Authorization': `Bearer ${token}`,
		'Content-Type': 'application/json',
		'Accept-Encoding': 'application/json',
	};
	const data = {
		Sub_Service_type__c: "a0Om0000005vZ7JEAU",
		Subject: "Review->ASK Review-unverified",
		Status: "DRAFT",
		Service_Type__c: "",
		Origin: "Alexa",
		ContactId: "",
		Description: "Test Through Code",
		Email_Web_Notes__c: "Test Through Code",
		Anonymous_Contact__c: true,
	};
	const config = {
		headers,
		maxBodyLength: Infinity,
	};
	const response = await axios.post(sfUrl, data, config);
	return response.data;
}



/*
getQA

Puts together slot questions and values.
Returns an object in key: value form

Will be mapped so that the slot questions match SalesForce questions

example call: 
helper.getQA(handlerInput, requestEnvelope.request.intent);

*/
function getQA(handlerInput, currentIntent) {
	if (currentIntent.name == 'AbandonedVehicleIntent') {
		sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
		var location = sessionAttributes.confirmedLocation;
		var make = handlerInput.requestEnvelope.request.intent.slots.make.value;
		var model = handlerInput.requestEnvelope.request.intent.slots.model.value;
		var color = handlerInput.requestEnvelope.request.intent.slots.color.value;

		let result = {
			make,
			model,
			color,
			location
		};
		console.log("getQA result:");
		console.log(result);
		return result;
	}
}

// Helper function to retrieve the user's phone number and save it in session attribute called phone else return null but do not throw an error
async function getPhoneNumber(handlerInput) {
	const { deviceId } = handlerInput.requestEnvelope.context.System.device;
	const { apiEndpoint, apiAccessToken } = handlerInput.requestEnvelope.context.System;
	const url = `${apiEndpoint}/v1/devices/${deviceId}/settings/alexa.settings.profile.mobileNumber`;

	try {
		let res = await axios.get(url, {
			headers: {
				'Host': `api.amazonalexa.com`,
				'Authorization': `Bearer ${apiAccessToken}`,
				'Accept': 'application/json'

			}
		});
	
	
		if (res.status === 200)
			return res.data;
		else
			return null;
	} catch (error) {
		if (error.response.status === 403) {
			console.log('The user has not given permission to access their full address.')
			return null;
		}
		else if (error.response.status) {
			console.log('Error retrieving phone from device API: ', error.status, error.message);
			return null;
		}
		else 
			return null;
	}
  }
  

module.exports = {
	getOAuthToken,
	querySFDB,
	setQuestion,
	clearContext,
	clearSlots,
	getWorldAddressCandidate,
	getWorldAddressResponse,
	getInternalAddressCandidate,
	getInternalAddressResponse,
	reverseGeocode,
	openCase,
	getQA,
	incFailCounter,
	clearFailCounter,
	isHomeAddressAvailable,
	isGeolocationAvailable,
	getDummySlots,
	createIntentFromSlots,
	switchIntent,
	getGeolocation,
	getHomeAddress,
	getPhoneNumber
}