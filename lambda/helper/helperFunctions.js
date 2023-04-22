const axios = require("axios")
const iso8601 = require("iso8601-duration");


/** //TODO: Get this working on a lambda environment
 * This function gets an OAuth token for use with the Salesforce API.
 * It returns a new token and should be used in every request to the Salesforce API.
 * Be sure to have a valid .env file containing the following variables:
 * SF_AUTH_URL, SF_USERNAME, SF_PASSWORD, SF_CLIENT_ID, SF_CLIENT_SECRET
 * 
 * @returns {string} OAuth bearer token
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


async function saveCaseToDynamo(handlerInput, caseNumber) {
	const attributesManager = handlerInput.attributesManager;
	const persistentAttributes = await attributesManager.getPersistentAttributes();
	persistentAttributes['caseNumber'] = caseNumber;
	attributesManager.setPersistentAttributes(persistentAttributes);
	await attributesManager.savePersistentAttributes();
}

async function saveToDynamo(handlerInput, key, value) {
	const attributesManager = handlerInput.attributesManager;
	const persistentAttributes = await attributesManager.getPersistentAttributes();
	persistentAttributes[key] = value;
	attributesManager.setPersistentAttributes(persistentAttributes);
	await attributesManager.savePersistentAttributes();
}

/**
 * Sends a progressive response to the user. This is useful for sending
 * speechOutput to the user during a request that may take a while.
 * @param {object} handlerInput 
 * @param {string} speechOutput - speech to send to the user. String gets wrapped in <speak> tags
 * @returns {void} if the request fails the error will be logged in console.
 */
async function sendProgressiveResponse(handlerInput, speechOutput) {
	const { requestEnvelope } = handlerInput;
	const apiAccessToken = requestEnvelope.context.System.apiAccessToken;
	const apiEndpoint = requestEnvelope.context.System.apiEndpoint;
	// const requestId = inRequestId ? inRequestId : requestEnvelope.request.requestId;
	const requestId = requestEnvelope.request.requestId;
	try {
		const res = await axios({
			method: 'POST',
			url: `${apiEndpoint}/v1/directives`,
			headers: {
				'Authorization': `Bearer ${apiAccessToken}`,
				'Content-Type': 'application/json'
			},
			data: {
				"header": {
					"requestId": requestId
				},
				"directive": {
					"type": "VoicePlayer.Speak",
					"speech": `<speak>${speechOutput}</speak>`
				}
			}
		});
	} catch (error) {
		console.log(`Error sending progressive response: Code: ${error.code} \n Message: ${error.message} \n ${error.response.data.message}`);
	}
}


function getTimeOfDay() {
	// Get the current hour
	const now = new Date();
	const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
	const currentHour = new Date(utcTime + (3600000*-7));

	// Set the morning, afternoon, evening, and night hours

	const morningStart = 5;
	const morningEnd = 11;
	const afternoonStart = 12;
	const afternoonEnd = 17;
	const eveningStart = 18;
	const eveningEnd = 22;
  
	// Determine the time of day
	let timeOfDay;
	const localHour = currentHour.getHours();
	if (localHour >= morningStart && localHour <= morningEnd) {
	  timeOfDay = 'morning';
	} else if (localHour >= afternoonStart && localHour <= afternoonEnd) {
	  timeOfDay = 'afternoon';
	} else if (localHour >= eveningStart && localHour <= eveningEnd) {
	  timeOfDay = 'evening';
	} else {
	  timeOfDay = 'night';
	}
  
	// Return the time of day
	return timeOfDay;
  }


