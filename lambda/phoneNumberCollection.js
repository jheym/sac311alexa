const Alexa = require('ask-sdk-core');
const helper = require('./helper/helperFunctions.js');


//Create a GetPhoneNumberIntentHandler that will call the getPhoneNumber function and return the phone number to the user if they have given permission to access their phone
//number. Ask them to verify it if no then ask them for a phone number. if they don't have permission to access their phone number ask them for one and save it in the session attribute called phone.
//Utillize the getPhoneNumber function to retrieve the phone number and save it in the session attribute called confirmedPhoneNumber.
const GetPhoneNumberIntentHandler = {
	canHandle(handlerInput) {
		return (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
			&& Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetPhoneNumberIntent'
		);
	},
	async handle(handlerInput) {
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const userGivenPhoneNumberSlot = requestEnvelope.request.intent.slots.userGivenPhoneNumber;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

		// If the user gave a phone number and confirmed it, store it in SA and delegate back to the original intent
		if (userGivenPhoneNumberSlot.value && userGivenPhoneNumberSlot.confirmationStatus === 'CONFIRMED' ) {
			sessionAttributes.confirmedPhoneNumber = userGivenPhoneNumberSlot.value;
			handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
			const updatedIntent = helper.skipAutodelegation(handlerInput, sessionAttributes.intentToRestore);
			return responseBuilder
				.addDelegateDirective(updatedIntent)
				.getResponse()
		}

		// If the user gave a phone number and said it was incorrect, ask them for a new one
		if (userGivenPhoneNumberSlot.value && userGivenPhoneNumberSlot.confirmationStatus === 'DENIED' ) {
			
			// If the user denied the phone number 3 times, continue back to the original intent without a phone number
			if (helper.getFailCounter(handlerInput) >= 2) {
				helper.clearFailCounter(handlerInput);
				sessionAttributes.confirmedPhoneNumber = 'FAILED'
				const updatedIntent = helper.skipAutodelegation(handlerInput, sessionAttributes.intentToRestore);
				helper.sendProgressiveResponse(handlerInput, `I'm sorry, I'm having trouble understanding your phone number. We can continue without it. <break time="1s"/>`)
				return responseBuilder
					.addDelegateDirective(updatedIntent)
					.getResponse();
			}
			
			// Elicit the phone number again
			helper.incFailCounter(handlerInput);
			const GetPhoneNumberIntent = {
				name: 'GetPhoneNumberIntent',
				confirmationStatus: 'NONE',
				slots: {
					userGivenPhoneNumber: {
						name: 'userGivenPhoneNumber',
						value: null,
						confirmationStatus: 'NONE',
			}}}

			return responseBuilder
			.speak(`Please say your phone number including the area code.`)
			.addElicitSlotDirective('userGivenPhoneNumber', GetPhoneNumberIntent)
			.getResponse();
		}

		// If the user gave a phone number and didn't confirm it, ask them to confirm it
		if (userGivenPhoneNumberSlot.value && userGivenPhoneNumberSlot.confirmationStatus === 'NONE' ) {
			const GetPhoneNumberIntent = {
				name: 'GetPhoneNumberIntent',
				confirmationStatus: 'NONE',
				slots: {
					userGivenPhoneNumber: {
						name: 'userGivenPhoneNumber',
						value: userGivenPhoneNumberSlot.value,
						confirmationStatus: 'NONE',
			}}}
			const phoneNumberString = `<say-as interpret-as="telephone">${userGivenPhoneNumberSlot.value}</say-as>`
			return responseBuilder
			.speak(`<speak>You said your phone number is ${phoneNumberString}. Is that correct?</speak>`)
			.addConfirmSlotDirective('userGivenPhoneNumber', GetPhoneNumberIntent)
			.getResponse();
		}

		// If the user has not given a phone number and has not been asked to
		// use their Alexa device's phone number, check if there is a phone
		// number available. If so, ask if they want to use it. If not, ask them
		// for their phone number.
		if (!userGivenPhoneNumberSlot.value && !sessionAttributes.devicePhoneNumber) {
			// If there is no phone number available from Alexa API
			if (!(await helper.isPhoneNumberAvailable(handlerInput))) { //TODO: Why am I getting 204 on my phone number?
				return responseBuilder
				.speak(`Please say your phone number, including the area code.`)
				.addElicitSlotDirective('userGivenPhoneNumber')
				.getResponse();
			}

			// Ask if the user wants to use the phone number from their Alexa device
			const devicePhoneNumber = await helper.getPhoneNumber(handlerInput);
			sessionAttributes.devicePhoneNumber = devicePhoneNumber;
			handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
			const updatedIntent = {
				name: 'GetPhoneNumberIntent',
				confirmationStatus: 'NONE',
				slots: {
					userGivenPhoneNumber: {
						name: 'userGivenPhoneNumber',
						value: devicePhoneNumber,
						confirmationStatus: 'NONE',
			}}}

			const phoneNumberString = `<say-as interpret-as="telephone">${devicePhoneNumber}</say-as>`
			return responseBuilder
			.speak(`<speak>I found a phone number associated with your Amazon account. The number is ${phoneNumberString}. Would you like to use this number for your service request?</speak>`)
			.addConfirmSlotDirective('userGivenPhoneNumber', updatedIntent)
			.getResponse();
		}
	} // handle()
};


module.exports = { GetPhoneNumberIntentHandler };

