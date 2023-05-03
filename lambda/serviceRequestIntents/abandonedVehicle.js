
const Alexa = require("ask-sdk-core")
const helper = require("../helper/helperFunctions.js")
const sfCase = require("../helper/SalesforceCaseObject.js")
const iso8601 = require('iso8601-duration');

// Started
const StartedAbandonedVehicleIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
			Alexa.getIntentName(handlerInput.requestEnvelope) === "AbandonedVehicleIntent" &&
			Alexa.getDialogState(handlerInput.requestEnvelope) === "STARTED"
		)
	},
	handle(handlerInput) {
		helper.setQuestion(handlerInput, 'IsAbandonedVehicleCorrect?')
		const speakOutput = handlerInput.t("ABANDONED_VEHICLE_CONFIRMATION")
		const repromptOutput = handlerInput.t("ABANDONED_VEHICLE_REPROMPT");
		
		return handlerInput.responseBuilder
			.withShouldEndSession(false)
			.speak(speakOutput)
			.getResponse();
	}
};

// In Progress
const InProgressAbandonedVehicleIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
			&& Alexa.getIntentName(handlerInput.requestEnvelope) === "AbandonedVehicleIntent"
			&& Alexa.getDialogState(handlerInput.requestEnvelope) === "IN_PROGRESS"
		)
	},

	async handle(handlerInput) {
		const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
		const currentIntent = requestEnvelope.request.intent;
		const sessionAttributes = attributesManager.getSessionAttributes();
		const dialogState = Alexa.getDialogState(requestEnvelope);
		const intentConfirmationStatus = currentIntent.confirmationStatus;
		const slots = currentIntent.slots;
		const getPhoneNumberIntent = {
			name: 'GetPhoneNumberIntent',
			confirmationStatus: 'NONE',
			slots: {
				userGivenPhoneNumber: {
					name: 'userGivenPhoneNumber',
					confirmationStatus: 'NONE',
					value: null
		}}}

		if (!sessionAttributes.confirmedPhoneNumber) {
			return responseBuilder
				.addDelegateDirective(getPhoneNumberIntent)
				.getResponse();
		}

		if (slots.timePeriod.value) {
			// we have to send the progressive response before we add the delegate directive. Not sure why.
			const prSpeechOutput = `That's all the information I need. One moment please while I update your case. <audio src="https://alexa311resources.s3.us-west-1.amazonaws.com/mechanical-keyboard-typing_trimmed.mp3" /> <break time="1s"/> Okay, all done. <break time="1s"/>`;
			await helper.sendProgressiveResponse(handlerInput, prSpeechOutput);
			return responseBuilder
				.addDelegateDirective(currentIntent)
				.getResponse();
		}
		
		if (slots.licensePlate.value) {
			slots.licensePlate.value = slots.licensePlate.value.replace(/\s+/g, '').toUpperCase();
		  
			// Replace "for" with "4", "one" with "1", and "ate" with "8"
			const replacements = {
			  'FOR': '4',
			  'ATE': '8',
			  'TO' : '2',
			  'TOO' : '2'
			};
		  
			slots.licensePlate.value = slots.licensePlate.value.replace(/(FOR|ONE|ATE)/g, (match) => {
			  return replacements[match];
			});
		  
			// Slow down the speech when speaking the license plate number
			let speechOutput = `<speak>Just to confirm, did you say the license plate number is <say-as interpret-as="spell-out">${slots.licensePlate.value}</say-as>?</speak>`;
			helper.setQuestion(handlerInput, 'IsLicensePlateCorrect?');
			return responseBuilder
			  .speak(speechOutput)
			  .withShouldEndSession(false)
			  .getResponse();
		  }

		if (slots.make.value && slots.model.value && slots.color.value) {
			let { make, model, color } = slots;
			helper.setQuestion(handlerInput, 'IsVehicleDescriptionCorrect?')
			return responseBuilder
				.speak(`Just to confirm, did you say the vehicle is a ${color.value} ${make.value} ${model.value}?`)
				.withShouldEndSession(false)
				.getResponse();
		}

		if (!slots.make.value || !slots.model.value || !slots.color.value) {
			let vehicleDescription = { make: slots.make.value, model: slots.model.value, color: slots.color.value }
			let answeredSlots = {}
			for ([k, v] of Object.entries(vehicleDescription))
				if (v) answeredSlots[k] = v;

			if (!answeredSlots.make) {
				speechOutput = 'What is the make model and color of the vehicle?'
				slotToElicit = 'make'
			} else if (!answeredSlots.model) {
				speechOutput = 'What is the model of the vehicle?'
				slotToElicit = 'model'
			} else if (!answeredSlots.color) {
				speechOutput = 'What is the color of the vehicle?'
				slotToElicit = 'color'
			}

			return responseBuilder
				.speak(speechOutput)
				.reprompt(speechOutput)
				.withShouldEndSession(false)
				.addElicitSlotDirective(slotToElicit, currentIntent)
				.getResponse();
		}
	},
};


