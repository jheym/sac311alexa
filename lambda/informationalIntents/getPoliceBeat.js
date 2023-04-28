const Alexa = require("ask-sdk-core")
const helper = require("../helper/helperFunctions.js")
const sfCase = require('../helper/SalesforceCaseObject.js')
const axios = require("axios")

//Started
const StartedGetPoliceBeatIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
			Alexa.getIntentName(handlerInput.requestEnvelope) === "GetPoliceBeatIntent" &&
			Alexa.getDialogState(handlerInput.requestEnvelope) === "STARTED"
		)
	},
	async handle(handlerInput) {
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
		sessionAttributes.intentToRestore = 'GetPoliceBeatIntent';

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
			let speechOutput = `Sure! I found a city address associated with your Amazon account. Would you like to use it to check your police beat?`;
			helper.setQuestion(handlerInput, 'UseHomeAddressPoliceBeat?')
			return responseBuilder
				.speak(speechOutput)
				.withShouldEndSession(false)
				.getResponse();
		} else {
			let speechOutput = `Sure, I can check any address or cross street within the city of Sacramento. What address should I check?`
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
				.addElicitSlotDirective('userGivenAddress', GetLocationFromUserIntent)
				.getResponse();
		}
	}
};

const InProgressGetPoliceBeatIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
			&& Alexa.getIntentName(handlerInput.requestEnvelope) === "GetPoliceBeatIntent"
			&& Alexa.getDialogState(handlerInput.requestEnvelope) !== "STARTED"
		)
	},
	async handle(handlerInput) {
		const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes();
		const address = sessionAttributes.confirmedValidatorRes;
		const { internal_geocoder } = address.geocoderResponse;

		if (!address.Within_City) {
			speakOutput = handlerInput.t("Sorry, I cannot retrieve a police beat for your the location you gave, as it is not within the City of Sacramento.")
		}
		else {
			const user_fld = internal_geocoder.candidates[0].attributes.User_fld;
			const geometry = {
				"x": internal_geocoder.candidates[0].location.x,
				"y": internal_geocoder.candidates[0].location.y
			}

			const layerDefsString = JSON.stringify(layerDefs)
			const geometryString = JSON.stringify(geometry)

			const url = `https://sacgis311.cityofsacramento.org/arcgis/rest/services/GenericOverlay/FeatureServer/query?layerDefs=${layerDefsString}&geometry=${geometryString}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&inSR=4326&returnDistinctValues=false&returnGeometry=false&returnIdsOnly=false&returnCountOnly=false&returnZ=false&returnM=false&returnTrueCurves=false&sqlFormat=none&f=json`

			try {
				var res = await axios.get(encodeURI(url), {
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						"Accept": "application/json",
					}
				});
				console.log(res);
			} catch (error) {
				console.log(error);
			}
			console.log(res);
			try {
				const beatLayer = res.data.layers.find(x => x.id === 6);
				const policeBeat = beatLayer.features[0].attributes.BEAT; // TODO: Find where police beat is in the response
				const policeBeatSSML = `<say-as interpret-as="spell-out">${policeBeat}</say-as>`
				speechOutput = `The police beat for the location you gave is ${policeBeatSSML}.`

			} catch (error) {
				console.log(error);
				speechOutput = handlerInput.t("I'm sorry, something went wrong on my end. I cannot retrieve a police beat for your address.")
			}

		}
		speechOutput += handlerInput.t(" Is there anything else I can help you with?")
		helper.setQuestion(handlerInput, 'AnythingElse?')
		return handlerInput.responseBuilder
			.withShouldEndSession(false)
			.speak(`<speak>${speechOutput}</speak>`)
			.getResponse();
	}
}


const yn_UseHomeAddressForPoliceBeatIntentHandler = {
	canHandle(handlerInput) {
		const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
		const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
		const questionAsked = handlerInput.attributesManager.getSessionAttributes().questionAsked;
		return (
			requestType === "IntentRequest" &&
			(intentName === "AMAZON.YesIntent" || intentName === "AMAZON.NoIntent") &&
			questionAsked === "UseHomeAddressPoliceBeat?"
		);
	},
	async handle(handlerInput) {
		helper.setQuestion(handlerInput, null)
		const { requestEnvelope, responseBuilder } = handlerInput;

		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
			return responseBuilder
				.addDelegateDirective({
					name: 'GetPoliceBeatIntent',
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
					}
				}
			}
			return responseBuilder
				.speak(speechOutput)
				.addElicitSlotDirective('userGivenAddress', GetLocationFromUserIntent)
				.getResponse();
		}
	}
}


const layerDefs = [
    {
        "layerId": 0,
        "outFields": "DTPR_FLAG, SERVICE_DAY , RECYCLE_WEEK, ROUTE, OP_AREA"
    },
    {
        "layerId": 2,
        "outFields": "DISTRICT"
    },
    {
        "layerId": 3,
        "outFields": "ZIP5"
    },
    {
        "layerId": 4,
        "outFields": "NAME"
    },
    {
        "layerId": 5,
        "outFields": "CITY_NAME"
    },
    {
        "layerId": 6,
        "outFields": "BEAT"
    },
    {
        "layerId": 7,
        "outFields": "DISTRICT"
    },
    {
        "layerId": 8,
        "outFields": "DISTNUM"
    },
    {
        "layerId": 9,
        "outFields": "DISTRICT"
    },
    {
        "layerId": 10,
        "outFields": "PAGE,TB_ROW,TB_COL"
    },
    {
        "layerId": 11,
        "outFields": "OFFICER"
    },
    {
        "layerId": 12,
        "outFields": "OFFICER"
    },
    {
        "layerId": 13,
        "outFields": "RAINA"
    },
    {
        "layerId": 14,
        "outFields": "RAINB"
    },
    {
        "layerId": 15,
        "outFields": "NAME"
    },
    {
        "layerId": 16,
        "outFields": "TILENUM"
    },
    {
        "layerId": 17,
        "outFields": "DISTRICT"
    },
    {
        "layerId": 18,
        "outFields": "NAME"
    },
    {
        "layerId": 19,
        "outFields": "BEAT_NUM"
    },
    {
        "layerId": 25,
        "outFields": "MAINTSUP"
    },
    {
        "layerId": 28,
        "outFields": "ROUTE"
    },
    {
        "layerId": 29,
        "outFields": "ROUTE"
    },
    {
        "layerId": 34,
        "outFields": "ZI_OFFICER"
    },
    {
        "layerId": 35,
        "outFields": "VA_OFFICER"
    },
    {
        "layerId": 36,
        "outFields": "H_OFFICER"
    },
    {
        "layerId": 38,
        "outFields": "SW_OFFICER"
    },
    {
        "layerId": 39,
        "outFields": "NSA"
    }
]

module.exports = {
	StartedGetPoliceBeatIntentHandler,
	InProgressGetPoliceBeatIntentHandler,
	yn_UseHomeAddressForPoliceBeatIntentHandler
}