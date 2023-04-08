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
		const { responseBuilder, requestEnvelope, attributesManager } = handlerInput;
		const sessionAttributes = attributesManager.getSessionAttributes();
		const { caseNumber } = sessionAttributes;
		let caseDetails;
		let caseDateISO;
		let caseStatus;
		let serviceName;


		if (caseNumber) {
			caseDetails = await helper.getCaseDetailsFromSalesForce(caseNumber); // Getting the case details from salesforce
			caseDateISO = caseDetails.createdDate;
			caseStatus = caseDetails.status;
			serviceName = caseDetails.subServiceType;

			// let caseDate = new Date(caseDateISO); 

		}

		if (caseDetails) {	
			return responseBuilder
				.speak(`Sure, I found a case for ${serviceName} that was submitted on ${caseDateISO}. It's status is currently ${caseStatus}.`)
				.getResponse();
		} else {
			return responseBuilder
			.speak(`I could not find a case.`)
			.getResponse();
		}
	},
}

module.exports = { GetPreviousCaseIntentHandler };