const Alexa = require("ask-sdk-core")
const helper = require("./helper/helperFunctions.js")
const sfCase = require('./helper/SalesforceCaseObject.js')
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
    async handle(handlerInput) {
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
		sessionAttributes.intentToRestore = 'TrashPickupDayIntent';
		
		if (await helper.isHomeAddressAvailable(handlerInput)) {
			const { addressLine1 } = await helper.getHomeAddress(handlerInput);
			if (addressLine1.length > 0) {
				const token = await helper.getOAuthToken(handlerInput);
				const myCaseObj = new sfCase(token);
				var validatorObj = await myCaseObj.address_case_validator(addressLine1);
			}
		}

		if (validatorObj && validatorObj.Within_City === true) {
			sessionAttributes.confirmedValidatorRes = validatorObj;
			attributesManager.setSessionAttributes(sessionAttributes);
			let speechOutput = `Sure! I found a city address associated with your Amazon account. Would you like to use it to check your garbage day?`;
			helper.setQuestion(handlerInput, 'UseHomeAddressForGarbage?')
			return responseBuilder
				.speak(speechOutput)
				.withShouldEndSession(false)
				.getResponse();
		} else {
			let speechOutput = `Sure, I can check any address within the city of Sacramento. What address should I check?`
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
			&& Alexa.getDialogState(handlerInput.requestEnvelope) !== "STARTED"
		)
	},
	async handle(handlerInput) {
		const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes();
		const address = sessionAttributes.confirmedValidatorRes;
		const { internal_geocoder } = address.geocoderResponse;
	
		if(!address.Within_City) {
			speakOutput = handlerInput.t("Sorry, I cannot retrieve a pickup day for your address")
		}
		else {
			const user_fld = internal_geocoder.candidates[0].attributes.User_fld;
			const url = `https://sacgis311.cityofsacramento.org/arcgis/rest/services/GenericOverlay/FeatureServer/37/query?where=ADDRESSID = ${user_fld}&outFields=GARBAGE_DAY&f=pjson`

			try {
				var res = await axios.get(encodeURI(url), {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					"Accept" : "application/json",
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
					speakOutput = handlerInput.t("Your trash pickup day is Monday.")
				}
				else if(garbage_day === 'TUE-GARB') {
					speakOutput = handlerInput.t("Your trash pickup day is Tuesday.")
				}
				else if(garbage_day === 'WED-GARB') {
					speakOutput = handlerInput.t("Your trash pickup day is Wednesday.")
				}
				else if(garbage_day === 'THU-GARB') {
					speakOutput = handlerInput.t("Your trash pickup day is Thursday.")
				}
				else if(garbage_day === 'FRI-GARB') {
					speakOutput = handlerInput.t("Your trash pickup day is Friday.")
				}
				else {
					speakOutput = handlerInput.t("Sorry, I cannot retrieve a pickup day for your address.")
				}
			} catch(error) {
				console.log(error);
				speakOutput = handlerInput.t("Sorry, I cannot retrieve a pickup day for your address.")
			}
			
		}
		speakOutput += handlerInput.t(" Is there anything else I can help you with?")
		helper.setQuestion(handlerInput, 'AnythingElse?')
		return handlerInput.responseBuilder
		.withShouldEndSession(false)
		.speak(speakOutput)
		.getResponse();
	}
}


const yn_UseHomeAddressForGarbageDayIntentHandler = {
	canHandle(handlerInput) {
		const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
		const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
		const questionAsked = handlerInput.attributesManager.getSessionAttributes().questionAsked;
		return (
			requestType === "IntentRequest" && 
			(intentName === "AMAZON.YesIntent" || intentName === "AMAZON.NoIntent") &&
			questionAsked === "UseHomeAddressForGarbage?"
		);
	},
	async handle(handlerInput) {
		helper.setQuestion(handlerInput, null)
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		
		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
			return responseBuilder
				.addDelegateDirective({
					name: 'TrashPickupDayIntent',
					confirmationStatus: 'NONE',
					slots: {}
				})
				.getResponse();
		} 
		
		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.NoIntent") {
			let speechOutput = `Okay, I can check any address within the city of Sacramento. What address should I check?`
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
}

module.exports = {
    StartedTrashPickupDayIntentHandler,
	InProgressTrashPickupDayIntentHandler,
	yn_UseHomeAddressForGarbageDayIntentHandler
}