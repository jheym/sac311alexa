const Alexa = require("ask-sdk-core")
const helper = require("../helper/helperFunctions.js")
const sfCase = require("../helper/SalesforceCaseObject.js")

const StartedCloggedStormDrainIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === "CloggedStormDrainIntent" &&
            Alexa.getDialogState(handlerInput.requestEnvelope) === "STARTED"
        )
    },
	async handle(handlerInput) {
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
		sessionAttributes.intentToRestore = 'CloggedStormDrainIntent';
		attributesManager.setSessionAttributes(sessionAttributes);
		helper.setQuestion(handlerInput, null);
		helper.setQuestion(handlerInput, 'confirmCloggedDrain?');

		return responseBuilder
			.speak(handlerInput.t('CLOGGED_CONFIRM'))
			.withShouldEndSession(false)
			.getResponse();
	}
}

const yn_StartedCloggedStormDrainIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.YesIntent" ||
				Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.NoIntent") &&
				handlerInput.attributesManager.getSessionAttributes().questionAsked === 'confirmCloggedDrain?'
        )
    },
    async handle(handlerInput) {
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
		attributesManager.setSessionAttributes(sessionAttributes);
		helper.setQuestion(handlerInput, null);

		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
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
				.speak(handlerInput.t('CLOGGED_ADDRESS'))
				.addElicitSlotDirective('userGivenAddress', GetLocationFromUserIntent)
				.getResponse();
		}
		else {
			helper.setQuestion(handlerInput, 'AnythingElse?')
			return responseBuilder
				.speak(handlerInput.t('ANYTHING_ELSE_MSG'))
				.withShouldEndSession(false)
				.getResponse();
		}
    }
}

const InProgressCloggedStormDrainIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
			&& Alexa.getIntentName(handlerInput.requestEnvelope) === "CloggedStormDrainIntent"
			&& Alexa.getDialogState(handlerInput.requestEnvelope) === "IN_PROGRESS"
        )
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes();
		helper.setQuestion(handlerInput, null);

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

		if (sessionAttributes.CloggedStormDrainIntent.slots.cloggedStormDrainInfo.value) {
			helper.setQuestion(handlerInput, 'submitCloggedTicket?')
			let desc = Alexa.getSlotValue(handlerInput.requestEnvelope, 'cloggedStormDrainInfo');
			return responseBuilder
				.speak(handlerInput.t('REPEAT_DESC',{desc: `${desc}`}))
				.withShouldEndSession(false)
				.getResponse();
		}

		helper.setQuestion(handlerInput, 'CloggedDrainServiceRequestCorrect?')
		return responseBuilder
            .speak(handlerInput.t('CLOGGED_INFO')) //normally gets rerouted to live agent
            .withShouldEndSession(false)
            .getResponse();
    }
}

const yn_SubmitCloggedDrainServiceRequestIntentHandler = {
	canHandle(handlerInput) {
		return ( 
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
			(Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.YesIntent" ||
				Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.NoIntent") &&
			handlerInput.attributesManager.getSessionAttributes().questionAsked === 'CloggedDrainServiceRequestCorrect?'
		);
	},
	handle(handlerInput) {
		helper.setQuestion(handlerInput, null);
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
			return responseBuilder
				.speak(handlerInput.t('GENERAL_DESC'))
				.withShouldEndSession(false)
				.addElicitSlotDirective('cloggedStormDrainInfo', sessionAttributes.CloggedStormDrainIntent)
				.getResponse();
		} 
		else {
			helper.setQuestion(handlerInput, 'AnythingElse?')
			return responseBuilder
				.speak(handlerInput.t('ANYTHING_ELSE_MSG'))
				.withShouldEndSession(false)
				.getResponse();
		}
	}
}

const yn_CompletedCloggedStormDrainServiceRequest = {
	canHandle(handlerInput) {
		return ( 
			Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
			(Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.YesIntent" ||
				Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.NoIntent") &&
            handlerInput.attributesManager.getSessionAttributes().questionAsked === 'submitCloggedTicket?'
		);
	},
	async handle(handlerInput) {
		helper.setQuestion(handlerInput, null);
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes();
		
        const token = await helper.getOAuthToken();
        const myCaseObj = new sfCase(token);
        var address = sessionAttributes.confirmedValidatorRes.Address;
        const userResponses = {
		    'GenericDescription': sessionAttributes.CloggedStormDrainIntent.slots.cloggedStormDrainInfo.value
		}
		
		if (sessionAttributes.confirmedPhoneNumber && sessionAttributes.confirmedPhoneNumber !== 'FAILED') {
			var phoneNumber = sessionAttributes.confirmedPhoneNumber;
		} else {
			var phoneNumber = null;
		}

		const create_case_response = await helper.createGenericCase(handlerInput, myCaseObj, 'Curb/Gutter', userResponses, null, address, phoneNumber);
		const update_case_response = await helper.updateGenericCase(myCaseObj, 'Curb/Gutter', userResponses, create_case_response.case_id, address, phoneNumber);
        console.log(update_case_response);
        helper.setQuestion(handlerInput, 'AnythingElse?')
		return handlerInput.responseBuilder
		    .speak(handlerInput.t('GENERIC_CASE_THANKS'))
			.withShouldEndSession(false)
		    .getResponse();
	}
}

module.exports = {
    StartedCloggedStormDrainIntentHandler,
	yn_StartedCloggedStormDrainIntentHandler,
	InProgressCloggedStormDrainIntentHandler,
	yn_SubmitCloggedDrainServiceRequestIntentHandler,
    yn_CompletedCloggedStormDrainServiceRequest
}