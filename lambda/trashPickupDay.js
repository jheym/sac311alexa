const Alexa = require("ask-sdk-core")
const helper = require("./helper/helperFunctions.js")
const iso8601 = require('iso8601-duration')
const axios = require("axios")

//Started
const StartedTrashPickupDayIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === "TrashPickupDayIntent" &&
            Alexa.getDialogState(handlerInput.requestEnvelope) === "STARTED"
        )
    },
    handle(handlerInput) {
		/*
        helper.setQuestion(handlerInput, 'IsTrashPickupDayCorrect')
        const speakOutput = handlerInput.t("Do you want to know your trash pickup day?")
        return handlerInput.responseBuilder
        .withShouldEndSession(false)
        .speak(speakOutput)
        .getResponse();
		*/
		// So GetLocationIntent knows where to delegate back to after confirming the address
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
		const currentIntent = requestEnvelope.request.intent;
		sessionAttributes.intentToRestore = 'TrashPickupDayIntent';
		attributesManager.setSessionAttributes(sessionAttributes);
		
		if (helper.isGeolocationAvailable(handlerInput)) {
			helper.setQuestion(handlerInput, 'UseGeolocation?')
			let speechOutput = `Would you like to use your current location?`;
			return responseBuilder
			.speak(speechOutput)
			.withShouldEndSession(false)
			.getResponse();
		} else {
			let speechOutput = `Where is the trash being picked up from?`
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
    }
};

const InProgressTrashPickupDayIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
			&& Alexa.getIntentName(handlerInput.requestEnvelope) === "TrashPickupDayIntent"
			&& Alexa.getDialogState(handlerInput.requestEnvelope) === "IN_PROGRESS"
		)
	},
	async handle(handlerInput) {
		const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
		const currentIntent = requestEnvelope.request.intent;
		const sessionAttributes = attributesManager.getSessionAttributes();
		const dialogState = Alexa.getDialogState(requestEnvelope);
		const intentConfirmationStatus = currentIntent.confirmationStatus;
		
		const address = sessionAttributes.confirmedValidatorRes;
		const worldAddressCandidate = await helper.getWorldAddress(address.Address);
		const internalRes = await helper.getInternalAddress(worldAddressCandidate.data.candidates[0]);
		console.log("Address within city:");
		console.log(address.Within_City);
		// use user_fld (unique address id) to look up garbage day
		// case 1: no internal address -> can't get a garbage day
		// case 2: no garbage day returned from api -> can't get a garbage day
		var speakOutput = "uhhh";
		if(!address.Within_City) {
			speakOutput = handlerInput.t("Sorry, I cannot retrieve a pickup day for your address")
		}
		else {
			const user_fld = internalRes.data.candidates[0].attributes.User_fld; // idk something like this
			const url = `https://sacgis311.cityofsacramento.org/arcgis/rest/services/GenericOverlay/FeatureServer/37/query?where=ADDRESSID = ${user_fld}&outFields=GARBAGE_DAY&f=pjson`

			try {
				var res = await axios.get(encodeURI(url), {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					"Accept" : "application/json", // maybe more headers idk
				}
			});
				console.log(res);
			} catch(error) {
				console.log(error);
			}
			console.log(res);
			try {
				const garbage_day = res.data.features[0].attributes.GARBAGE_DAY;
				console.log(garbage_day);
				if(garbage_day === 'MON-GARB') {
					speakOutput = handlerInput.t("Your trash pickup day is Monday")
				}
				else if(garbage_day === 'TUE-GARB') {
					speakOutput = handlerInput.t("Your trash pickup day is Tuesday")
				}
				else if(garbage_day === 'WED-GARB') {
					speakOutput = handlerInput.t("Your trash pickup day is Wednesday")
				}
				else if(garbage_day === 'THU-GARB') {
					speakOutput = handlerInput.t("Your trash pickup day is Thursday")
				}
				else if(garbage_day === 'FRI-GARB') {
					speakOutput = handlerInput.t("Your trash pickup day is Friday")
				}
				else {
					speakOutput = handlerInput.t("Sorry, I cannot retrieve a pickup day for your address")
				}
			} catch(error) {
				console.log(error);
				speakOutput = handlerInput.t("Sorry, I cannot retrieve a pickup day for your address")
			}
			
		}
		return handlerInput.responseBuilder
		.speak(speakOutput)
		.getResponse();
	}
}

module.exports = {
    StartedTrashPickupDayIntentHandler,
	InProgressTrashPickupDayIntentHandler
}