/**
 * This function should be able to make any query to the SF API. Just pass in
 * the SOQL query you want to use. No URL encoding required.
 * @param {string} query - unencoded SOQL query
 * @param {string} token - Oauth token
 * @returns {object} response - 200 OK http response object
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
		if (res.status === 200)
			return res;
		else {
			throw new Error(`querySFDB Error: ${res.status} ${res.statusText}`);
		}
	} catch (error) {
		if (!error.response) {
			throw new Error(`querySFDB Error: ${error.message}`);
		} else {
			return error.response // return the 4xx response regardless
		}
	}
}

async function openIntegratedCase(handlerInput, slots, SalesforceCaseObject, serviceName, address, phoneNumber=null) {
		const { attributesManager } = handlerInput;
		SalesforceCaseObject.set_service_questions(handlerInput, slots);
		const case_response = await SalesforceCaseObject.create_basic_case(serviceName, phoneNumber, address, null, true);
		saveCaseToDynamo(handlerInput, case_response.case_number);

		return case_response;
}

async function updateIntegratedCase(handlerInput, slots, caseId, SalesforceCaseObject, serviceName, address, phoneNumber=null) {
	SalesforceCaseObject.set_service_questions(handlerInput, slots);
	const case_response = await SalesforceCaseObject.case_update(caseId, serviceName, address, phoneNumber);
	return case_response;


}

/**
 * This is the function for creating a generic case in Salesforce. If caseId is
 * provided, it will update the existing case. Otherwise, it will create a new
 * case with the data provided.
 * @param {object} SalesforceCaseObject - case object created from
 * SalesForceCaseObject class
 * @param {string} serviceName - name of the service required
 * @param {obj} genericDescription - description of the issue from the user
 * @param {string} address - optional address //TODO: Is this optional?
 * @param {string} phoneNumber - Optional phone number for service agent to
 * reach back out. Must be 9 digits no spaces or symbols.  //TODO: Is this true?
 * @returns {object} case_response - response from the Salesforce API containing
 * {case_number, case_id}
 */
async function createGenericCase(SalesforceCaseObject, serviceName, userResponses, address=null, phoneNumber=null) {
	const json_input = {}
	if (address) {json_input.address = address}
	if (phoneNumber) {json_input.contacted_number = phoneNumber}
	for (const [key, value] of Object.entries(userResponses))
		json_input[key] = value;

	const case_response = await SalesforceCaseObject.create_generic_case(serviceName, json_input);
	saveCaseToDynamo(handlerInput, case_response.case_number);
	return case_response;

}

/**
 *
 * @param {object} SalesforceCaseObject - case object created from
 * SalesForceCaseObject class
 * @param {string} serviceName - name of the service required
 * @param {object} userResponses - contains details you want to include in the
 * case description. Generally, you should create this object from the
 * handlerInput slot values.
 * @param {string} caseId - the caseId of the case you want to update
 * @param {string} address - optional address //TODO: Is this optional?
 * @param {string} phoneNumber - Optional phone number for service agent to
 * reach back out. Must be 9 digits no spaces or symbols.  //TODO: Is this true?
 * @returns {object} { case_id, http_response_status }
 */
async function updateGenericCase(SalesforceCaseObject, serviceName, userResponses, caseId, address=null, phoneNumber=null, checkContact=false) {
	const json_input = {}
	if (address) {json_input.address = address}
	if (phoneNumber) {json_input.contacted_number = phoneNumber}
	for (const [key, value] of Object.entries(userResponses))
		json_input[key] = value;
	const case_response = await SalesforceCaseObject.update_generic_case(caseId, serviceName, json_input, checkContact);
	return case_response;
}

/**
 * Returns true if the user has a home address set in their Alexa app and has
 * given permission for the skill to access it.
 * @param {object} handlerInput 
 * @returns {boolean}
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

/**
 * Retrieves the user's home address from the device API.
 * @param {object} handlerInput 
 * @returns {object} res.data - response data from the device API
 */
