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
		let caseMonthValue;
		let caseMonthISO;
		//let caseYearISO;			//Can add this if needed

		//FIXME: Work in progress. Meet with Ronald to go over what needs to be done.

		if (caseNumber) {
			caseDetails = await helper.getCaseDetailsFromSalesForce(caseNumber); // Getting the case details from salesforce
			caseDateISO = caseDetails.createdDate;
			caseStatus = caseDetails.status;
			serviceName = caseDetails.subServiceType;

			//TC

			const serviceNameMap = new Map();
			serviceNameMap.set('Vehicle On Street', 'an abandoned vehicle');
			//can add more service names here as needed same with caseStatusMap below

			serviceName = serviceNameMap.get(serviceName);

			const caseStatusMap = new Map();
			caseStatusMap.set('NEW', 'The case status is still waiting to be assigned');

			caseStatus = caseStatusMap.get(caseStatus);

			let caseDate = new Date(caseDateISO);
			caseDateISO = caseDate.getDate();

			const monthNames = ["January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"];

			caseMonthValue = caseDate.getMonth(); //0-11, 0 is January
			caseMonthISO = monthNames[caseMonthValue];

			//caseYearISO = caseDate.getFullYear();			//Can add this if needed


			//End TC
		}
		helper.setQuestion(handlerInput, 'AnythingElse?')
		if (caseDetails) {	
			const date = `<say-as interpret-as="date" format="md">${caseMonthISO} ${caseDateISO}</say-as>`;

			const speechOutput = `<speak>Sure, you submitted a service request for ${serviceName} that was submitted on ${date}. ${caseStatus}. Is there anything else I can help you with?</speak>`

			return responseBuilder
				// Using SSML with <say-as> element
				.speak(speechOutput)
				// .speak(ssml) // Using SSML with <say-as> element
				// .speak(`Its status is currently ${caseStatus}. Is there anything else I can help you with?`)
				//.speak(`Sure, I found a case for ${serviceName} that was submitted on ${caseDateISO}. It's status is currently ${caseStatus}. Is there anything else I can help you with?`)
				.withShouldEndSession(false)
				.getResponse();
		} else {
			return responseBuilder
			.speak(`I'm sorry. I could not find a case for you. Is there anything else I can help you with?`)
			.withShouldEndSession(false)
			.getResponse();
		}
	},
}

module.exports = { GetPreviousCaseIntentHandler };