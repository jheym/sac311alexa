
const Alexa = require("ask-sdk-core")
const helper = require("./helper/helperFunctions.js")
const sfCase = require("./helper/SalesforceCaseObject.js")
const iso8601 = require('iso8601-duration')

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
			//FIXME: Alexa device turns off after submitting a case.
			// Try submitting a progressive response?
			// https://developer.amazon.com/en-US/docs/alexa/custom-skills/send-the-user-a-progressive-response.html
			return responseBuilder
			.speak(speechOutput)
			.withShouldEndSession(false)
			.addDelegateDirective()
			.getResponse();
		}

		if (slots.licensePlate.value) {
			let speechOutput = `Just to confirm, did you say the license plate number is ${slots.licensePlate.value}?`
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
				speechOutput = 'What is the make of the vehicle?'
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
			.addElicitSlotDirective(slotToElicit, currentIntent)
			.getResponse();
		}
	},
};


const CompletedAbandonedVehicleIntentHandler = {
	canHandle(handlerInput) {
		return ( Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
		Alexa.getIntentName(handlerInput.requestEnvelope) === "AbandonedVehicleIntent" &&
		Alexa.getDialogState(handlerInput.requestEnvelope) === "COMPLETED");
	},
	async handle(handlerInput) {
		const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
		const currentIntent = requestEnvelope.request.intent;
		const sessionAttributes = attributesManager.getSessionAttributes();
		
		// TEST CODE FOR CASE CREATION
		// TODO: Is phone number required for basic case?
		var location = sessionAttributes.confirmedLocation;
		let phone_number = '9165551111' // TODO: Get phone number from Alexa api
		let service_name = 'Vehicle On Street' // Need to use the correct service name
		let token = await helper.getOAuthToken();
		let my_case_obj = new sfCase(handlerInput, 'Vehicle On Street', token); // Creating a new case object with a new token

		let { case_number, case_id } = await my_case_obj.create_basic_case(service_name, phone_number, location);

		let basic_case_query = `SELECT CreatedDate, Id, CaseNumber, Service_Type__c, Sub_Service_Type__c, Subject, Status, Origin, ContactId, Description, Email_Web_Notes__c
							FROM Case
							WHERE CaseNumber = '${case_number}'`;
		let basic_case_res = await helper.querySFDB(basic_case_query, token);

		if (basic_case_res.data.records[0])
			console.log(basic_case_res.data.records[0])

		sessionAttributes.phone_number = phone_number;
		attributesManager.setSessionAttributes(sessionAttributes);

		my_case_obj = new sfCase(handlerInput, 'Vehicle On Street', token); // TODO: Try case_update on the same object (dont create a new one!)
		let json_input = my_case_obj.json_input;
		json_input['vehicle_license_number'] = '5RTD901';
		json_input['time-period'] = '3';
		const update_res = await my_case_obj.case_update(case_id, location, 'Vehicle On Street', json_input);

		let updated_case_query = `SELECT CreatedDate, Id, CaseNumber, Service_Type__c, Sub_Service_Type__c, Subject, Status, Origin, Anonymous_Contact__c, ContactId, Description, Email_Web_Notes__c,
																Address_Geolocation__Latitude__s, Address_Geolocation__Longitude__s, Address_X__c, Address_Y__c, Address__c, GIS_City__c, Street_Center_Line__c, Case_Gis_Info_JSON__c
																FROM Case
																WHERE CaseNumber = '${case_number}'`;

		const updated_case_res = await helper.querySFDB(updated_case_query, token);

		if (updated_case_res.data.records[0])
			console.log(updated_case_res.data.records[0]);

		console.log(update_res);
		// END TEST CODE

		console.log(Alexa.getSlotValue(handlerInput.requestEnvelope, 'licensePlate'));
		console.log(iso8601.parse(Alexa.getSlotValue(handlerInput.requestEnvelope, 'timePeriod')));
		var make = Alexa.getSlotValue(handlerInput.requestEnvelope, 'make');
		var model = Alexa.getSlotValue(handlerInput.requestEnvelope, 'model');
		var color = Alexa.getSlotValue(handlerInput.requestEnvelope, 'color');
		speakOutput = handlerInput.t('ABANDONED_VEHICLE_THANKS', { color: `${color}`, make: `${make}`, model: `${model}`, location: `${location}`, case_number: `${case_number}` })
		helper.clearContext(handlerInput, sessionAttributes.AbandonedVehicleIntent)
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
				let speechOutput = `Would you like to use your current location as the location of the abandoned vehicle?`;
				return responseBuilder
				.speak(speechOutput)
				.withShouldEndSession(false)
				.getResponse();
			} else {
				let speechOutput = `Where is the abandoned vehicle located? You can give an address or nearest cross street.`
				let GetLocationFromUserIntent = {
					name: 'GetLocationFromUserIntent',
					confirmationStatus: 'NONE',
					slots: {
						userGivenAddress: {
							name: 'userGivenAddress',
							value: null,
							confirmationStatus: 'NONE'
				}}}
				return responseBuilder
				.speak(speechOutput)
				.addElicitSlotDirective('userGivenAddress', GetLocationFromUserIntent)
				.getResponse();
			}
		} // YesIntent

		// TODO: Create an interceptor for clearing 'Tryagain?' question.. If
		// sessionAttributes.questionAsked is not null and the incoming intent
		// is not an AMAZON.YesIntent or AMAZON.NoIntent, then clear the
		// questionAsked
		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.NoIntent") {
			helper.setQuestion(handlerInput, 'TryAgain?') 
			return responseBuilder
			.speak(handlerInput.t('UNKNOWN_MSG'))
			.reprompt(handlerInput.t('UNKNOWN_MSG_REPROMPT'))
			.withShouldEndSession(false) // This prevents the skill from ending the session
			.getResponse()
		}
			
			

			// if (slots.make.value && slots.model.value && slots.color.value) {
			// 	let { make, model, color } = slots;
			// 	helper.setQuestion(handlerInput, 'IsVehicleDescriptionCorrect?')
			// 	return responseBuilder
			// 	.speak(`Just to confirm, did you say the vehicle is a ${color.value} ${make.value} ${model.value}?`)
			// 	.withShouldEndSession(false)
			// 	.getResponse();
			// } else {
			// 	let vehicleDescription = { make: slots.make.value, model: slots.model.value, color: slots.color.value }
			// 	let answeredSlots = {}
			// 	var slotToElicit;
			// 	for ([k, v] of Object.entries(vehicleDescription))
			// 		if (v) answeredSlots[k] = v;
				
			// 	if (!answeredSlots.make) {
			// 		speechOutput = 'What is the make of the vehicle?'
			// 		slotToElicit = 'make'
			// 	} else if (!answeredSlots.model) {
			// 		speechOutput = 'What is the model of the vehicle?'
			// 		slotToElicit = 'model' 
			// 	} else if (!answeredSlots.color) {
			// 		speechOutput = 'What is the color of the vehicle?'
			// 		slotToElicit = 'color'
			// 	}
				
			// 	return responseBuilder
			// 	.speak(speechOutput)
			// 	.reprompt(speechOutput)
			// 	.addElicitSlotDirective(slotToElicit, AbandonedVehicleIntent)
			// 	.getResponse();
			// }
		// } 
	} // handle()
};


