const Alexa = require('ask-sdk-core')
const helper = require("./helper/helperFunctions.js")
const format = require('./helper/formatAddress.js')
const sfCase = require('./helper/SalesforceCaseObject.js')


// const GetLocationIntentHandler = {
// 	canHandle(handlerInput) {
// 		return (
// 			Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
// 			Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetLocationIntent'
// 		);
// 	},
// 	async handle(handlerInput) {
// 		const { responseBuilder, requestEnvelope, attributesManager } = handlerInput;
// 		const sessionAttributes = attributesManager.getSessionAttributes();
// 		const currentIntent = requestEnvelope.request.intent;
// 		const slots = currentIntent.slots;
		
// 		if (slots.userProvidedLocation.value) {
// 			// 
// 		}

// 		if ()
// 	}
// }




const SIPGetLocationFromUserIntentHandler = { // SIP = Started / In Progress
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
			Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetLocationFromUserIntent' &&
			Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED'
		);
	},
	async handle(handlerInput) {
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput
		const sessionAttributes = attributesManager.getSessionAttributes();
		let userGivenAddress = Alexa.getSlotValue(requestEnvelope, 'userGivenAddress');
		attributesManager.setSessionAttributes(sessionAttributes);

		const prSpeechOutput = `One moment while I look it up. <audio src="${process.env.S3_TYPING_SOUND}" /> <break time="1s"/> Okay <break time="1s"/>`
		await helper.sendProgressiveResponse(handlerInput, prSpeechOutput);

		if (userGivenAddress) {
			let token = await helper.getOAuthToken();
			let caseObj = new sfCase(token);
			const formattedAddr = format.formatInput(userGivenAddress);
			var res = await caseObj.address_case_validator(formattedAddr);
		} else {
			console.log('Error: userGivenAddress is undefined.')
			return responseBuilder
				.speak(handlerInput.t('CRITICAL_ERROR_MSG'))
				.addDelegateDirective('SessionEndedRequest')
				.getResponse();
		}

		sessionAttributes.getLocation.unconfirmedValidatorRes = res;
		attributesManager.setSessionAttributes(sessionAttributes);
		let speechOutput = `<speak>Did you say the address was <say-as interpret-as='address'>${res.Address}</say-as>?</speak>`
		helper.setYNQuestion(handlerInput, 'IsAddressCorrect?')
		return responseBuilder
			.speak(speechOutput)
			.withShouldEndSession(false)
			.reprompt(speechOutput)
			.getResponse();


	}
};


const yn_IsAddressCorrectIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
			(Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent' ||
				Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent') &&
			handlerInput.attributesManager.getSessionAttributes().ynQuestionAsked === 'IsAddressCorrect?'
		);
	},
	async handle(handlerInput) {
		helper.setYNQuestion(handlerInput, null);
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes();
		const unconfirmedValidatorRes = sessionAttributes.getLocation.unconfirmedValidatorRes;

		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
			helper.clearFailCounter(handlerInput);
			if (!unconfirmedValidatorRes) {
				throw new Error('Error: unconfirmedValidatorRes is undefined.')
			}
			const prSpeechOutput = `Okay. <audio src="${process.env.S3_TYPING_SOUND}" /> <break time="1s"/>`;
			await helper.sendProgressiveResponse(handlerInput, prSpeechOutput);
			const token = await helper.getOAuthToken();
			const caseObj = new sfCase(token);
			if (unconfirmedValidatorRes.Validated) {
				caseObj.addr_resp = unconfirmedValidatorRes.geocoderResponse.internal_geocoder;
				await caseObj.get_gis_attribute();
			} else {
				caseObj.addr_resp = unconfirmedValidatorRes;
			}
			sessionAttributes.caseObj = caseObj;
			sessionAttributes.confirmedValidatorRes = unconfirmedValidatorRes;
			delete sessionAttributes.unconfirmedValidatorRes;
			attributesManager.setSessionAttributes(sessionAttributes);
			let updatedIntent = helper.skipAutodelegation(handlerInput, sessionAttributes.intentToRestore);
			return responseBuilder
				.addDelegateDirective(updatedIntent)
				.getResponse()
		}

		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.NoIntent") { // NoIntent
			
			if (helper.getFailCounter(handlerInput) >= 2) {
				helper.clearFailCounter(handlerInput);
				let speechOutput = `I'm sorry, I'm having trouble understanding your address. Please try again later or call 311 for assistance.`
				return responseBuilder
					.speak(speechOutput)
					.addDelegateDirective('SessionEndedRequest')
					.getResponse();
			}
			
			helper.incFailCounter(handlerInput);
			const GetLocationFromUserIntent = {
				name: 'GetLocationFromUserIntent',
				confirmationStatus: 'NONE',
				slots: {
					userGivenAddress: {
						name: 'userGivenAddress',
						value: null,
						confirmationStatus: 'NONE'
					}
				}
			}
			return responseBuilder
				.speak(handlerInput.t('LOCATION_RETRY'))
				.addElicitSlotDirective('userGivenAddress', GetLocationFromUserIntent)
				.getResponse();
		}
	}
}

