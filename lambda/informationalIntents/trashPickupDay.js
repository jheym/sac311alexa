const Alexa = require("ask-sdk-core")
const helper = require("../helper/helperFunctions.js")
const sfCase = require('../helper/SalesforceCaseObject.js')
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
				sessionAttributes.caseObj = myCaseObj;
				attributesManager.setSessionAttributes(sessionAttributes);
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
		const { attributesManager, responseBuilder } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes();
		const address = sessionAttributes.confirmedValidatorRes;
		const { internal_geocoder } = address.geocoderResponse;
		var speechOutput;

		if(!address.Within_City) {
			let speechOutput = `I'm sorry, I wasn't able to find a service day for that address.`;
			speechOutput += ` Is there anything else I can help you with?`;
			helper.setQuestion(handlerInput, 'AnythingElse?')
			return responseBuilder
			.withShouldEndSession(false)
			.speak(speechOutput)
			.getResponse();
		}
		
		const caseObj = sessionAttributes.caseObj;
		const myCaseObj = new sfCase(caseObj.token); // Reconstruct the case object
		for (let [key, value] of Object.entries(caseObj)) { myCaseObj[key] = value; };
		const { out_json, dtpr } = await myCaseObj.overlay(internal_geocoder);

		if (dtpr) {

			if (!(internal_geocoder.candidates[0].attributes.Addr_type === 'Address')) {
				let speechOutput = `I'm sorry, I cannot retrieve a pickup day for that address.`;
				speechOutput += ` Is there anything else I can help you with?`;
				helper.setQuestion(handlerInput, 'AnythingElse?');
				return responseBuilder
				.withShouldEndSession(false)
				.speak(speechOutput)
				.getResponse();
			}

			const user_fld = internal_geocoder.candidates[0].attributes.User_fld;
			const url = `${process.env.INTERNAL_GIS_ENDPOINT}/arcgis/rest/services/GenericOverlay/FeatureServer/37/query?where=ADDRESSID = ${user_fld}&outFields=*&f=pjson`
			let res;
			
			try {
				res = await axios.get(encodeURI(url), {
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						"Accept" : "application/json",
					}
				});
			} catch(error) {
				if (error.response) {
					console.log(error.response.data);
					console.log(error.response.status);
					throw new Error(error.response.data);
				} else {
					console.log(error);
					throw new Error(error);
				}
			}

			const dtprDayMap = {
				"MON": "Monday",
				"TUE": "Tuesday",
				"WED": "Wednesday",
				"THU": "Thursday",
				"FRI": "Friday",
			}

			const garbageDay = res?.data?.features[0]?.attributes?.GARBAGE_DAY.split('-')[0]
			const recycleDay = res?.data?.features[0]?.attributes?.RECYCLE_DAY.split('-')[0];
			const recycleRoute = res?.data?.features[0]?.attributes?.RECYCLE_ROUTE;
			console.log('test');

			const garbageDayString =  dtprDayMap.hasOwnProperty(garbageDay) ? dtprDayMap[garbageDay] : null;
			const recycleDayString =  dtprDayMap.hasOwnProperty(recycleDay) ? dtprDayMap[recycleDay] : null;

			if (garbageDayString || recycleDayString) {
				
				if (garbageDayString) {
					speechOutput = `Your garbage service day is every ${garbageDayString}. `;
				}

				if (recycleDayString) {
					speechOutput += `Your recycling service day is every other ${recycleDayString}. `;
				}
						
			} else {
				speechOutput = `I'm sorry, I wasn't able to find a service day for that address. `;
			}

		}

		if (!dtpr) {
			const layer0 = out_json?.data?.layers?.find(layer => layer.id === 0);
			const garbageDay = layer0?.features[0]?.attributes?.SERVICE_DAY;
			const recycleWeek = layer0?.features[0]?.attributes?.RECYCLE_WEEK;
			speechOutput = `Your garbage service day is every ${garbageDay}. Your recycling service day is every other ${garbageDay}. `
		}
	
		speechOutput += `Is there anything else I can help you with?`;
		helper.setQuestion(handlerInput, 'AnythingElse?')
		return responseBuilder
		.withShouldEndSession(false)
		.speak(speechOutput)
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

const dtprRecycleMap = {

}



module.exports = {
    StartedTrashPickupDayIntentHandler,
	InProgressTrashPickupDayIntentHandler,
	yn_UseHomeAddressForGarbageDayIntentHandler
}