async function getHomeAddress(handlerInput) {
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
 * checks if Geo Location is accurate and authorized to be used from device
 * @param {Object} handlerInput
 * @returns string describing the error or returns "supported"
 */
function isGeolocationAvailable(handlerInput) {
	const isGeoSupported = handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Geolocation;
	if (isGeoSupported) {
		const geoObject = handlerInput.requestEnvelope.context.Geolocation;
		const ACCURACY_THRESHOLD = 100; // accuracy of 100 meters required
		if (geoObject && geoObject.coordinate && geoObject.coordinate.accuracyInMeters < ACCURACY_THRESHOLD) {
			return "supported";
		}
		else if (geoObject && geoObject.coordinate && geoObject.coordinate.accuracyInMeters > ACCURACY_THRESHOLD) {
			return "not-accurate";
		}
		else
			return "not-authorized";
	} else {
		return "not-available";
	}
}
  

/**
 * Retrieves the user's geolocation from the handlerInput object.
 * @param {object} handlerInput 
 * @returns {object} geoObject - the user's geolocation object
 */
function getGeolocation(handlerInput) {
	const geoObject = handlerInput.requestEnvelope.context.Geolocation;
	if (geoObject && geoObject.coordinate)
		return geoObject
	else
		return null;
}

function toDays(iso8601duration) {
	return (iso8601.toSeconds(iso8601.parse(iso8601duration)) / 3600.0) / 24;
}

/**
 * Sets sessionAttributes.questionAsked to the given question.
 * @param {object} handlerInput 
 * @param {string} questionAsked 
 * @returns {void}
 */
function setQuestion(handlerInput, questionAsked) {
	const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
	sessionAttributes.questionAsked = questionAsked;
	handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

function getFailCounter(handlerInput) {
	const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
	if (sessionAttributes.failCounter) {
		return sessionAttributes.failCounter;
	} else {
		return 0;
	}
}

/**
 * Increases the failCounter by 1. If the failCounter does not exist, it is created.
 * @param {object} handlerInput
 * @returns {void} 
 */
function incFailCounter(handlerInput) {
	const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
	if (sessionAttributes.failCounter) {
		sessionAttributes.failCounter += 1;
	} else {
		sessionAttributes.failCounter = 1;
	}
	handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

/**
 * deletes the failCounter from sessionAttributes.
 * @param {object} handlerInput 
 * @returns {void}
 */
function clearFailCounter(handlerInput) {
	const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
	delete sessionAttributes.failCounter;
	handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

/**
 * Clear the slot values of the given intent.
 * @param {object} intent - intent object with slot values
 * @returns {object} updatedIntent - updated intent with cleared slot values
 */
function clearSlots(intent) {
	for (let key in intent.slots)
		delete intent.slots[key].value;
	return intent;
}

/** 
 * Delete the given intent from sessionAttributes. Call after an intent has been
 * completed and the user wants to do something else in the same session.
 * @param {object} handlerInput
 * @param {string} intentName - name of the intent to delete
 * @returns {void}
 */
function clearContextIntent(handlerInput, intentName) {
	const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
	delete sessionAttributes[intentName];
}

/**
 * Creates an intent object from a given intent name and slot values.
 * @param {string} intentName 
 * @param {object} slots 
 * @returns 
 */
function createIntentFromSlots(intentName, slots) {
	return {
			name: intentName,
			confirmationStatus: 'NONE',
			slots: slots
	};
}

// TODO: Update this function to accept an optional parameter for specifying slots to be managed by auto delegation
/**
 * A hacky way to re-enter a previously invoked intent without Alexa taking over
 * dialog management. It works by replacing the slot values with dummy values,
 * tricking Alexa into immediately sending back the intent with a dialog state
 * of COMPLETED. ContextSwitchingRequestInterceptor is also required as it is
 * responsible for saving intent objects from previously-entered intents
 *
 * Sets the sessionAttributes.hasDummyValues flag so the complementary
 * interceptor (index.RestoreDummyValuesRequestInterceptor) knows to restore the
 * original slot values and change the dialog state back to IN_PROGRESS.
 * 
 * @param {object} handlerInput 
 * @param {string} intentName - The name of the intent to switch to
 * @returns {object} updatedIntent
 * @example
 * handle(handlerInput) {
 *     return handlerInput.responseBuilder
 *     .addDelegateDirective(switchIntent(handlerInput, 'MyIntent')) 
 *     .getResponse();
 * }
 */
function switchIntent(handlerInput, intentName) {
	const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
	
	if (!(intentName in sessionAttributes))
		throw new Error(`switchIntent Error: Intent ${intentName} not found in session attributes. Intent must have already been invoked previously.`);
	
	const { attributesManager } = handlerInput;
	const updatedIntent = JSON.parse(JSON.stringify(sessionAttributes[intentName])); // Deep copy
	for (let k in updatedIntent.slots)
	
		updatedIntent.slots[k].value = 'dummy';
	sessionAttributes.hasDummyValues = true; // Set flag for RestoreDummyValuesRequestInterceptor
	attributesManager.setSessionAttributes(sessionAttributes);
	return updatedIntent
}

/**
 * Gets the highest scoring address candidate from the ArcGIS world geocoder.
 * The returned candidate object will be used to query the sac311gis API for more details.
 * @param {string} address 
 * @returns {Promise<string|boolean>} Returns the best candidate if found, otherwise false.
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

async function getWorldAddress(address) {
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
 * @param {object} potentialCandidate
 * @returns {Promise<string|boolean>} Returns the best candidate if found, otherwise false.
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

async function getInternalAddress(candidate) {
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

async function isPhoneNumberAvailable(handlerInput) {
	const { apiEndpoint, apiAccessToken } = handlerInput.requestEnvelope.context.System;
	const url = `${apiEndpoint}/v2/accounts/~current/settings/Profile.mobileNumber`;

	try {
		let res = await axios.get(url, {
			headers: {
				'Host': `api.amazonalexa.com`,
				'Authorization': `Bearer ${apiAccessToken}`,
				'Accept': 'application/json'
			}
		});
	
		if (res.status === 200)
			return true;
		else
			return false;
	} catch (error) {
		return false;
	}
  }

// Helper function to retrieve the user's phone number and save it in session attribute called phone else return null but do not throw an error
async function getPhoneNumber(handlerInput) {
	const { apiEndpoint, apiAccessToken } = handlerInput.requestEnvelope.context.System;
	const url = `${apiEndpoint}/v2/accounts/~current/settings/Profile.mobileNumber`;

	try {
		let res = await axios.get(url, {
			headers: {
				'Host': `api.amazonalexa.com`,
				'Authorization': `Bearer ${apiAccessToken}`,
				'Accept': 'application/json'
			}
		});
	
		if (res.status === 200)
			return res.data.phoneNumber;
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


function PhoneNumberFormat(phoneNum) {
    let phone = phoneNum.replace(/\s/g, '');
    if (phone.length > 9 && /^\d+$/.test(phone)) {
      phone = phone.substring(phone.length - 10);
      return phone;
    }else{
      return null;
    }
}

// async function getPhoneNumber(handlerInput) {
//     const { permissions } = handlerInput.requestEnvelope.context.System.user;
//     if (!permissions || !permissions.consentToken) {
//       return null;
//     }
  
   
//     const serviceClientFactory = handlerInput.serviceClientFactory;
//     const upsServiceClient = serviceClientFactory.getUpsServiceClient();
//     try {
//       //add phone into session attributes
//       const profile = await upsServiceClient.getProfileMobileNumber();
//       handlerInput.attributesManager.setSessionAttributes({ phone: profile.phoneNumber });
//       return PhoneNumberFormat(profile.phoneNumber);
//     } catch (error) {
//       if (error.name !== 'ServiceError') {
//         const message = `There was a problem calling the Device Address API. ${error.message}`;
//         console.log(message);
//         throw error;
//       }
//       if (error.statusCode === 403) {
//         console.log('The user has not granted permissions to access their phone.');
     
//       } else {
//         const message = `There was a problem calling the Device Address API. ${error.message}`;
//         console.log(message);
//         throw error;
//       }
//     }
//     return null;
//   }


module.exports = {
	getOAuthToken,
	querySFDB,
	setQuestion,
	clearContextIntent,
	clearSlots,
	reverseGeocode,
	getFailCounter,
	incFailCounter,
	clearFailCounter,
	isHomeAddressAvailable,
	isGeolocationAvailable,
	createIntentFromSlots,
	switchIntent,
	getGeolocation,
	getHomeAddress,
	getWorldAddress,
	getInternalAddress,
	toDays,
	getPhoneNumber,
	isPhoneNumberAvailable,
	getCaseDetailsFromSalesForce,
	createGenericCase,
	updateGenericCase,
	openIntegratedCase,
	updateIntegratedCase,
	saveCaseToDynamo,
	saveToDynamo,
	sendProgressiveResponse,
	getInternalAddress,
	getWorldAddressCandidate,
	getTimeOfDay
}

// Unused functions //

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
   *getCaseDetailsFromSalesForce will take a case number as a parameter and return the case details from salesforce
   *as a javascript object containing the fields and values for Service_Type__c, Date, and status 
  */
  async function getCaseDetailsFromSalesForce(caseNumber) {
	//Search for the case in salesforce
	const query = `SELECT Id, CaseNumber, CreatedDate, Status, Sub_Service_Type_Text__c
					FROM Case
					WHERE CaseNumber = '${caseNumber}'`;
	const token = await getOAuthToken();
	const caseResult = await querySFDB(query, token);

	if(caseResult.data) {
		const createdDate = caseResult.data.records[0].CreatedDate;
		const status = caseResult.data.records[0].Status;
		const subServiceType = caseResult.data.records[0].Sub_Service_Type_Text__c;
		return { subServiceType, createdDate, status };
		}
	else {
		//Get the case details from the query result and output them
		//should save into session attributes?
		return null;
	}

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
		throw new Error(`Failed to find suitable address,
	getPhoneNumber. ${error.message}`);
	}
}

