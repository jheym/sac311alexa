/*
 * Give the caller the same information that is heard in the 311 IVR call
 *
 * ask if they would like to send a service request to be reviewed by someone at city of sacramento
 * 
 * if yes, delegate to CreateGenericServiceRequestIntent
 * 
 * if no, ask if there is anything else we can help with
 */



/* Information from call:
 *If you see a loose dog in a busy area, its best not to try to catch them, as they may run into traffic. They will likely wander into a quieter area, or someone's yard where they can be safely secured.
 *If you've already captured the dog, the best possible thing you can do for the dog is to keep them in your home and take a few days to try to find the owner before bringing them to a shelter.
 *92% of loose dogs have an owner, but most dogs brought to shelters aren't found by their owners. Dogs are 12 times more likely to be found if they stay in their neighborhood, 
 *especially if you can post their picture on craigslist, nextdoor, facebook lost and found pages, and walking them around the neighborhood.
 *For all our quick and easy tips to find a dog's owner, visit cityofsacramento.org.
 *Holding onto the dog while you locate the owner will also help save space in crowded animal shelters.
 *If you can't hold onto the dog, try asking neighbors, friends, family, or doing a post on your social media. You'd be amazed how many animal lovers are willing and able to be a hero to a lost dog in need.
 *If neither you or anyone you know can care for the dog for a few days, you can make an appointment to bring the dog to the shelter by.... You can also bring the dog to the shelter without an appointment 
 *between 12pm to 5pm seven days a week. However, there may be a long late time as we prioritize emergencies and citizens with existing appointments.
 *An appointment is highly recommended. Would you like to submit a service request to be reviewed by someone at City of Sacramento?
 */


// FIXME: The Description confirmation does not work for this intent. Use
// addConfirmSlotDirective. Additionally, you are not supposed to use the
// setYNQuestion() function for anything other than yes/no intents. Doing so may
// cause unintended behavior. 


const Alexa = require("ask-sdk-core")
const helper = require("../helper/helperFunctions.js")
const sfCase = require('../helper/SalesforceCaseObject.js')

const StartedFoundLostDogIntentHandler = {
	canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === "FoundLostDogIntent" &&
            Alexa.getDialogState(handlerInput.requestEnvelope) === "STARTED"
        )
    },
    async handle(handlerInput) {
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
		sessionAttributes.intentToRestore = 'FoundLostDogIntent';
		attributesManager.setSessionAttributes(sessionAttributes);
		helper.setYNQuestion(handlerInput, null);
		helper.setYNQuestion(handlerInput, 'confirmLostDog?');

		return responseBuilder
			.speak(handlerInput.t('LOSTDOG_CONFIRM'))
			.withShouldEndSession(false)
			.getResponse();
	}
}

const yn_StartedFoundLostDogIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.YesIntent" ||
				Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.NoIntent") &&
            handlerInput.attributesManager.getSessionAttributes().ynQuestionAsked === 'confirmLostDog?'
        )
    },
    async handle(handlerInput) {
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
		attributesManager.setSessionAttributes(sessionAttributes);
		helper.setYNQuestion(handlerInput, null);

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
				.speak(handlerInput.t('LOSTDOG_ADDRESS'))
				.addElicitSlotDirective('userGivenAddress', GetLocationFromUserIntent)
				.getResponse();
		}
		else {
			helper.setYNQuestion(handlerInput, 'AnythingElse?')
			return responseBuilder
				.speak(handlerInput.t('ANYTHING_ELSE_MSG'))
				.withShouldEndSession(false)
				.getResponse();
		}
	}
}

const InProgressFoundLostDogIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
			&& Alexa.getIntentName(handlerInput.requestEnvelope) === "FoundLostDogIntent"
			&& Alexa.getDialogState(handlerInput.requestEnvelope) === "IN_PROGRESS"
        )
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes();
		helper.setYNQuestion(handlerInput, null);

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

		if (sessionAttributes.FoundLostDogIntent.slots.foundLostDogInfo.value) {
			helper.setYNQuestion(handlerInput, 'submitDogTicket?')
			let desc = Alexa.getSlotValue(handlerInput.requestEnvelope, 'foundLostDogInfo');
			return responseBuilder
				.speak(handlerInput.t('REPEAT_DESC',{desc: `${desc}`}))
				.withShouldEndSession(false)
				.getResponse();
		}

        let speechOutput = 'If you see a loose dog in a busy area, its best not to try to catch them, as they may run into traffic. They will likely wander into a quieter area, or someones yard where they can be safely secured.'
		speechOutput += ' If you have already captured the dog, the best possible thing you can do for the dog is to keep them in your home and take a few days to try to find the owner before bringing them to a shelter.'
		speechOutput += ' 92 percent of loose dogs have an owner, but most dogs brought to shelters are not found by their owners. Dogs are 12 times more likely to be found if they stay in their neighborhood,' 
		speechOutput += ' especially if you can post their picture on craigslist, nextdoor, facebook lost and found pages, and walking them around the neighborhood.'
		speechOutput += ' For all our quick and easy tips to find a dogs owner, visit cityofsacramento.org.'
		speechOutput += ' Holding onto the dog while you locate the owner will also help save space in crowded animal shelters.'
		speechOutput += ' If you cannot hold onto the dog, try asking neighbors, friends, family, or doing a post on your social media. You would be amazed how many animal lovers are willing and able to be a hero to a lost dog in need.'
		speechOutput += ' If neither you or anyone you know can care for the dog for a few days, you can make an appointment to bring the dog to the shelter by.... You can also bring the dog to the shelter without an appointment' 
		speechOutput += ' between 12pm to 5pm seven days a week. However, there may be a long late time as we prioritize emergencies and citizens with existing appointments.'
		speechOutput += ' An appointment is highly recommended. Would you like to submit a service request to be reviewed by someone at City of Sacramento?'
		helper.setYNQuestion(handlerInput, 'LostDogServiceRequestCorrect?')

		return responseBuilder
            .speak(speechOutput)
            .withShouldEndSession(false)
            .getResponse();
        
    }
}

const yn_SubmitLostDogServiceRequestIntentHandler = {
	canHandle(handlerInput) {
		return ( 
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
			(Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.YesIntent" ||
				Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.NoIntent") &&
			handlerInput.attributesManager.getSessionAttributes().ynQuestionAsked === 'LostDogServiceRequestCorrect?'
		);
	},
	handle(handlerInput) {
		helper.setYNQuestion(handlerInput, null);
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

		if (Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
			return responseBuilder
				.speak(handlerInput.t('GENERAL_DESC'))
				.withShouldEndSession(false)
				.addElicitSlotDirective('foundLostDogInfo', sessionAttributes.FoundLostDogIntent)
				.getResponse();
		} 
		else {
			helper.setYNQuestion(handlerInput, 'AnythingElse?')
			return responseBuilder
				.speak(handlerInput.t('ANYTHING_ELSE_MSG'))
				.withShouldEndSession(false)
				.getResponse();
		}
	}
}

const yn_CompletedFoundLostDogServiceRequest = {
	canHandle(handlerInput) {
		return ( 
			Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
			(Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.YesIntent" ||
				Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.NoIntent") &&
            handlerInput.attributesManager.getSessionAttributes().ynQuestionAsked === 'submitDogTicket?'
		);
	},
	async handle(handlerInput) {
		helper.setYNQuestion(handlerInput, null);
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes();
		
        const token = await helper.getOAuthToken();
        const myCaseObj = new sfCase(token);
        var address = sessionAttributes.confirmedValidatorRes.Address;
        const userResponses = {
		    'GenericDescription': sessionAttributes.FoundLostDogIntent.slots.foundLostDogInfo.value
		}
		
		if (sessionAttributes.confirmedPhoneNumber && sessionAttributes.confirmedPhoneNumber !== 'FAILED') {
			var phoneNumber = sessionAttributes.confirmedPhoneNumber;
		} else {
			var phoneNumber = null;
		}

		const create_case_response = await helper.createGenericCase(handlerInput, myCaseObj, 'LostDog', userResponses, null, address, phoneNumber);
		const update_case_response = await helper.updateGenericCase(myCaseObj, 'LostDog', userResponses, create_case_response.case_id, address, phoneNumber);
        console.log(update_case_response);
        helper.setYNQuestion(handlerInput, 'AnythingElse?')
		return handlerInput.responseBuilder
		    .speak(handlerInput.t('GENERIC_CASE_THANKS'))
			.withShouldEndSession(false)
		    .getResponse();
	}
}

module.exports = {
	StartedFoundLostDogIntentHandler,
	yn_StartedFoundLostDogIntentHandler,
	InProgressFoundLostDogIntentHandler,
	yn_SubmitLostDogServiceRequestIntentHandler,
	yn_CompletedFoundLostDogServiceRequest
}