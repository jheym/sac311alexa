const Alexa = require("ask-sdk");
const helper = require("./helper/helperFunctions.js")
// TODO: Notes for Ronald
// Convert caseDateISO to a month and day (e.g. "May 1st")
// Create a map for serviceName to a more human-readable name (e.g. "I found a case for abandoned vehicle' instead of 'I found a case for Vehicle On Street")
// Create a map for caseStatus to a more human-readable value (e.g. "It's status is still waiting to be assigned" instead of "It's status is currently NEW")
// Use both maps in the code below to replace the original values with the human-readable values in the speech output.

const GetPreviousCaseIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
			Alexa.getIntentName(handlerInput.requestEnvelope) === "GetPreviousCaseIntent"
		);
	},
	async handle(handlerInput) {
		const { responseBuilder, attributesManager } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes();
		const { caseNumber } = sessionAttributes;

		if (!caseNumber) {
			return responseBuilder
				.speak(`Hmm, I'm sorry, I could not find a case for you. If you've submitted a case before, it's possible it was submitted with a different Amazon account or profile. Is there anything else I can help you with?`)
				.withShouldEndSession(false)
				.getResponse();
		}

		let caseDetails;

		if (!(caseDetails = await helper.getCaseDetailsFromSalesForce(caseNumber))) {
			return responseBuilder
				.speak(`Hmm, I'm sorry, I could not find a case for you. If you've submitted a case before, it's possible it was submitted with a different Amazon account or profile. Is there anything else I can help you with?`)
				.withShouldEndSession(false)
				.getResponse();
		}

		const caseDateISO = caseDetails.createdDate;
		const caseStatus = caseDetails.status;
		const serviceName = caseDetails.subServiceType;

		let dateObj = new Date(caseDateISO);
		let date = dateObj.getDate();
		let month = dateObj.getMonth() + 1;
		let year = dateObj.getFullYear();
		helper.setQuestion(handlerInput, 'AnythingElse?')
		
		const dateString = `<say-as interpret-as="date" format="mdy">${month}-${date}-${year}</say-as>`
		return responseBuilder
			.speak(`<speak>Sure, I found a case for ${serviceNameMap[serviceName]} that was submitted on ${dateString}. The status of your case is ${caseStatusMap[caseStatus]}. Is there anything else I can help you with?</speak>`)
			.withShouldEndSession(false)
			.getResponse();
	}
}


const serviceNameMap = {
	'Vehicle On Street': 'an abandoned vehicle'
}

const caseStatusMap = {
	'NEW': 'new, in other words, it is still waiting to be assigned',
	'IN PROGRESS' : 'in progress, in other words, it is currently being serviced',
	'CLOSED' : 'complete, in other words, it has been serviced and completed'
}

module.exports = { GetPreviousCaseIntentHandler };