const Alexa = require("ask-sdk-core");
const helper = require("../helper/helperFunctions.js");
const sfCase = require("../helper/SalesforceCaseObject.js");


// This is the generic service request intent handler triggered by the fallback intent

const GenericServiceRequestIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === "GenericServiceRequestIntent"
        )
    },
    async handle(handlerInput) {
        let { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.intentToRestore = 'GenericServiceRequestIntent';
        let slots = requestEnvelope.request.intent.slots;

        if (!slots.genericServiceDescription.value) {
            const speechOutput = `If you'd like, \
			I can collect a description of your issue and submit it to the \
			city to be reviewed by a service agent later. Would you like to \
			submit a generic case? You can say yes or no.`;
            helper.setYNQuestion(handlerInput, 'SubmitGenericServiceRequest?');
            return responseBuilder
                .speak(speechOutput)
                .withShouldEndSession(false)
                .getResponse();
        }

        if (slots.genericServiceDescription.confirmationStatus === 'NONE') {
            // Ask for confirmation
            const speechOutput = `Here is the description you provided: ${slots.genericServiceDescription.value}. Would you like to submit this description? You can say yes or no.`;
            const repromptOutput = `Would you like to submit your description? You can say yes or no.`
            return responseBuilder
                .speak(speechOutput)
                .reprompt(repromptOutput)
                .addConfirmSlotDirective('genericServiceDescription')
                .getResponse();
        }

        if (slots.genericServiceDescription.confirmationStatus === 'DENIED') {
            // Reprompt for description
            // Set a counter to limit the number of times the user can be reprompted
            
            if (helper.getFailCounter(handlerInput) > 2) {
                helper.clearFailCounter(handlerInput);
                const speechOutput = `I'm sorry we are unable to submit your service request. If you need to submit a service request you can always call \
                3-1-1 or visit the city's website at 311.cityofsacramento.org. Is there anything else I can help you with?`;
                helper.setYNQuestion(handlerInput, 'AnythingElse?');
                return responseBuilder
                    .speak(speechOutput)
                    .withShouldEndSession(false)
                    .getResponse();
            }

            helper.incFailCounter(handlerInput);
            const speechOutput = `Okay, let's try again. Please provide a description of the service you need.`;
            return responseBuilder
                .speak(speechOutput)
                .addElicitSlotDirective('genericServiceDescription')
                .getResponse();
        }

        if (slots.genericServiceDescription.confirmationStatus === 'CONFIRMED' && !sessionAttributes.confirmedValidatorRes) {
            
            if (helper.isGeolocationAvailable(handlerInput) === "supported") {
				helper.setYNQuestion(handlerInput, 'UseGeolocation?')
				let speechOutput = `It helps if I have a location for your service request. Would you like to use your current location to submit your service request?`;
                return responseBuilder
					.speak(speechOutput)
					.withShouldEndSession(false)
					.getResponse();
			} else if (await helper.isHomeAddressAvailable(handlerInput)) {
                const { addressLine1 } = await helper.getHomeAddress(handlerInput);
                if (addressLine1.length > 0) {
                    const addressString = `<say-as interpret-as="address">${addressLine1}</say-as>`
                    let speechOutput = `<speak>It helps if I have a location for your service request. We found a home address associated with your account at ${addressString}, do you want to use it for your service request?</speak>`;
                    helper.setYNQuestion(handlerInput, 'UseHomeAddress?')
                    return responseBuilder
                        .speak(speechOutput)
                        .withShouldEndSession(false)
                        .getResponse();
                }
            }

            let speechOutput = `Please provide a location for your service request. You can give an address or nearest cross street.`
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

        if (slots.genericServiceDescription.confirmationStatus === 'CONFIRMED' && !sessionAttributes.confirmedPhoneNumber) {
            const getPhoneNumberIntent = {
                name: 'GetPhoneNumberIntent',
                confirmationStatus: 'NONE',
                slots: {
                    userGivenPhoneNumber: {
                        name: 'userGivenPhoneNumber',
                        confirmationStatus: 'NONE',
                        value: null
            }}}
    
            return responseBuilder
                .addDelegateDirective(getPhoneNumberIntent)
                .getResponse();
        }
        
        
        if (slots.genericServiceDescription.confirmationStatus === 'CONFIRMED' && sessionAttributes.confirmedPhoneNumber &&
            sessionAttributes.confirmedValidatorRes) 
        {
            console.log('Creating generic case')
			const userResponses = {
				'genericServiceDescription': slots.genericServiceDescription.value
			}
            const token = await helper.getOAuthToken();
			const myCaseObj = new sfCase(token);
			const address = sessionAttributes.confirmedValidatorRes.Address || null;
            const phoneNumber = sessionAttributes.confirmedPhoneNumber || null;
			const create_case_res = await helper.createGenericCase(handlerInput, myCaseObj, 'unknown', userResponses, address, phoneNumber);
			await helper.updateGenericCase(myCaseObj, 'unknown', userResponses, create_case_res.case_id, address, phoneNumber);
            const speechOutput = `Thank you for submitting your service request. You can always call 3-1-1 or visit the city's website at 3-1-1.cityofsacramento.org. Is there anything else I can help you with?`;
            helper.setYNQuestion(handlerInput, 'AnythingElse?');
            console.log(`Case submitted. Case Number: ${create_case_res.case_number}`);
            return responseBuilder
                .speak(speechOutput)
                .withShouldEndSession(false)
                .getResponse();
        }

        throw new Error('GenericServiceRequestIntentHandler: Unhandled case');

    }
}

module.exports = { GenericServiceRequestIntentHandler }