const yn_ConfirmVehicleDescriptionIntentHandler = {
	canHandle(handlerInput) {
		const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
		const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
		const questionAsked = handlerInput.attributesManager.getSessionAttributes().questionAsked;
		return (
			requestType === "IntentRequest" && 
			(intentName === "AMAZON.YesIntent" || intentName === "AMAZON.NoIntent") &&
			questionAsked === 'IsVehicleDescriptionCorrect?'
		);
	},
	handle(handlerInput) {
		helper.setQuestion(handlerInput, null)
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes();
		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
			helper.clearFailCounter(handlerInput);
			let speechOutput = `Great! What is the license plate number of the vehicle?`;
			return responseBuilder
			.speak(speechOutput)
			.addElicitSlotDirective('licensePlate', sessionAttributes.AbandonedVehicleIntent)
			.getResponse();
		} 
		
		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.NoIntent") { 
			// TODO: Submit generic case if fail handler >= 3
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
		}
	}
};


const yn_ConfirmLicensePlateIntentHandler = {
	canHandle(handlerInput) {
		const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
		const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
		const questionAsked = handlerInput.attributesManager.getSessionAttributes().questionAsked;
		return (
			requestType === "IntentRequest" && 
			(intentName === "AMAZON.YesIntent" || intentName === "AMAZON.NoIntent") &&
			questionAsked === 'IsLicensePlateCorrect?'
		);
	},
	handle(handlerInput) {
		helper.setQuestion(handlerInput, null);
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes();
		
		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
			helper.clearFailCounter(handlerInput);
			let speechOutput = `Great! How long has the vehicle been abandoned?`;
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
			helper.incFailCounter(handlerInput);
			let speechOutput = `I'm sorry about that, let's try again. What is the license plate number of the vehicle?`;
			let repromptOutput = `What is the license plate number of the vehicle?`;
			return responseBuilder
			.speak(speechOutput)
			.reprompt(repromptOutput)
			.addElicitSlotDirective('licensePlate', sessionAttributes.AbandonedVehicleIntent)
			.getResponse();
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