/**
 * If the user says yes to using their current location, confirm their home address with setYNQuestion('IsAddressCorrect?')
 * If the user says no to using their current location, elicit userGivenAddress with GetLocationFromUserIntent
 */
const yn_UseGeoLocationIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
			(Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent' ||
				Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent') &&
			handlerInput.attributesManager.getSessionAttributes().ynQuestionAsked === 'UseGeolocation?'
		)
	},
	async handle(handlerInput) {
		const { responseBuilder, attributesManager, requestEnvelope } = handlerInput
		const sessionAttributes = attributesManager.getSessionAttributes()
		helper.setYNQuestion(handlerInput, null)
		const GetLocationFromUserIntent = {
			name: 'GetLocationFromUserIntent',
			confirmationStatus: 'NONE',
			slots: {
				userGivenAddress: {
					name: 'userGivenAddress',
					value: null,
					confirmationStatus: 'NONE'
				}
			}
		}

		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
			const geoObject = helper.isGeolocationAvailable(handlerInput) ? requestEnvelope.context.Geolocation : null;

			if (geoObject) {
				const latitude = geoObject.coordinate.latitudeInDegrees;
				const longitude = geoObject.coordinate.longitudeInDegrees;
				var revGeocodeRes = await helper.reverseGeocode(latitude, longitude);
			}
	
			if (revGeocodeRes?.address) { // TODO: Test with bad geocoordinates
				let address = revGeocodeRes.address.Address;
				let city = revGeocodeRes.address.City;

				// Send a progressive response while validating the address
				const prSpeechOutput = `Alright, one moment while I validate your address.`;
				await helper.sendProgressiveResponse(handlerInput, prSpeechOutput);
				

				const token = await helper.getOAuthToken();
				const myCaseObj = new sfCase(token);
				const unconfirmedValidatorRes = await myCaseObj.address_case_validator(address);
				sessionAttributes.getLocation.unconfirmedValidatorRes = unconfirmedValidatorRes;
				attributesManager.setSessionAttributes(sessionAttributes);
				
				let speechOutput = `<speak>Is the location near <say-as interpret-as='address'>${address} in ${city}</say-as>?</speak>`;
				helper.setYNQuestion(handlerInput, 'IsAddressCorrect?');
				return responseBuilder
					.speak(speechOutput)
					.withShouldEndSession(false)
					.getResponse()
			} else {
				let speechOutput = `I'm sorry, I was unable to find an address near your location. Can you give me an address or two cross streets nearby?`;
				console.warn('GetGeolocation was invoked but no address was found.');
				return responseBuilder
					.speak(speechOutput)
					.addElicitSlotDirective('userGivenAddress', GetLocationFromUserIntent)
					.getResponse();
			}
		}

		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.NoIntent") {
			let speechOutput = `Alright. Can you give me an address or two cross streets nearby?`;
			return responseBuilder
				.speak(speechOutput)
				.addElicitSlotDirective('userGivenAddress', GetLocationFromUserIntent)
				.getResponse();
		}

	}
}

/**
 * If the user says yes to using their home address, confirm their home address with setYNQuestion('IsAddressCorrect?')
 * If the user says no to using their home address, elicit the userGivenAddress from GetLocationFromUserIntent
 */
