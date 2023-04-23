/*
 * Give the caller the same information that is heard in the 311 IVR call
 *
 * ask if they would like to send a service request to be reviewed by someone at city of sacramento
 * 
 * if yes, delegate to CreateGenericServiceRequestIntent
 * 
 * if no, ask if there is anything else we can help with
 */

/*
 * Information from call:
 *
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
const Alexa = require("ask-sdk-core")
const helper = require("./helper/helperFunctions.js")
const sfCase = require('./helper/SalesforceCaseObject.js')
const axios = require("axios")
const iso8601 = require('iso8601-duration');

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
		const currentIntent = requestEnvelope.request.intent;
		sessionAttributes.intentToRestore = 'FoundLostDogIntent';
		attributesManager.setSessionAttributes(sessionAttributes);

        if (await helper.isHomeAddressAvailable(handlerInput)) {
			const { addressLine1 } = await helper.getHomeAddress(handlerInput);
			if (addressLine1.length > 0) {
				const token = await helper.getOAuthToken(handlerInput);
				const myCaseObj = new sfCase(token);
				var validatorObj = await myCaseObj.address_case_validator(addressLine1);
			}
		}
		var speechOutput = '';
		if (validatorObj && validatorObj.Within_City === true) {
			let speechOutput = `We found a city address associated with your Amazon account. Is this where the dog was found?`;
			return responseBuilder
				.speak(speechOutput)
				.withShouldEndSession(false)
				.getResponse();
		} else {
			let speechOutput = `Can you tell me where the dog was found? I can check any address within the city of Sacramento. What address should I check?`
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

 const InProgressFoundLostDogIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
			&& Alexa.getIntentName(handlerInput.requestEnvelope) === "FoundLostDogIntent"
			&& Alexa.getDialogState(handlerInput.requestEnvelope) === "IN_PROGRESS"
			&& !(handlerInput.attributesManager.getSessionAttributes().questionAsked === 'FLDGettingInfo')
        )
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
		const currentIntent = requestEnvelope.request.intent;
		const sessionAttributes = attributesManager.getSessionAttributes();
		const dialogState = Alexa.getDialogState(requestEnvelope);
		const intentConfirmationStatus = currentIntent.confirmationStatus;
		
		const address = sessionAttributes.confirmedValidatorRes;
		const worldAddressCandidate = await helper.getWorldAddress(address.Address); // TODO: Redundant. Address was already collected in addressCollectionFlow and stored in SessionAttributes.
		const internalRes = await helper.getInternalAddress(worldAddressCandidate.data.candidates[0]); // Address was already checked in addressCollectionFlow.
		console.log("Address within city:");
		console.log(address.Within_City);

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

		var speechOutput = '';
        if(address.Within_City) // TODO: We are still supposed to submit a case even if the address is not within the city.
        {
            speechOutput = 'If you see a loose dog in a busy area, its best not to try to catch them, as they may run into traffic. They will likely wander into a quieter area, or someones yard where they can be safely secured.'
			speechOutput += ' If you have already captured the dog, the best possible thing you can do for the dog is to keep them in your home and take a few days to try to find the owner before bringing them to a shelter.'
			speechOutput += ' 92 percent of loose dogs have an owner, but most dogs brought to shelters are not found by their owners. Dogs are 12 times more likely to be found if they stay in their neighborhood,' 
			speechOutput += ' especially if you can post their picture on craigslist, nextdoor, facebook lost and found pages, and walking them around the neighborhood.'
			speechOutput += ' For all our quick and easy tips to find a dogs owner, visit cityofsacramento.org.'
			speechOutput += ' Holding onto the dog while you locate the owner will also help save space in crowded animal shelters.'
			speechOutput += ' If you cannot hold onto the dog, try asking neighbors, friends, family, or doing a post on your social media. You would be amazed how many animal lovers are willing and able to be a hero to a lost dog in need.'
			speechOutput += ' If neither you or anyone you know can care for the dog for a few days, you can make an appointment to bring the dog to the shelter by.... You can also bring the dog to the shelter without an appointment' 
			speechOutput += ' between 12pm to 5pm seven days a week. However, there may be a long late time as we prioritize emergencies and citizens with existing appointments.'
			speechOutput += ' An appointment is highly recommended. Would you like to submit a service request to be reviewed by someone at City of Sacramento?'
			helper.setQuestion(handlerInput, 'LostDogServiceRequestCorrect?')
        }
        else
        {
            speechOutput = 'Unfortunately I do not recognize that address as being within city limits. Here are some helpful suggestions.'
			speechOutput += ' If you see a loose dog in a busy area, its best not to try to catch them, as they may run into traffic. They will likely wander into a quieter area, or someones yard where they can be safely secured.'
			speechOutput += ' If you have already captured the dog, the best possible thing you can do for the dog is to keep them in your home and take a few days to try to find the owner before bringing them to a shelter.'
			speechOutput += ' 92 percent of loose dogs have an owner, but most dogs brought to shelters are not found by their owners. Dogs are 12 times more likely to be found if they stay in their neighborhood,' 
			speechOutput += ' especially if you can post their picture on craigslist, nextdoor, facebook lost and found pages, and walking them around the neighborhood.'
			speechOutput += ' For all our quick and easy tips to find a dogs owner, visit cityofsacramento.org.'
			speechOutput += ' Holding onto the dog while you locate the owner will also help save space in crowded animal shelters.'
			speechOutput += ' If you cannot hold onto the dog, try asking neighbors, friends, family, or doing a post on your social media. You would be amazed how many animal lovers are willing and able to be a hero to a lost dog in need.'
			speechOutput += ' Is there anything else I can help you with?'
			helper.setQuestion(handlerInput, 'AnythingElse?')    
        }
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
			handlerInput.attributesManager.getSessionAttributes().questionAsked === 'LostDogServiceRequestCorrect?'
		);
	},
	handle(handlerInput) {
		helper.setQuestion(handlerInput, null)
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
		const currentIntent = requestEnvelope.request.intent;
		//const slots = currentIntent.slots;

		if(Alexa.getIntentName(requestEnvelope) === "AMAZON.YesIntent") {
			let speechOutput = 'Can you give me a general description of your case.';
			helper.setQuestion(handlerInput, 'FLDGettingInfo')
			return responseBuilder
				.speak(speechOutput)
				.withShouldEndSession(false)
				.addElicitSlotDirective('foundLostDogInfo', sessionAttributes.FoundLostDogIntent)
				.getResponse();
		} else {
			let speechOutput = 'Is there anything else I can help you with today?';
			helper.setQuestion(handlerInput, 'AnythingElse?')
			return responseBuilder
				.speak(speechOutput)
				.withShouldEndSession(false)
				.getResponse();
		}
	}
}

const CompletedFoundLostDogServiceRequest = {
	canHandle(handlerInput) {
		return ( 
			Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
			Alexa.getIntentName(handlerInput.requestEnvelope) === 'FoundLostDogIntent' &&
            handlerInput.attributesManager.getSessionAttributes().questionAsked === 'FLDGettingInfo'
		);
	},
	async handle(handlerInput) {
		helper.setQuestion(handlerInput, null)
		const { requestEnvelope, responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes();
		
		//TODO: Read back the description to the user and confirm if that's what they would like to submit before submitting the case.
		
		// let phoneNumber = '9169166969' //Need to get phone number
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
		console.log(userResponses);
		const update_case_response = await helper.updateGenericCase(myCaseObj, 'LostDog', userResponses, create_case_response.case_id, address, phoneNumber);
        console.log(update_case_response);
        helper.setQuestion(handlerInput, 'AnythingElse?')
		let speechOutput = 'Thank you for submitting the service request. Is there anything else I can help you with?';
		return handlerInput.responseBuilder
		    .speak(speechOutput)
			.withShouldEndSession(false)
		    .getResponse();
	}

}
module.exports = {
	StartedFoundLostDogIntentHandler,
	InProgressFoundLostDogIntentHandler,
	yn_SubmitLostDogServiceRequestIntentHandler,
	CompletedFoundLostDogServiceRequest
}