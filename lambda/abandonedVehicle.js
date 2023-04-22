
const Alexa = require("ask-sdk-core")
const helper = require("./helper/helperFunctions.js")
const sfCase = require("./helper/SalesforceCaseObject.js")
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
			//TODO: replace "for" with "4", "one" with "1", and "ate" with "8"
			//TODO: slow down the speech when speaking the license plate number
			let speechOutput = `<speak>Just to confirm, did you say the license plate number is <say-as interpret-as="spell-out">${slots.licensePlate.value}</say-as>?</speak>`
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
		
		// Send a progressive response while the case is being created. 
		//FIXME: Getting 403 Unrecognized requestId error. Not sure why this is
		//happening. See https://amazon.developer.forums.answerhub.com/questions/228211/unexpected-service-error-with-progressive-response.html
		// const prSpeechOutput = `Perfect. That's all the information I need. Please give me a moment while I enter your case.`;
		// await helper.sendProgressiveResponse(handlerInput, prSpeechOutput);
	
		const slots = currentIntent.slots;
		const internalServiceName = 'Vehicle On Street'; // Need to use the correct service name associated with the service type
		// const phoneNumber = await helper.isPhoneNumberAvailable(handlerInput) ? await helper.getPhoneNumber(handlerInput) : null; //TODO: Use phone number collection flow instead
		const token = await helper.getOAuthToken();
		// sessionAttributes.phoneNumber = phoneNumber;
		// attributesManager.setSessionAttributes(sessionAttributes);
		slots.timePeriod.value = helper.toDays(currentIntent.slots.timePeriod.value);
		const caseNumber = sessionAttributes.caseNumber;
		const caseId = sessionAttributes.caseId;


		if (!sessionAttributes.confirmedValidatorRes) {
			// TODO: Submit generic case with unvalidated location
			console.log('Creating generic case')
			helper.setQuestion(handlerInput, "AnythingElse?")
			return responseBuilder
				.speak(`Thank you for reporting the abandoned vehicle. Your case will be reviewed by a service agent. Is there anything else I can help you with?`)
				.withShouldEndSession(false)
				.getResponse();
		} else {
			var address = sessionAttributes.confirmedValidatorRes.Address;
			// const myCaseObj = new sfCase(token);
			// const open_res = await helper.openIntegratedCase(handlerInput, myCaseObj, internalServiceName, address, phoneNumber);
			// [caseNumber, caseId] = [open_res.case_number, open_res.case_id];
			// const myUpdateCaseObj = new sfCase(token);
			const caseObj = sessionAttributes.caseObj
			const myCaseObj = new sfCase(token); // Reconstruct the case object
			for (let [key, value] of Object.entries(caseObj)) { myCaseObj[key] = value; } // TODO: reconstruct the sfcaseobj in an interceptor. possibly with new token each time?
			const update_res = await helper.updateIntegratedCase(handlerInput, slots, caseId, myCaseObj, internalServiceName, address, null);
			console.log(update_res)
			
			// const myUpdateCaseObj = new sfCase(handlerInput, 'Vehicle On Street', token); // TODO: Try case_update on the same object (dont create a new one!)
			// const caseUpdateRes = await myUpdateCaseObj.case_update(caseId, location, 'Vehicle On Street', null);
		}
		
		// TEST CODE FOR CASE CREATION
		// Test code - checking the case in the db
		// let query1 = `SELECT CreatedDate, Id, CaseNumber, Service_Type__c, Sub_Service_Type__c, Subject, Status, Origin, ContactId, Description, Email_Web_Notes__c
		// 						FROM Case
		// 						WHERE CaseNumber = '${case_number}'`;
		// let res1 = await helper.querySFDB(query1, token);
		// if (res1.data.records[0]) { console.log(res1.data.records[0]) };
		
		
		
		// const myUpdateCaseObj = new sfCase(handlerInput, 'Vehicle On Street', token); // TODO: Try case_update on the same object (dont create a new one!)
		// const update_res = await my_case_obj.case_update(case_id, location, 'Vehicle On Street', null);
		
		// // test code, checking the case in the db
		// let query2 = `SELECT CreatedDate, Id, CaseNumber, Service_Type__c, Sub_Service_Type__c, Subject, Status, Origin, Anonymous_Contact__c, ContactId, Description, Email_Web_Notes__c,
		// 							Address_Geolocation__Latitude__s, Address_Geolocation__Longitude__s, Address_X__c, Address_Y__c, Address__c, GIS_City__c, Street_Center_Line__c, Case_Gis_Info_JSON__c
		// 							FROM Case
		// 							WHERE CaseNumber = '${case_number}'`;
		// const res2 = await helper.querySFDB(query2, token);
		// if (res2.data.records[0]) { console.log(res2.data.records[0]); };
		// // end test code

		var make = Alexa.getSlotValue(handlerInput.requestEnvelope, 'make');
		var model = Alexa.getSlotValue(handlerInput.requestEnvelope, 'model');
		var color = Alexa.getSlotValue(handlerInput.requestEnvelope, 'color');
		speakOutput = handlerInput.t('ABANDONED_VEHICLE_THANKS', { color: `${color}`, make: `${make}`, model: `${model}`, location: `${address}`, caseNumber: `${caseNumber}` })
		
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
		const currentIntent = requestEnvelope.request.intent;

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
			} else {
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
			}
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
			const internalServiceName = 'Vehicle On Street';
			let phoneNumber = '9165551111'
			var address = sessionAttributes.confirmedValidatorRes.Address;
			const caseObj = sessionAttributes.caseObj
			const myCaseObj = new sfCase(caseObj.token); // Reconstruct the case object
			for (let [key, value] of Object.entries(caseObj)) { myCaseObj[key] = value; } // TODO: reconstruct the sfcaseobj in an interceptor. possibly with new token each time?
			const slots = sessionAttributes.AbandonedVehicleIntent.slots;
			const open_res = await helper.openIntegratedCase(handlerInput, slots, myCaseObj, internalServiceName, address, phoneNumber);
			console.log(open_res);
			sessionAttributes.caseNumber = open_res.case_number;
			sessionAttributes.caseId = open_res.case_id
			sessionAttributes.caseObj = myCaseObj;
			attributesManager.setSessionAttributes(sessionAttributes);

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
