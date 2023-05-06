const Alexa = require("ask-sdk-core")
const helper = require("../helper/helperFunctions.js")
const sfCase = require('../helper/SalesforceCaseObject.js')
const axios = require("axios")


const StartedGetCouncilDistrictIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
			Alexa.getIntentName(handlerInput.requestEnvelope) === "GetCouncilDistrictIntent" &&
			Alexa.getDialogState(handlerInput.requestEnvelope) === "STARTED"
		)
	},
	async handle(handlerInput) {
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
		sessionAttributes.intentToRestore = 'GetCouncilDistrictIntent';

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
			let speechOutput = `Sure! I found a city address associated with your Amazon account. Would you like to use it to check your council district?`;
			helper.setYNQuestion(handlerInput, 'UseHomeAddressCouncilDistrict?')
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

const InProgressGetCouncilDistrictIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
			&& Alexa.getIntentName(handlerInput.requestEnvelope) === "GetCouncilDistrictIntent"
			&& Alexa.getDialogState(handlerInput.requestEnvelope) !== "STARTED"
		)
	},
	async handle(handlerInput) {
		const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes();
		const address = sessionAttributes.confirmedValidatorRes;
		const internal_geocoder = address?.geocoderResponse?.internal_geocoder ? address.geocoderResponse.internal_geocoder : null;
		let speechOutput;
		
		if (!address.Within_City || !internal_geocoder) {
			speechOutput = handlerInput.t("Sorry, I cannot retrieve a council district for the location you gave, as it is not within the City of Sacramento.")
		}
		else {
			const geometry = {
				"x": internal_geocoder.candidates[0].location.x,
				"y": internal_geocoder.candidates[0].location.y
			}

			const layerDefsString = JSON.stringify(layerDefs)
			const geometryString = JSON.stringify(geometry)

			const url = `${process.env.INTERNAL_GIS_ENDPOINT}/arcgis/rest/services/GenericOverlay/FeatureServer/query?layerDefs=${layerDefsString}&geometry=${geometryString}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&inSR=4326&returnDistinctValues=false&returnGeometry=false&returnIdsOnly=false&returnCountOnly=false&returnZ=false&returnM=false&returnTrueCurves=false&sqlFormat=none&f=json`

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
				console.log(JSON.stringify(res.data, null, 2))
				const districtLayer = res.data.layers.find(x => x.id === 8);
				const distNum = districtLayer.features[0].attributes.DISTNUM;
				const distNumSSML = `<say-as interpret-as="spell-out">${distNum}</say-as>`
				const distMember = districtLayer.features[0].attributes.NAME;
				speechOutput = `The council district for the location you gave is district ${distNumSSML}, and the district member is ${distMember}.`

			} catch (error) {
				console.log(error);
				speechOutput = handlerInput.t("I'm sorry, something went wrong on my end. I cannot retrieve a council district for your address.")
			}

		}
		speechOutput += handlerInput.t(" Is there anything else I can help you with?")
		helper.setYNQuestion(handlerInput, 'AnythingElse?')
		return responseBuilder
			.withShouldEndSession(false)
			.speak(`<speak>${speechOutput}</speak>`)
			.getResponse();
	}
}


const yn_UseHomeAddressForCouncilDistrictIntentHandler = {
	canHandle(handlerInput) {
		const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
		const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
		const ynQuestionAsked = handlerInput.attributesManager.getSessionAttributes().ynQuestionAsked;
		return (
			requestType === "IntentRequest" &&
			(intentName === "AMAZON.YesIntent" || intentName === "AMAZON.NoIntent") &&
			ynQuestionAsked === "UseHomeAddressCouncilDistrict?"
		);
	},
	async handle(handlerInput) {
		helper.setYNQuestion(handlerInput, null)
		const { requestEnvelope, responseBuilder } = handlerInput;

		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
			return responseBuilder
				.addDelegateDirective({
					name: 'GetCouncilDistrictIntent',
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
        "outFields": "DISTNUM, NAME"
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
	StartedGetCouncilDistrictIntentHandler,
	InProgressGetCouncilDistrictIntentHandler,
	yn_UseHomeAddressForCouncilDistrictIntentHandler
}