const CompletedAbandonedVehicleIntentHandler = {
	canHandle(handlerInput) {
		return (Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
			Alexa.getIntentName(handlerInput.requestEnvelope) === "AbandonedVehicleIntent" &&
			Alexa.getDialogState(handlerInput.requestEnvelope) === "COMPLETED");
	},
	async handle(handlerInput) {	
		const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
		const currentIntent = requestEnvelope.request.intent;
		const sessionAttributes = attributesManager.getSessionAttributes();
		const slots = currentIntent.slots;
		const internalServiceName = 'Vehicle On Street'; // Need to use the correct service name associated with the service type
		// const caseNumber = sessionAttributes.caseNumber;
		// const caseId = sessionAttributes.caseId;
		const isAddressValidated = sessionAttributes.confirmedValidatorRes.Validated || null;
		const isWithinCity = sessionAttributes.confirmedValidatorRes.Within_City;
		const address = sessionAttributes.confirmedValidatorRes.Address;
		slots.timePeriod.value = helper.toDays(currentIntent.slots.timePeriod.value);
		var phoneNumber = null;

		if (sessionAttributes.confirmedPhoneNumber && sessionAttributes.confirmedPhoneNumber !== 'FAILED') {
			phoneNumber = sessionAttributes.confirmedPhoneNumber;
		}

		// const myCaseObj = new sfCase(token);
		const token = await helper.getOAuthToken();

		// If address, is not validated or within the city, create a generic case
		if (!isAddressValidated || !isWithinCity) {
			// TODO: Submit generic case with unvalidated location
			console.log('Creating generic case')
			const userResponses = {
				'Make' : slots.make.value,
				'Model' : slots.model.value,
				'Color' : slots.color.value,
				'License Plate' : slots.licensePlate.value,
				'Time Period' : slots.timePeriod.value,
			}
			const myCaseObj = new sfCase(token);
			// address = sessionAttributes.confirmedValidatorRes.Address;
			const create_case_res = await helper.createGenericCase(handlerInput, myCaseObj, 'Vehicle On Street', userResponses, address, phoneNumber);
			await helper.updateGenericCase(myCaseObj, 'Vehicle On Street', userResponses, create_case_res.case_id, address, phoneNumber);
			
			helper.setQuestion(handlerInput, "AnythingElse?")
			return responseBuilder
				.speak(`Thank you for reporting the abandoned vehicle. Your case will be reviewed by a service agent. Is there anything else I can help you with?`)
				.withShouldEndSession(false)
				.getResponse();
		}
		
		// address = sessionAttributes.confirmedValidatorRes.Address;
		// const caseObj = sessionAttributes.caseObj
		// const myCaseObj = new sfCase(token); // Reconstruct the case object
		// for (let [key, value] of Object.entries(caseObj)) { myCaseObj[key] = value; } // TODO: Should we reconstruct the sfcaseobj in an interceptor, possibly with new token each time?
		const myCaseObj = new sfCase(token);
		const basic_res = await helper.openIntegratedCase(handlerInput, slots, myCaseObj, 'Vehicle On Street', address, phoneNumber);
		const update_res = await helper.updateIntegratedCase(handlerInput, slots, basic_res.case_id, myCaseObj, internalServiceName, address, phoneNumber);
		console.log(update_res)
		
		var make = Alexa.getSlotValue(handlerInput.requestEnvelope, 'make');
		var model = Alexa.getSlotValue(handlerInput.requestEnvelope, 'model');
		var color = Alexa.getSlotValue(handlerInput.requestEnvelope, 'color');
		speakOutput = handlerInput.t('ABANDONED_VEHICLE_THANKS', { color: `${color}`, make: `${make}`, model: `${model}`, location: `${address}` })
		
		helper.clearContextIntent(handlerInput, sessionAttributes.AbandonedVehicleIntent.name)
		helper.setQuestion(handlerInput, 'AnythingElse?')
		return responseBuilder
		.speak(speakOutput)
		.withShouldEndSession(false)
		.getResponse();
	}
};


