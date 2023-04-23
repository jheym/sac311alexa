const Alexa = require("ask-sdk-core")
const helper = require("./helper/helperFunctions.js")
const sfCase = require("./helper/SalesforceCaseObject.js")

//Started
const StartedCloggedStormDrainIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === "CloggedStormDrainIntent" &&
            Alexa.getDialogState(handlerInput.requestEnvelope) === "STARTED"
        )
    },
    async handle(handlerInput) {

        helper.setQuestion(handlerInput, null)
        const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.intentToRestore = 'CloggedStormDrainIntent';
        attributesManager.setSessionAttributes(sessionAttributes);

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
		    .speak(handlerInput.t('CLOGGED_INTRO'))
		    .addElicitSlotDirective('userGivenAddress', GetLocationFromUserIntent)
		    .getResponse();
    }
}

//In-progress
const InProgressCloggedStormDrainIntentHandler = {
    canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
			&& Alexa.getIntentName(handlerInput.requestEnvelope) === "CloggedStormDrainIntent"
			&& Alexa.getDialogState(handlerInput.requestEnvelope) === "IN_PROGRESS"
		)
	},
	async handle(handlerInput) {
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

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


        helper.setQuestion(handlerInput, null)
        helper.setQuestion(handlerInput, 'finishClogged?')

        sessionAttributes.intentToRestore = 'CloggedStormDrainIntent';
        attributesManager.setSessionAttributes(sessionAttributes);

        let GetGenericDescriptionFromUserIntent = { //TODO: Remove this intent and replace it with a slot in your own intent. Doing it this way will not scale well.
			name: 'GetGenericDescriptionFromUserIntent',
			confirmationStatus: 'NONE',
			slots: {
				GenericDescription: {
					name: 'GenericDescription',
					value: null,
					confirmationStatus: 'NONE'
		}}}
		return responseBuilder
		    .speak(handlerInput.t('CLOGGED_DESC'))
		    .addElicitSlotDirective('GenericDescription', GetGenericDescriptionFromUserIntent) 
		    .getResponse();
    }
}

//Ending
const CompletedCloggedStormDrainIntentHandler = {
    canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
			Alexa.getIntentName(handlerInput.requestEnvelope) === 'CloggedStormDrainIntent' &&
            handlerInput.attributesManager.getSessionAttributes().questionAsked === 'finishClogged?' // TODO: Unecessary. questionAsked is only useful for yes/no intents.
		);
	},
    async handle(handlerInput) {
        helper.setQuestion(handlerInput, null)
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes();

		// TODO: Read back the description message to the Skill user and get their confirmation first.
        const token = await helper.getOAuthToken();
        const myCaseObj = new sfCase(token);
        var address = sessionAttributes.confirmedValidatorRes.Address;
        //const genericDescription = sessionAttributes.CloggedStormDrainIntent.GenericDescription;
        const userResponses = {
		    'GenericDescription': sessionAttributes.CloggedStormDrainIntent.GenericDescription
		}
		
		if (sessionAttributes.confirmedPhoneNumber && sessionAttributes.confirmedPhoneNumber !== 'FAILED') {
			var phoneNumber = sessionAttributes.confirmedPhoneNumber;
		} else {
			var phoneNumber = null;
		}

		const create_case_response = await helper.createGenericCase(handlerInput, myCaseObj, 'Curb/Gutter', userResponses, null, address, phoneNumber);
		console.log(userResponses);

		const update_case_response = await helper.updateGenericCase(myCaseObj, 'Curb/Gutter', userResponses, create_case_response.case_id, address, phoneNumber);
        console.log(update_case_response);

        helper.setQuestion(handlerInput, 'AnythingElse?')
		return handlerInput.responseBuilder
		    .speak(handlerInput.t('CLOGGED_THANKS'))
			.withShouldEndSession(false)
		    .getResponse();
    }
}

module.exports = {
    StartedCloggedStormDrainIntentHandler,
	InProgressCloggedStormDrainIntentHandler,
    CompletedCloggedStormDrainIntentHandler
}