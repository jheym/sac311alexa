const Alexa = require("ask-sdk");
const helper = require("../helper/helperFunctions.js")

const GetPreviousCaseIntentHandler = {
	canHandle(handlerInput) {
		return (
			Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
			Alexa.getIntentName(handlerInput.requestEnvelope) === "GetPreviousCaseIntent"
		);
	},
	async handle(handlerInput) {
		const { responseBuilder, attributesManager } = handlerInput;
		const persistentAttributes = await attributesManager.getPersistentAttributes();
		const caseNumber = persistentAttributes.caseNumber;

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
		helper.setYNQuestion(handlerInput, 'AnythingElse?')
		
		const dateString = `<say-as interpret-as="date" format="mdy">${month}-${date}-${year}</say-as>`
		return responseBuilder
			.speak(`<speak>Sure, ${serviceNameMap[serviceName]} that was submitted on ${dateString}. The status of your case is ${caseStatusMap[caseStatus]}. Is there anything else I can help you with?</speak>`)
			.withShouldEndSession(false)
			.getResponse();
	}
}

// TODO: Add regex to match service name in Description field for generic cases
const serviceNameMap = {
	'Vehicle On Street': 'I found a case for an abandoned vehicle',
	'IVR Review' : 'I found a generic case'
}

const caseStatusMap = {
	'NEW': 'new, in other words, it is still waiting to be reviewed',
	'IN PROGRESS' : 'in progress, in other words, it has been reviewed and is being worked on',
	'CLOSED' : 'closed, in other words, it has been serviced and completed'
}

module.exports = { GetPreviousCaseIntentHandler };