const yn_IsAbandonedVehicleIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
			(Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.YesIntent" ||
				Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.NoIntent") &&
			handlerInput.attributesManager.getSessionAttributes().questionAsked === 'IsAbandonedVehicleCorrect?'
		);
	},
	handle(handlerInput) {
		helper.setQuestion(handlerInput, null)
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {

			// So GetLocationIntent knows where to delegate back to after confirming the address
			sessionAttributes.intentToRestore = 'AbandonedVehicleIntent';
			attributesManager.setSessionAttributes(sessionAttributes);
			
			if (helper.isGeolocationAvailable(handlerInput) === "supported") {
				helper.setQuestion(handlerInput, 'UseGeolocation?')
				let speechOutput = `Alright. Would you like to use your current location as the location of the abandoned vehicle?`;
				return responseBuilder
					.speak(speechOutput)
					.withShouldEndSession(false)
					.getResponse();
			} 
			
			// If we've already collected an address, delegate back to abandoned vehicle
			if (sessionAttributes.confirmedValidatorRes) {
				return responseBuilder
				.addDelegateDirective(sessionAttributes.AbandonedVehicleIntent)
				.getResponse();
			}
			
			let speechOutput = `Alright. Where is the abandoned vehicle located? You can give an address or nearest cross street.`
			let GetLocationFromUserIntent = {
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
				.speak(speechOutput)
				.withShouldEndSession(false)
				.addElicitSlotDirective('userGivenAddress', GetLocationFromUserIntent)
				.getResponse();
			
		} // YesIntent

		// TODO: Create an interceptor for clearing 'Tryagain?' question.. If
		// sessionAttributes.questionAsked is not null and the incoming intent
		// is not an AMAZON.YesIntent or AMAZON.NoIntent, then clear the
		// questionAsked. This will allow the user to say something other than
		// "yes" or "no" when the anythingElse? question is asked
		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.NoIntent") {
			helper.setQuestion(handlerInput, 'TryAgain?')
			return responseBuilder
				.speak(handlerInput.t('UNKNOWN_MSG'))
				.reprompt(handlerInput.t('UNKNOWN_MSG_REPROMPT'))
				.withShouldEndSession(false) // This prevents the skill from ending the session
				.getResponse()
		}
	} // handle()
};