const yn_UseHomeAddressIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
			(Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent' ||
				Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent') &&
			handlerInput.attributesManager.getSessionAttributes().ynQuestionAsked === 'UseHomeAddress?'
		)
	},
	async handle(handlerInput) {
		const { responseBuilder, attributesManager, requestEnvelope } = handlerInput
		const sessionAttributes = attributesManager.getSessionAttributes()
		helper.setYNQuestion(handlerInput, null)
		const GetLocationFromUserIntent = {
			name: 'GetLocationFromUserIntent',
			confirmationStatus: 'NONE',
			slots: {
				userGivenAddress: {
					name: 'userGivenAddress',
					value: null,
					confirmationStatus: 'NONE'
				}
			}
		}
	
		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
			
			const homeAddress = await helper.isHomeAddressAvailable(handlerInput) ? await helper.getHomeAddress(handlerInput) : null;
			if (homeAddress) {
				attributesManager.setSessionAttributes(sessionAttributes);
				
				let prSpeechOutput = `One moment while I check our system. <audio src="${process.env.S3_TYPING_SOUND}" /> <break time="1s"/> Okay <break time="1s"/>`
				await helper.sendProgressiveResponse(handlerInput, prSpeechOutput);
				
				const token = await helper.getOAuthToken();
				const myCaseObj = new sfCase(token);
				const unconfirmedValidatorRes = await myCaseObj.address_case_validator(homeAddress.addressLine1);
				sessionAttributes.getLocation.unconfirmedValidatorRes = unconfirmedValidatorRes;

				const address = unconfirmedValidatorRes.Address;


				let speechOutput = `<speak>Just to confirm, is the location near <say-as interpret-as='address'>${address}</say-as>?</speak>`;
				helper.setYNQuestion(handlerInput, 'IsAddressCorrect?')
				return responseBuilder
					.speak(speechOutput)
					.withShouldEndSession(false)
					.getResponse()
			} else {
				let speechOutput = `I'm sorry, I had trouble finding your home address. Can you give me an address or two cross streets nearby?`
				console.warn('GetHomeAddress was invoked but no address was found.')
				return responseBuilder
					.speak(speechOutput)
					.addElicitSlotDirective('userGivenAddress', GetLocationFromUserIntent)
					.getResponse();
			}
		}

		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.NoIntent") {
			let speechOutput = `Alright. Can you give me an address or two cross streets nearby?`
			return responseBuilder
				.speak(speechOutput)
				.addElicitSlotDirective('userGivenAddress', GetLocationFromUserIntent)
				.getResponse();
		}			
	}
};


const yn_TryAnotherAddress = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
			(Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent' ||
				Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent') &&
			handlerInput.attributesManager.getSessionAttributes().ynQuestionAsked === 'tryAnotherAddress?'
		);
	},
	handle(handlerInput) {
		const { requestEnvelope, responseBuilder } = handlerInput;
		const intentName = requestEnvelope.request.intent.name;
		helper.setYNQuestion(handlerInput, null);

		if (intentName === 'AMAZON.YesIntent') {
			const GetLocationFromUserIntent = {
				name: 'GetLocationFromUserIntent',
				confirmationStatus: 'NONE',
				slots: {
					userGivenAddress: {
						name: 'userGivenAddress',
						value: undefined,
						confirmationStatus: 'NONE'
					}
				}
			}
			return responseBuilder
				.speak(handlerInput.t('LOCATION_RETRY'))
				.reprompt(handlerInput.t('LOCATION_GET_LOCATION'))
				.addElicitSlotDirective('userGivenAddress', GetLocationFromUserIntent)
				.getResponse();
		}

		if (intentName === 'AMAZON.NoIntent') {
			helper.setYNQuestion(handlerInput, 'anythingElse?')
			return responseBuilder
				.speak(handlerInput.t('ANYTHING_ELSE_MSG'))
				.withShouldEndSession(false)
				.getResponse();
		}
	}
}

/**
 * Intercepts the GetLocationIntent and checks for device geolocation and/or
 * address from user contact details. If neither are present,
 * GetLocationIntentHandler will detect this and delegate to
 * GetLocationHelperIntent
 */
const GetLocationRequestInterceptor = {
	async process(handlerInput) {
		if (handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			(Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetLocationIntent' ||
				Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetLocationFromUserIntent' ||
				handlerInput.attributesManager.getSessionAttributes().ynQuestionAsked === 'UseGeolocation?' ||
				handlerInput.attributesManager.getSessionAttributes().ynQuestionAsked === 'UseHomeAddress?') &&
				!handlerInput.attributesManager.getSessionAttributes().getLocation) {

			const {  attributesManager } = handlerInput;
			const sessionAttributes = attributesManager.getSessionAttributes();
			
			if (!sessionAttributes.getLocation) {
				sessionAttributes.getLocation = {};
				attributesManager.setSessionAttributes(sessionAttributes);
			}
		}
	}
};


module.exports = {
	SIPGetLocationFromUserIntentHandler,
	yn_IsAddressCorrectIntentHandler,
	yn_TryAnotherAddress,
	yn_UseGeoLocationIntentHandler,
	yn_UseHomeAddressIntentHandler,
	GetLocationRequestInterceptor
}