const yn_ConfirmVehicleDescriptionIntentHandler = {
	canHandle(handlerInput) {
		const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
		const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
		const questionAsked = handlerInput.attributesManager.getSessionAttributes().questionAsked;
		const failCounter = handlerInput.attributesManager.getSessionAttributes().failCounter || 0;

		return (
			requestType === "IntentRequest" &&
			(intentName === "AMAZON.YesIntent" || intentName === "AMAZON.NoIntent") &&
			questionAsked === 'IsVehicleDescriptionCorrect?' &&
			failCounter < 3
		);
	},
	async handle(handlerInput) {
		helper.setQuestion(handlerInput, null)
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes();
		const failCounter = sessionAttributes.failCounter || 0;

		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
			helper.clearFailCounter(handlerInput);

			const prSpeechOutput = `<say-as interpret-as="interjection">Great.</say-as> I just have a few more questions to ask. <break time="1s"/>`;
			await helper.sendProgressiveResponse(handlerInput, prSpeechOutput);
			
			// Create basic case
			// phoneNumber = null;
			// const internalServiceName = 'Vehicle On Street';
			// var address = sessionAttributes.confirmedValidatorRes.Address;
			// const caseObj = sessionAttributes.caseObj
			// const myCaseObj = new sfCase(caseObj.token); // Reconstruct the case object
			// for (let [key, value] of Object.entries(caseObj)) { myCaseObj[key] = value; } // TODO: reconstruct the sfcaseobj in an interceptor. possibly with new token each time?
			// const slots = sessionAttributes.AbandonedVehicleIntent.slots;
			// const open_res = await helper.openIntegratedCase(handlerInput, slots, myCaseObj, internalServiceName, address, phoneNumber);
			// console.log(open_res);
			// sessionAttributes.caseNumber = open_res.case_number;
			// sessionAttributes.caseId = open_res.case_id
			// sessionAttributes.caseObj = myCaseObj;
			// attributesManager.setSessionAttributes(sessionAttributes);

			let speechOutput = `What is the license plate number of the vehicle?`;
			return responseBuilder
				.speak(speechOutput)
				.addElicitSlotDirective('licensePlate', sessionAttributes.AbandonedVehicleIntent)
				.getResponse();
		}

		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.NoIntent") {
			// TODO: Submit generic case if fail handler >= 3
			if (failCounter < 2) {
			helper.incFailCounter(handlerInput);
			let speechOutput = `I'm sorry about that, let's try again. What is the make of the vehicle?`;
			let repromptOutput = `What is the make of the vehicle?`;
			let updatedIntent = helper.clearSlots(sessionAttributes.AbandonedVehicleIntent);
			return responseBuilder
				.speak(speechOutput)
				.reprompt(repromptOutput)
				.withShouldEndSession(false)
				.addElicitSlotDirective('make', updatedIntent, { maxAttempts: 3 })
				.getResponse();
			} else {
				let speechOutput = `I'm sorry, I can't seem to help you with this. I'm transferring you to a live agent who can assist you. Please hold while I transfer you.`;
				return responseBuilder
					.speak(speechOutput)
					.withShouldEndSession(true)
					.getResponse();
			}
		}
	}
};
	

const yn_ConfirmLicensePlateIntentHandler = {
	canHandle(handlerInput) {
		const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
		const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
		const questionAsked = handlerInput.attributesManager.getSessionAttributes().questionAsked;
		const failCounter = handlerInput.attributesManager.getSessionAttributes().failCounter || 0;

		return (
			requestType === "IntentRequest" &&
			(intentName === "AMAZON.YesIntent" || intentName === "AMAZON.NoIntent") &&
			questionAsked === 'IsLicensePlateCorrect?' &&
			failCounter < 3
		);
	},
	handle(handlerInput) {
		helper.setQuestion(handlerInput, null);
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes();
		const failCounter = sessionAttributes.failCounter || 0;

		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
			helper.clearFailCounter(handlerInput);
			let speechOutput = `Got it. Okay, last question. How long has the vehicle been abandoned?`;
			let repromptOutput = `How long has the vehicle been abandoned? You can say any amount of time, such as 2 days, 3 weeks, or 1 month.`;
			updatedIntent = sessionAttributes.AbandonedVehicleIntent;
			updatedIntent.confirmationStatus = 'CONFIRMED';
			return responseBuilder
				.speak(speechOutput)
				.reprompt(repromptOutput)
				.addElicitSlotDirective('timePeriod', updatedIntent)
				.getResponse();
		}

		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.NoIntent") {
			if (failCounter < 2) {
			helper.incFailCounter(handlerInput);
			let speechOutput = `I'm sorry about that, let's try again. What is the license plate number of the vehicle?`;
			let repromptOutput = `What is the license plate number of the vehicle?`;
			return responseBuilder
				.speak(speechOutput)
				.reprompt(repromptOutput)
				.addElicitSlotDirective('licensePlate', sessionAttributes.AbandonedVehicleIntent)
				.getResponse();
		}else {
			let speechOutput = `I'm having trouble gathering the information. Can you describe the issue in detail for your case to be reviewed by a service agent?`;
			return responseBuilder
				.speak(speechOutput)
				.withShouldEndSession(true)
				.getResponse();
			}
		}
	}
};




module.exports = {
	StartedAbandonedVehicleIntentHandler,
	InProgressAbandonedVehicleIntentHandler,
	CompletedAbandonedVehicleIntentHandler,
	yn_IsAbandonedVehicleIntentHandler,
	yn_ConfirmVehicleDescriptionIntentHandler,
	yn_ConfirmLicensePlateIntentHandler
}