/** Not currently in use */
// const GetLocationIntentHandler = {
// 	canHandle(handlerInput) {
// 		return (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
// 			Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetLocationIntent')
// 	},
// 	handle(handlerInput) {
// 		const { responseBuilder, requestEnvelope, attributesManager } = handlerInput;
// 		const sessionAttributes = attributesManager.getSessionAttributes();
// 		const geolocation = sessionAttributes.getLocation && sessionAttributes.getLocation.geolocation // Set by GetLocationInterceptor
// 		const homeAddress = sessionAttributes.getLocation && sessionAttributes.getLocation.homeAddress // Set by GetLocationInterceptor



// 		if (geolocation) {
// 			// Ask user if they would like to use their current location
// 			// Validate the geolocation by reverse geocoding and using sf case object
// 			// Confirm validated address with the user (new yn_intent)
// 			// if yes, set the sessionAttributes.confirmedLocation to the validated address
// 			// if no, ask the user for an address (GetAddressFromUserIntent)
// 		}


// 		if (homeAddress) {
// 			// Validate the home address by using sf case object
// 			// Confirm validated address with the user (new yn_intent)
// 			// if yes, set the sessionAttributes.confirmedLocation to the validated address
// 			// if no, ask the user for an address (GetAddressFromUserIntent)
// 		}
// 	}
// }


/** 
 * Not currently using this, but leaving it here as an example of modifying the
 * response before it goes out based on whether or not the response is trying to
 * delegate to the specified intent
 **/
const DelegateToGetLocationResponseInterceptor = {
	async process(handlerInput, response) {
		if (response && response.directives && response.directives[0].updatedIntent && response.directives[0].updatedIntent.name === 'GetLocationIntent' &&
			response.directives[0].type === 'Dialog.Delegate') {

			const { attributesManager, requestEnvelope, serviceClientFactory } = handlerInput
			const sessionAttributes = attributesManager.getSessionAttributes()

			// If a GetLocation field already exists then this does not need to run again
			if (!sessionAttributes.GetLocation) {
				const consentToken = requestEnvelope.context.System.user.permissions
					&& requestEnvelope.context.System.user.permissions.consentToken
				var isGeoSupported = requestEnvelope.context.System.device.supportedInterfaces.Geolocation
				sessionAttributes.GetLocation = {}

				if (!consentToken) {
					console.log('The user has not given any permissions')
				}

				if (isGeoSupported) {
					if (requestEnvelope.context.Geolocation) {
						sessionAttributes.GetLocation.Geolocation = requestEnvelope.context.Geolocation;
					}
				}

				// Getting the home address associated with the user, if it exists
				try {
					const { deviceId } = requestEnvelope.context.System.device;
					const deviceAddressServiceClient = serviceClientFactory.getDeviceAddressServiceClient();
					// This is why the function is async. We wait for a response from the
					// serviceClient API before executing the next line of code.
					const address = await deviceAddressServiceClient.getFullAddress(deviceId);  // This is an API call to the ASC

					if (address.addressLine1 === null && address.stateOrRegion === null) {
						console.log('The user does not have an address set.')
					} else {
						sessionAttributes.GetLocation.asc = {}
						sessionAttributes.GetLocation.asc.address = address.addressLine1;
						sessionAttributes.GetLocation.asc.stateOrRegion = address.stateOrRegion;
						sessionAttributes.GetLocation.asc.postalCode = address.postalCode;
						console.log('The address has been stored in session attributes.');
					}
				} catch (error) {
					if (error.name !== 'ServiceError') {
						console.log('Something went wrong.')
					}
					console.log('There was a service error getting the address ~~~~~\n', error)
				}
				attributesManager.setSessionAttributes(sessionAttributes);
			}
		}
		// clear the current response object
		for (let key in response) {
			delete response[key]
		}
		// This is how to build a custom response from scratch in a response interceptor
		response.outputSpeech = {}
		response.outputSpeech.type = "PlainText"
		response.outputSpeech.text = "Would you like to use your current location for the address of your report?"
		response.outputSpeech.playBehavior = "REPLACE_ENQUEUED"
		response.shouldEndSession = false
		response.reprompt = {}
		response.reprompt.outputSpeech = {}
		response.reprompt.outputSpeech.type = "PlainText"
		response.reprompt.outputSpeech.text = "Would you like to use your current location for the address of your report?"
		helper.setYNQuestion(handlerInput, null)
		helper.setYNQuestion(handlerInput, 'UseCurrentLocation')
	}
}